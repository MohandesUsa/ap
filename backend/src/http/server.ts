import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Router, RequestContext } from './router.ts';
import { sendError } from './respond.ts';
import { AppError } from '../errors/AppError.ts';

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(undefined);
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (raw.trim().length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(AppError.badRequest('بدنهٔ درخواست JSON معتبر نیست.'));
      }
    });
    req.on('error', reject);
  });
}

/** Simple in-memory sliding-window rate limiter — Phase 3 §40 asks for rate limiting; a proper
 *  production deployment would use Redis so limits are shared across multiple backend instances,
 *  but for a single-instance Phase 3 backend an in-memory map is a correct and honest starting
 *  point (documented here rather than silently pretending it scales horizontally). */
class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return timestamps.length <= this.maxRequests;
  }
}

export function createApp(router: Router, rateLimitConfig: { maxRequests: number; windowMs: number }) {
  const authRateLimiter = new RateLimiter(rateLimitConfig.maxRequests, rateLimitConfig.windowMs);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS — permissive for API-only, token-authenticated traffic (no cookies involved, so this
    // does not carry the same risk permissive CORS has for cookie-authenticated APIs).
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Secure headers — §40
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', 'http://internal');

    if (url.pathname.startsWith('/auth/')) {
      const ip = req.socket.remoteAddress ?? 'unknown';
      if (!authRateLimiter.check(ip)) {
        sendError(res, AppError.tooManyRequests());
        return;
      }
    }

    try {
      const matched = router.match(req.method ?? 'GET', url.pathname);
      if (!matched) {
        sendError(res, AppError.notFound('این مسیر وجود ندارد.'));
        return;
      }

      const body = req.method === 'GET' || req.method === 'DELETE' ? undefined : await readBody(req);

      const ctx: RequestContext = {
        req,
        res,
        params: matched.params,
        query: url.searchParams,
        body,
      };

      const chain = [...matched.route.middlewares, async () => matched.route.handler(ctx)];
      let index = -1;
      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) throw new Error('next() called multiple times');
        index = i;
        const fn = chain[i];
        if (!fn) return;
        if (i === chain.length - 1) {
          await (fn as () => Promise<void>)();
        } else {
          await (fn as (ctx: RequestContext, next: () => Promise<void>) => Promise<void>)(ctx, () => dispatch(i + 1));
        }
      };
      await dispatch(0);
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err);
      } else {
        // Never leak internal error details to the client — log server-side, return a generic 500.
        console.error('Unhandled error:', err);
        sendError(res, AppError.internal());
      }
    }
  });

  return server;
}
