import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  target: 'all' | 'owners' | 'drivers' | 'specific_user' | 'active_subscribers' | 'expired_subscribers';
  target_user_id: string | null;
  created_by: string;
  created_at: string;
}

export class NotificationRepository {
  private readonly db: DbClient;
  constructor(db: DbClient) { this.db = db; }

  async create(params: { title: string; message: string; target: NotificationRow['target']; targetUserId: string | null; createdBy: string }): Promise<NotificationRow> {
    const id = randomUUID();
    const { rows } = await this.db.query<NotificationRow>(
      `INSERT INTO notifications (id, title, message, target, target_user_id, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, params.title, params.message, params.target, params.targetUserId, params.createdBy, new Date().toISOString()],
    );
    return rows[0];
  }

  async list(limit = 50): Promise<NotificationRow[]> {
    const { rows } = await this.db.query<NotificationRow>('SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows;
  }

  /** Resolves WHO a notification's target actually reaches, at send time — this is deliberately
   *  a plain list of recipient user ids rather than a push send, since Phase 27 explicitly allows
   *  deferring real-time delivery: an actual push provider plugs in here later without this
   *  resolution logic changing. */
  async resolveRecipients(target: NotificationRow['target'], targetUserId: string | null): Promise<string[]> {
    if (target === 'specific_user') return targetUserId ? [targetUserId] : [];
    if (target === 'all') {
      const { rows } = await this.db.query<{ id: string }>('SELECT id FROM users WHERE is_active = 1');
      return rows.map((r) => r.id);
    }
    if (target === 'owners' || target === 'drivers') {
      const { rows } = await this.db.query<{ id: string }>('SELECT id FROM users WHERE role = $1 AND is_active = 1', [target === 'owners' ? 'owner' : 'driver']);
      return rows.map((r) => r.id);
    }
    // active_subscribers / expired_subscribers
    const status = target === 'active_subscribers' ? 'active' : 'expired';
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT u.id FROM users u JOIN owners o ON o.user_id = u.id
       JOIN subscriptions s ON s.owner_id = o.id
       WHERE s.status = $1 AND u.is_active = 1
       GROUP BY u.id`,
      [status],
    );
    return rows.map((r) => r.id);
  }
}
