import type { Middleware } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import { verifyJwt } from '../../security/jwt.ts';
import { AppError } from '../../errors/AppError.ts';
import { AdminRepository } from './admin.repository.ts';
import { ROLE_DEFAULT_PERMISSIONS, type AdminRole, type Permission } from './permissions.ts';

/**
 * Verifies an admin access token — signed with `config.adminJwtSecret`, a DIFFERENT secret than
 * `config.jwtSecret` (Owner/Driver tokens). This is what makes "Normal User → Admin API ❌" (spec
 * Phase 29) true by construction: a user token's signature simply does not verify against the
 * admin secret, so it's rejected here before any role/permission check even runs — there is no
 * code path where a role string alone decides admin access.
 */
export function requireAdminAuth(adminJwtSecret: string): Middleware {
  return async (ctx, next) => {
    const header = ctx.req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized('توکن دسترسی ارسال نشده است.');
    }
    const token = header.slice('Bearer '.length);
    const result = verifyJwt(token, adminJwtSecret);
    if (!result.valid) {
      throw AppError.unauthorized(
        result.reason === 'expired' ? 'توکن دسترسی منقضی شده است.' : 'توکن دسترسی نامعتبر است.',
      );
    }
    ctx.adminId = result.payload.sub;
    ctx.adminRole = result.payload.role as AdminRole;
    await next();
  };
}

/**
 * The actual authorization check every admin route must use — never a bare role comparison.
 * Effective permissions = the calling admin's role defaults UNION any custom grants in
 * admin_permissions (Phase 21: "Assign Permissions" is additive, on top of "Assign Role").
 * Also re-checks the admin is still active on every call — a disabled admin's still-valid,
 * unexpired token stops working immediately rather than at its natural expiry.
 */
export function requirePermission(db: DbClient, permission: Permission): Middleware {
  return async (ctx, next) => {
    if (!ctx.adminId || !ctx.adminRole) throw AppError.unauthorized();

    const repo = new AdminRepository(db);
    const admin = await repo.findById(ctx.adminId);
    if (!admin || !admin.is_active) throw AppError.forbidden('این حساب ادمین غیرفعال شده است.');

    const roleDefaults = ROLE_DEFAULT_PERMISSIONS[admin.role] ?? [];
    if (roleDefaults.includes(permission)) return next();

    const customGrants = await repo.getCustomPermissions(ctx.adminId);
    if (customGrants.includes(permission)) return next();

    throw AppError.forbidden(`دسترسی «${permission}» برای این حساب فعال نیست.`);
  };
}
