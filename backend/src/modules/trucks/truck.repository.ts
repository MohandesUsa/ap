import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface TruckRow {
  id: string;
  owner_id: string;
  plate: string;
  brand: string;
  model_year: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export class TruckRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  async listByOwner(ownerId: string): Promise<TruckRow[]> {
    const result = await this.db.query<TruckRow>(
      `SELECT * FROM trucks WHERE owner_id = $1 AND status = 'active' ORDER BY created_at DESC`,
      [ownerId],
    );
    return result.rows;
  }

  async findById(id: string): Promise<TruckRow | null> {
    const result = await this.db.query<TruckRow>('SELECT * FROM trucks WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async create(ownerId: string, plate: string, brand: string, modelYear: string): Promise<TruckRow> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const result = await this.db.query<TruckRow>(
      `INSERT INTO trucks (id, owner_id, plate, brand, model_year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7) RETURNING *`,
      [id, ownerId, plate, brand, modelYear, now, now],
    );
    return result.rows[0];
  }

  async update(id: string, fields: { plate?: string; brand?: string; modelYear?: string }): Promise<TruckRow> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Truck not found');
    const result = await this.db.query<TruckRow>(
      `UPDATE trucks SET plate = $1, brand = $2, model_year = $3, updated_at = $4 WHERE id = $5 RETURNING *`,
      [fields.plate ?? existing.plate, fields.brand ?? existing.brand, fields.modelYear ?? existing.model_year,
        new Date().toISOString(), id],
    );
    return result.rows[0];
  }

  /** Soft delete (Phase 3 §19 explicitly allows this) — keeps history for driver_trucks /
   *  trips / audit_logs foreign keys instead of hard-deleting and orphaning them. */
  async softDelete(id: string): Promise<void> {
    await this.db.query(`UPDATE trucks SET status = 'inactive', updated_at = $1 WHERE id = $2`, [
      new Date().toISOString(),
      id,
    ]);
  }

  async plateExists(plate: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM trucks WHERE plate = $1', [plate]);
    return result.rows.length > 0;
  }
}
