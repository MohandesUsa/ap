import type { DbClient } from '../../db/DbClient.ts';

export interface UserListRow {
  id: string;
  phone_number: string;
  role: 'owner' | 'driver';
  is_active: number;
  created_at: string;
  full_name: string;
}

export class AdminDirectoryRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  /** Phase 5: Users list with search (name/phone) + role filter + pagination. */
  async listUsers(params: { search?: string; role?: 'owner' | 'driver'; limit: number; offset: number }): Promise<{ rows: UserListRow[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (params.role) {
      values.push(params.role);
      conditions.push(`u.role = $${values.length}`);
    }
    if (params.search) {
      values.push(`%${params.search}%`);
      const likeIdx = values.length;
      values.push(`%${params.search}%`);
      conditions.push(`(u.phone_number LIKE $${likeIdx} OR COALESCE(o.full_name, d.full_name) LIKE $${values.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM users u
      LEFT JOIN owners o ON o.user_id = u.id
      LEFT JOIN drivers d ON d.user_id = u.id
      ${where}
    `;

    const { rows: countRows } = await this.db.query<{ total: number }>(`SELECT COUNT(*) AS total ${baseQuery}`, values);
    const total = Number(countRows[0]?.total ?? 0);

    values.push(params.limit, params.offset);
    const { rows } = await this.db.query<UserListRow>(
      `SELECT u.id, u.phone_number, u.role, u.is_active, u.created_at, COALESCE(o.full_name, d.full_name) AS full_name
       ${baseQuery}
       ORDER BY u.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return { rows, total };
  }

  async getUserDetail(userId: string) {
    const { rows } = await this.db.query<{
      id: string; phone_number: string; role: 'owner' | 'driver'; is_active: number; created_at: string;
      full_name: string; company_name: string | null; owner_id: string | null; driver_id: string | null;
    }>(
      `SELECT u.id, u.phone_number, u.role, u.is_active, u.created_at,
              COALESCE(o.full_name, d.full_name) AS full_name, o.company_name,
              o.id AS owner_id, d.id AS driver_id
       FROM users u
       LEFT JOIN owners o ON o.user_id = u.id
       LEFT JOIN drivers d ON d.user_id = u.id
       WHERE u.id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    await this.db.query('UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3', [
      isActive ? 1 : 0, new Date().toISOString(), userId,
    ]);
  }

  /** Phase 6: Owners list — truck/driver counts + subscription status in one query. */
  async listOwners(params: { limit: number; offset: number }): Promise<{ rows: unknown[]; total: number }> {
    const { rows: countRows } = await this.db.query<{ total: number }>('SELECT COUNT(*) AS total FROM owners');
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await this.db.query(
      `SELECT o.id, o.full_name, o.company_name, o.created_at, u.phone_number, u.is_active,
              (SELECT COUNT(*) FROM trucks t WHERE t.owner_id = o.id AND t.status = 'active') AS truck_count,
              (SELECT COUNT(*) FROM driver_trucks dt JOIN trucks t ON t.id = dt.truck_id
                 WHERE t.owner_id = o.id AND dt.status = 'active') AS driver_count,
              (SELECT s.status FROM subscriptions s WHERE s.owner_id = o.id ORDER BY s.created_at DESC LIMIT 1) AS subscription_status
       FROM owners o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      [params.limit, params.offset],
    );
    return { rows, total };
  }

  async getOwnerDetail(ownerId: string) {
    const { rows } = await this.db.query(
      `SELECT o.id, o.full_name, o.company_name, o.created_at, u.id AS user_id, u.phone_number, u.is_active
       FROM owners o JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
      [ownerId],
    );
    return rows[0] ?? null;
  }

  /** Phase 7: Drivers list — owner + assigned truck via the active driver_trucks row, if any. */
  async listDrivers(params: { limit: number; offset: number }): Promise<{ rows: unknown[]; total: number }> {
    const { rows: countRows } = await this.db.query<{ total: number }>('SELECT COUNT(*) AS total FROM drivers');
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await this.db.query(
      `SELECT d.id, d.full_name, d.pay_type, d.pay_value, d.created_at, u.phone_number, u.is_active,
              t.id AS truck_id, t.plate AS truck_plate, ow.full_name AS owner_name, ow.id AS owner_id,
              dt.status AS connection_status
       FROM drivers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN driver_trucks dt ON dt.driver_id = d.id AND dt.status = 'active'
       LEFT JOIN trucks t ON t.id = dt.truck_id
       LEFT JOIN owners ow ON ow.id = t.owner_id
       ORDER BY d.created_at DESC
       LIMIT $1 OFFSET $2`,
      [params.limit, params.offset],
    );
    return { rows, total };
  }

  async getDriverDetail(driverId: string) {
    const { rows } = await this.db.query(
      `SELECT d.id, d.full_name, d.pay_type, d.pay_value, d.created_at, u.id AS user_id, u.phone_number, u.is_active
       FROM drivers d JOIN users u ON u.id = d.user_id WHERE d.id = $1`,
      [driverId],
    );
    return rows[0] ?? null;
  }

  /** Phase 8: Trucks list — owner + currently assigned driver, system-wide (not scoped to one owner). */
  async listTrucks(params: { limit: number; offset: number }): Promise<{ rows: unknown[]; total: number }> {
    const { rows: countRows } = await this.db.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM trucks WHERE status = 'active'`,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const { rows } = await this.db.query(
      `SELECT t.id, t.plate, t.brand, t.model_year, t.status, t.created_at,
              o.id AS owner_id, o.full_name AS owner_name,
              dr.id AS driver_id, dr.full_name AS driver_name
       FROM trucks t
       JOIN owners o ON o.id = t.owner_id
       LEFT JOIN driver_trucks dt ON dt.truck_id = t.id AND dt.status = 'active'
       LEFT JOIN drivers dr ON dr.id = dt.driver_id
       WHERE t.status = 'active'
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      [params.limit, params.offset],
    );
    return { rows, total };
  }

  async getTruckDetail(truckId: string) {
    const { rows } = await this.db.query(
      `SELECT t.id, t.plate, t.brand, t.model_year, t.status, t.created_at,
              o.id AS owner_id, o.full_name AS owner_name
       FROM trucks t JOIN owners o ON o.id = t.owner_id WHERE t.id = $1`,
      [truckId],
    );
    return rows[0] ?? null;
  }
}
