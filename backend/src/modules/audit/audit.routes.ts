import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { listAuditLogs } from './audit.repository.ts';
import { requireAdminAuth, requirePermission } from '../admin-auth/admin.middleware.ts';
import { sendSuccess } from '../../http/respond.ts';

/** Phase 20 — read-only; nothing ever deletes or edits an audit log entry. */
export function registerAuditRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const auth = requireAdminAuth(config.adminJwtSecret);

  router.get('/admin/audit-logs', async (ctx) => {
    const adminId = ctx.query.get('adminId') ?? undefined;
    const limit = Math.min(Math.max(Number(ctx.query.get('limit') ?? 100), 1), 500);
    sendSuccess(ctx.res, { logs: await listAuditLogs(db, { adminId, limit }) });
  }, [auth, requirePermission(db, 'AUDIT_LOG_VIEW')]);
}
