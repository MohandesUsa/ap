import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface AuditLogEntry {
  userId: string | null;
  /** Set instead of (never alongside) userId when the actor is an admin, not an Owner/Driver —
   *  audit_logs.user_id references `users`, which has no row for an admin at all, so admin
   *  actions need this separate column (see migrations/002_admin.sql). */
  adminId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

/**
 * Fire-and-forget style helper used by every module that performs a security-sensitive action
 * (Phase 3 §33's list: login, logout, create/update truck, invite driver, accept invitation,
 * disconnect driver). Deliberately swallows its own errors after logging them — an audit-log
 * write failing must never fail the underlying business operation it's recording.
 */
export async function recordAudit(db: DbClient, entry: AuditLogEntry): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, admin_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        entry.userId,
        entry.adminId ?? null,
        entry.action,
        entry.entityType ?? null,
        entry.entityId ?? null,
        entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : null,
        entry.newValue !== undefined ? JSON.stringify(entry.newValue) : null,
        entry.ipAddress ?? null,
        new Date().toISOString(),
      ],
    );
  } catch (err) {
    console.error('Failed to write audit log entry:', entry.action, err);
  }
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  created_at: string;
}

/** Phase 20: the Admin App's read view of this log — newest first, optionally scoped to one
 *  admin (AUDIT_LOG_VIEW-gated, see audit.routes.ts). */
export async function listAuditLogs(db: DbClient, filters: { adminId?: string; limit?: number } = {}): Promise<AuditLogRow[]> {
  const limit = Math.min(filters.limit ?? 100, 500);
  if (filters.adminId) {
    const { rows } = await db.query<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE admin_id = $1 ORDER BY created_at DESC LIMIT $2',
      [filters.adminId, limit],
    );
    return rows;
  }
  const { rows } = await db.query<AuditLogRow>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
  return rows;
}
