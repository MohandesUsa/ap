import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface InvitationRow {
  id: string;
  token: string;
  owner_id: string;
  driver_phone: string;
  truck_id: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  accepted_by_user_id: string | null;
  expires_at: string;
  created_at: string;
}

export class InvitationRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  async create(params: {
    ownerId: string; driverPhone: string; truckId: string | null; token: string; expiresAt: string;
  }): Promise<InvitationRow> {
    const id = randomUUID();
    const result = await this.db.query<InvitationRow>(
      `INSERT INTO invitations (id, token, owner_id, driver_phone, truck_id, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7) RETURNING *`,
      [id, params.token, params.ownerId, params.driverPhone, params.truckId, params.expiresAt, new Date().toISOString()],
    );
    return result.rows[0];
  }

  async findByToken(token: string): Promise<InvitationRow | null> {
    const result = await this.db.query<InvitationRow>('SELECT * FROM invitations WHERE token = $1', [token]);
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<InvitationRow | null> {
    const result = await this.db.query<InvitationRow>('SELECT * FROM invitations WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async listPendingForPhone(phone: string): Promise<InvitationRow[]> {
    const result = await this.db.query<InvitationRow>(
      `SELECT * FROM invitations WHERE driver_phone = $1 AND status = 'pending' ORDER BY created_at DESC`,
      [phone],
    );
    return result.rows;
  }

  async listByOwner(ownerId: string): Promise<InvitationRow[]> {
    const result = await this.db.query<InvitationRow>(
      'SELECT * FROM invitations WHERE owner_id = $1 ORDER BY created_at DESC',
      [ownerId],
    );
    return result.rows;
  }

  /** Marks accepted AND creates the driver_trucks relationship atomically — Phase 3 §22
   *  ("یک‌بار مصرف باشد") requires this to be race-safe under concurrent accept requests.
   *  Deliberately uses a single conditional UPDATE ("...WHERE status = 'pending'...") rather than
   *  SELECT-then-UPDATE guarded by a row lock: a SELECT...FOR UPDATE lock would make this
   *  Postgres-only (SQLite has no equivalent), whereas an atomic conditional UPDATE is race-safe
   *  on both engines by construction — only one concurrent request can ever be the one whose
   *  UPDATE actually matches a still-'pending' row. */
  async acceptInTransaction(
    invitationId: string,
    acceptedByUserId: string,
    driverId: string,
  ): Promise<{ invitation: InvitationRow; driverTruckId: string | null }> {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query<InvitationRow>('SELECT * FROM invitations WHERE id = $1', [invitationId]);
      const invitation = existing.rows[0];
      if (!invitation) throw new Error('NOT_FOUND');
      if (invitation.status !== 'pending') throw new Error('ALREADY_USED');
      if (new Date(invitation.expires_at) < new Date()) throw new Error('EXPIRED');

      const updated = await tx.query<InvitationRow>(
        `UPDATE invitations SET status = 'accepted', accepted_by_user_id = $1
         WHERE id = $2 AND status = 'pending' RETURNING *`,
        [acceptedByUserId, invitationId],
      );
      if (updated.rows.length === 0) {
        // Someone else's concurrent request won the race — this one is now stale.
        throw new Error('ALREADY_USED');
      }

      let driverTruckId: string | null = null;
      if (invitation.truck_id) {
        driverTruckId = randomUUID();
        await tx.query(
          `INSERT INTO driver_trucks (id, driver_id, truck_id, start_date, status) VALUES ($1, $2, $3, $4, 'active')`,
          [driverTruckId, driverId, invitation.truck_id, new Date().toISOString()],
        );
      }

      return { invitation: updated.rows[0], driverTruckId };
    });
  }

  async expireOldInvitations(): Promise<number> {
    const result = await this.db.query(
      `UPDATE invitations SET status = 'expired' WHERE status = 'pending' AND expires_at < $1 RETURNING id`,
      [new Date().toISOString()],
    );
    return result.rows.length;
  }

  // --- driver_trucks ---

  async findActiveDriverTruck(driverId: string) {
    const result = await this.db.query<{ id: string; truck_id: string }>(
      `SELECT * FROM driver_trucks WHERE driver_id = $1 AND status = 'active'`,
      [driverId],
    );
    return result.rows[0] ?? null;
  }

  /** Phase 3 §25: disconnecting a driver ends the relationship record rather than deleting it,
   *  preserving history. */
  async disconnectDriver(driverTruckId: string): Promise<void> {
    await this.db.query(
      `UPDATE driver_trucks SET status = 'inactive', end_date = $1 WHERE id = $2`,
      [new Date().toISOString(), driverTruckId],
    );
  }

  async listDriversForOwner(ownerId: string) {
    const result = await this.db.query<{
      driver_id: string; full_name: string; pay_type: string; pay_value: number;
      truck_id: string | null; plate: string | null;
    }>(
      `SELECT d.id AS driver_id, d.full_name, d.pay_type, d.pay_value, t.id AS truck_id, t.plate
       FROM driver_trucks dt
       JOIN drivers d ON d.id = dt.driver_id
       JOIN trucks t ON t.id = dt.truck_id
       WHERE t.owner_id = $1 AND dt.status = 'active'`,
      [ownerId],
    );
    return result.rows;
  }
}
