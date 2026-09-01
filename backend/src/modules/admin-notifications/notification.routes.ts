import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { NotificationRepository, type NotificationRow } from './notification.repository.ts';
import { requireAdminAuth, requirePermission } from '../admin-auth/admin.middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

const VALID_TARGETS: NotificationRow['target'][] = ['all', 'owners', 'drivers', 'specific_user', 'active_subscribers', 'expired_subscribers'];

export function registerNotificationRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const repo = new NotificationRepository(db);
  const auth = requireAdminAuth(config.adminJwtSecret);

  router.get('/admin/notifications', async (ctx) => {
    sendSuccess(ctx.res, { notifications: await repo.list() });
  }, [auth, requirePermission(db, 'NOTIFICATIONS_VIEW')]);

  // Phase 27: architected so a real push provider plugs in where `resolveRecipients()` is called
  // without changing this route — for now, creating a notification resolves and records who it
  // would reach, which is exactly the "not real-time yet, but ready for it" scope the spec allows.
  router.post('/admin/notifications', async (ctx) => {
    const body = requireFields(ctx.body, ['title', 'message', 'target']);
    const target = body.target as NotificationRow['target'];
    if (!VALID_TARGETS.includes(target)) throw AppError.validation('target نامعتبر است.', { field: 'target' });
    if (target === 'specific_user' && !body.targetUserId) {
      throw AppError.validation('targetUserId برای target=specific_user الزامی است.', { field: 'targetUserId' });
    }

    const notification = await repo.create({
      title: String(body.title), message: String(body.message), target,
      targetUserId: body.targetUserId ? String(body.targetUserId) : null, createdBy: ctx.adminId!,
    });
    const recipients = await repo.resolveRecipients(target, notification.target_user_id);

    await recordAudit(db, {
      userId: null, adminId: ctx.adminId!, action: 'ADMIN_CREATE_NOTIFICATION', entityType: 'notification', entityId: notification.id,
      newValue: { title: notification.title, target, recipientCount: recipients.length },
    });
    sendSuccess(ctx.res, { ...notification, recipientCount: recipients.length }, 201);
  }, [auth, requirePermission(db, 'NOTIFICATIONS_MANAGE')]);
}
