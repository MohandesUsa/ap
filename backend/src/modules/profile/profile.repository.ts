import type { DbClient } from '../../db/DbClient.ts';
import type { OwnerRow, DriverRow } from '../auth/auth.repository.ts';

export class ProfileRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  async getOwnerByUserId(userId: string): Promise<OwnerRow | null> {
    const result = await this.db.query<OwnerRow>('SELECT * FROM owners WHERE user_id = $1', [userId]);
    return result.rows[0] ?? null;
  }

  async updateOwner(userId: string, fields: { fullName?: string; companyName?: string }): Promise<OwnerRow> {
    const existing = await this.getOwnerByUserId(userId);
    if (!existing) throw new Error('Owner profile not found');

    const fullName = fields.fullName ?? existing.full_name;
    const companyName = fields.companyName ?? existing.company_name;

    const result = await this.db.query<OwnerRow>(
      'UPDATE owners SET full_name = $1, company_name = $2 WHERE user_id = $3 RETURNING *',
      [fullName, companyName, userId],
    );
    return result.rows[0];
  }

  async getDriverByUserId(userId: string): Promise<DriverRow | null> {
    const result = await this.db.query<DriverRow>('SELECT * FROM drivers WHERE user_id = $1', [userId]);
    return result.rows[0] ?? null;
  }

  async getDriverById(driverId: string): Promise<DriverRow | null> {
    const result = await this.db.query<DriverRow>('SELECT * FROM drivers WHERE id = $1', [driverId]);
    return result.rows[0] ?? null;
  }

  /** Owner-only action (Phase 2's DriverRepositoryImpl.kt noted this had no backend endpoint
   *  yet — this is that endpoint): how a driver's pay is calculated is the owner's call, not
   *  the driver's, matching the prototype's "حقوق راننده" screen. */
  async updateDriverPay(driverId: string, payType: 'percent' | 'salary', payValue: number): Promise<DriverRow> {
    const result = await this.db.query<DriverRow>(
      'UPDATE drivers SET pay_type = $1, pay_value = $2 WHERE id = $3 RETURNING *',
      [payType, payValue, driverId],
    );
    return result.rows[0];
  }

  async updateDriver(userId: string, fields: { fullName?: string }): Promise<DriverRow> {
    const existing = await this.getDriverByUserId(userId);
    if (!existing) throw new Error('Driver profile not found');

    const fullName = fields.fullName ?? existing.full_name;

    const result = await this.db.query<DriverRow>(
      'UPDATE drivers SET full_name = $1 WHERE user_id = $2 RETURNING *',
      [fullName, userId],
    );
    return result.rows[0];
  }

  /** The driver's currently active truck (if any) plus the owning owner's basic info — powers
   *  both GET /drivers/me (Phase 3 §18) and the driver dashboard (§26). */
  async getDriverCurrentTruck(driverId: string) {
    const result = await this.db.query<{
      truck_id: string; plate: string; brand: string; model_year: string;
      owner_full_name: string; owner_company_name: string | null;
    }>(
      `SELECT t.id AS truck_id, t.plate, t.brand, t.model_year,
              o.full_name AS owner_full_name, o.company_name AS owner_company_name
       FROM driver_trucks dt
       JOIN trucks t ON t.id = dt.truck_id
       JOIN owners o ON o.id = t.owner_id
       WHERE dt.driver_id = $1 AND dt.status = 'active'
       LIMIT 1`,
      [driverId],
    );
    return result.rows[0] ?? null;
  }
}
