import type { Middleware } from './router.ts';
import { verifyJwt } from '../security/jwt.ts';
import { AppError } from '../errors/AppError.ts';

/**
 * Verifies the `Authorization: Bearer <token>` access token and populates ctx.userId/ctx.role.
 * This is the ONLY place role is trusted from a token — every route that needs the current
 * user's role reads ctx.role, which came from a server-signed JWT, never from a request body
 * field the client could set arbitrarily (Phase 3 §10: "کاربر نباید بتواند... Role خودش را
 * تغییر دهد").
 */
export function requireAuth(jwtSecret: string): Middleware {
  return async (ctx, next) => {
    const header = ctx.req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized('توکن دسترسی ارسال نشده است.');
    }
    const token = header.slice('Bearer '.length);
    const result = verifyJwt(token, jwtSecret);
    if (!result.valid) {
      throw AppError.unauthorized(
        result.reason === 'expired' ? 'توکن دسترسی منقضی شده است.' : 'توکن دسترسی نامعتبر است.',
      );
    }
    ctx.userId = result.payload.sub;
    ctx.role = result.payload.role;
    await next();
  };
}

/** Composes with requireAuth: rejects the request if the authenticated user's role doesn't
 *  match. Always placed AFTER requireAuth in a route's middleware list. */
export function requireRole(role: 'owner' | 'driver'): Middleware {
  return async (ctx, next) => {
    if (ctx.role !== role) {
      throw AppError.forbidden(`این بخش فقط برای ${role === 'owner' ? 'صاحب کامیون' : 'راننده'} در دسترس است.`);
    }
    await next();
  };
}
