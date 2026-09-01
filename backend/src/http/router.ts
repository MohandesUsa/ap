import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  /** Populated by the auth middleware once a valid access token is verified; undefined for
   *  public routes or when no/invalid token was supplied. */
  userId?: string;
  role?: 'owner' | 'driver';
  /** Populated by requireAdminAuth (a SEPARATE middleware, verified with a separate JWT secret —
   *  see admin.middleware.ts) — never set on the same request as userId/role above. */
  adminId?: string;
  adminRole?: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'ACCOUNTANT';
}

export type Handler = (ctx: RequestContext) => Promise<void>;
export type Middleware = (ctx: RequestContext, next: () => Promise<void>) => Promise<void>;

interface Route {
  method: string;
  segments: string[]; // e.g. ['trucks', ':id'] for /trucks/:id
  handler: Handler;
  middlewares: Middleware[];
}

/**
 * Deliberately simple path matcher (static segments + `:param` segments, no wildcards/regex) —
 * everything this API needs (see the route tables in each module) fits that shape, and keeping
 * it simple keeps it something a reviewer can read end-to-end in a minute.
 */
export class Router {
  private readonly routes: Route[] = [];

  add(method: string, path: string, handler: Handler, middlewares: Middleware[] = []): void {
    const segments = path.split('/').filter(Boolean);
    this.routes.push({ method: method.toUpperCase(), segments, handler, middlewares });
  }

  get(path: string, handler: Handler, middlewares: Middleware[] = []) { this.add('GET', path, handler, middlewares); }
  post(path: string, handler: Handler, middlewares: Middleware[] = []) { this.add('POST', path, handler, middlewares); }
  put(path: string, handler: Handler, middlewares: Middleware[] = []) { this.add('PUT', path, handler, middlewares); }
  delete(path: string, handler: Handler, middlewares: Middleware[] = []) { this.add('DELETE', path, handler, middlewares); }

  match(method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
    const requestSegments = pathname.split('/').filter(Boolean);

    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      if (route.segments.length !== requestSegments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;

      for (let i = 0; i < route.segments.length; i++) {
        const routeSeg = route.segments[i];
        const reqSeg = requestSegments[i];
        if (routeSeg.startsWith(':')) {
          params[routeSeg.slice(1)] = decodeURIComponent(reqSeg);
        } else if (routeSeg !== reqSeg) {
          matched = false;
          break;
        }
      }

      if (matched) return { route, params };
    }
    return null;
  }
}
