import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { AdminRepository, type AdminRow } from './admin.repository.ts';
import { requireAdminAuth, requirePermission } from './admin.middleware.ts';
import { isPermission, type AdminRole } from './permissions.ts';
import { hashPassword } from '../../security/password.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePhone } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

const VALID_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'ACCOUNTANT'];

function toResponse(a: AdminRow) {
  return { id: a.id, phoneNumber: a.phone_number, fullName: a.full_name, role: a.role, isActive: a.is_active === 1, createdAt: a.created_at };
}

/** Phase 21: exclusively SUPER_ADMIN. Every route here is gated by ADMIN_MANAGEMENT, which — per
 *  permissions.ts's ROLE_DEFAULT_PERMISSIONS — only SUPER_ADMIN has by default; nothing stops a
 *  SUPER_ADMIN from custom-granting it to someone else via admin_permissions, which is an
 *  intentional escape hatch (Phase 21 itself), not a bug. */
export function registerAdminManagementRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const admins = new AdminRepository(db);
  const auth = requireAdminAuth(config.adminJwtSecret);
  const manage = requirePermission(db, 'ADMIN_MANAGEMENT');

  router.get('/admin/admins', async (ctx) => {
    sendSuccess(ctx.res, { admins: (await admins.list()).map(toResponse) });
  }, [auth, manage]);

  router.post('/admin/admins', async (ctx) => {
    const body = requireFields(ctx.body, ['phoneNumber', 'password', 'fullName', 'role']);
    const phoneNumber = String(body.phoneNumber);
    validatePhone(phoneNumber);
    if (!VALID_ROLES.includes(body.role as AdminRole)) throw AppError.validation('role نامعتبر است.', { field: 'role' });

    if (await admins.findByPhone(phoneNumber)) {
      throw AppError.conflict('ادمینی با این شماره موبایل از قبل وجود دارد.', { field: 'phoneNumber' });
    }
    const passwordHash = await hashPassword(String(body.password));
    const admin = await admins.create({ phoneNumber, passwordHash, fullName: String(body.fullName), role: body.role as AdminRole });

    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_CREATE_ADMIN', entityType: 'admin', entityId: admin.id, newValue: toResponse(admin) });
    sendSuccess(ctx.res, toResponse(admin), 201);
  }, [auth, manage]);

  router.put('/admin/admins/:id', async (ctx) => {
    const before = await admins.findById(ctx.params.id);
    if (!before) throw AppError.notFound('ادمین یافت نشد.');
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    if (body.role !== undefined && !VALID_ROLES.includes(body.role as AdminRole)) {
      throw AppError.validation('role نامعتبر است.', { field: 'role' });
    }
    // A SUPER_ADMIN can disable any OTHER admin, but never their own last standing account —
    // avoids a self-lockout with nobody left to re-enable the system.
    if (ctx.params.id === ctx.adminId && body.isActive === false) {
      throw AppError.badRequest('نمی‌توانید حساب خودتان را غیرفعال کنید.');
    }

    const updated = await admins.update(ctx.params.id, {
      fullName: body.fullName ? String(body.fullName) : undefined,
      role: body.role as AdminRole | undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    });
    await recordAudit(db, {
      userId: null, adminId: ctx.adminId!, action: 'ADMIN_UPDATE_ADMIN', entityType: 'admin', entityId: updated.id,
      oldValue: toResponse(before), newValue: toResponse(updated),
    });
    sendSuccess(ctx.res, toResponse(updated));
  }, [auth, manage]);

  router.post('/admin/admins/:id/permissions', async (ctx) => {
    const admin = await admins.findById(ctx.params.id);
    if (!admin) throw AppError.notFound('ادمین یافت نشد.');
    const body = requireFields(ctx.body, ['permission']);
    const permission = String(body.permission);
    if (!isPermission(permission)) throw AppError.validation('permission نامعتبر است.', { field: 'permission' });

    await admins.grantPermission(admin.id, permission, ctx.adminId!);
    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_GRANT_PERMISSION', entityType: 'admin', entityId: admin.id, newValue: { permission } });
    sendSuccess(ctx.res, { success: true });
  }, [auth, manage]);

  router.delete('/admin/admins/:id/permissions/:permission', async (ctx) => {
    const admin = await admins.findById(ctx.params.id);
    if (!admin) throw AppError.notFound('ادمین یافت نشد.');
    const permission = ctx.params.permission;
    if (!isPermission(permission)) throw AppError.validation('permission نامعتبر است.');

    await admins.revokePermission(admin.id, permission);
    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_REVOKE_PERMISSION', entityType: 'admin', entityId: admin.id, oldValue: { permission } });
    sendSuccess(ctx.res, { success: true });
  }, [auth, manage]);
}
