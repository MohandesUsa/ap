import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface AuditLogEntry {
  userId: string | null;
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
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        entry.userId,
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
