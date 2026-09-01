import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { AdminRepository } from './admin.repository.ts';
import { requireAdminAuth } from './admin.middleware.ts';
import { ROLE_DEFAULT_PERMISSIONS } from './permissions.ts';
import { verifyPassword } from '../../security/password.ts';
import { signJwt } from '../../security/jwt.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePhone } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

/**
 * Deliberately no self-registration endpoint here — the spec is explicit that Admin App does not
 * use the normal user login, and an open "create an admin" API would be a standing vulnerability.
 * The first SUPER_ADMIN is created via `scripts/create-admin.ts` (server-side, operator-run);
 * every admin after that is created through POST /admin/admins by an existing SUPER_ADMIN (see
 * admin-management.routes.ts).
 */
export function registerAdminAuthRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const admins = new AdminRepository(db);
  const auth = requireAdminAuth(config.adminJwtSecret);

  router.post('/admin/auth/login', async (ctx) => {
    const body = requireFields(ctx.body, ['phoneNumber', 'password']);
    const phoneNumber = String(body.phoneNumber);
    validatePhone(phoneNumber);

    const admin = await admins.findByPhone(phoneNumber);
    // Same enumeration-resistance principle as the user login (auth.service.ts): identical error
    // whether the phone doesn't exist or the password is wrong.
    const invalidCredentials = AppError.badRequest('شماره موبایل یا رمز عبور اشتباه است.');
    if (!admin) throw invalidCredentials;
    if (!admin.is_active) throw AppError.forbidden('این حساب ادمین غیرفعال شده است.');

    const ok = await verifyPassword(String(body.password), admin.password_hash);
    if (!ok) throw invalidCredentials;

    const accessToken = signJwt({ sub: admin.id, role: admin.role }, config.adminJwtSecret, config.adminAccessTokenTtlSeconds);
    await recordAudit(db, { userId: null, adminId: admin.id, action: 'ADMIN_LOGIN', entityType: 'admin', entityId: admin.id });

    sendSuccess(ctx.res, {
      accessToken,
      expiresInSeconds: config.adminAccessTokenTtlSeconds,
      admin: { id: admin.id, fullName: admin.full_name, phoneNumber: admin.phone_number, role: admin.role },
    });
  });

  router.get('/admin/auth/me', async (ctx) => {
    const admin = await admins.findById(ctx.adminId!);
    if (!admin) throw AppError.notFound();
    const customGrants = await admins.getCustomPermissions(admin.id);
    const permissions = Array.from(new Set([...ROLE_DEFAULT_PERMISSIONS[admin.role], ...customGrants]));
    sendSuccess(ctx.res, {
      id: admin.id, fullName: admin.full_name, phoneNumber: admin.phone_number, role: admin.role, permissions,
    });
  }, [auth]);

  router.post('/admin/auth/logout', async (ctx) => {
    // Admin sessions are short-lived access tokens only (no refresh rotation — see README's
    // Known Limitations); logout is client-side (discard the token) plus an audit trail entry.
    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_LOGOUT', entityType: 'admin', entityId: ctx.adminId! });
    sendSuccess(ctx.res, { success: true });
  }, [auth]);
}
