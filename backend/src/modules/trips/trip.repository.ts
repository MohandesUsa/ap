import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface TripRow {
  id: string;
  truck_id: string;
  driver_id: string;
  origin: string;
  destination: string;
  cargo_type: string | null;
  cargo_weight: string | null;
  income: number;
  commission: number;
  trip_date: string;
  description: string | null;
  settled: number;
  paid_to: 'driver' | 'owner' | null;
  created_at: string;
}

export class TripRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  async create(params: {
    truckId: string; driverId: string; origin: string; destination: string;
    cargoType: string | null; cargoWeight: string | null; income: number; tripDate: string; description: string | null;
  }): Promise<TripRow> {
    const id = randomUUID();
    const result = await this.db.query<TripRow>(
      `INSERT INTO trips (id, truck_id, driver_id, origin, destination, cargo_type, cargo_weight, income, commission,
                           trip_date, description, settled, paid_to, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, 0, NULL, $11) RETURNING *`,
      [id, params.truckId, params.driverId, params.origin, params.destination, params.cargoType, params.cargoWeight,
        params.income, params.tripDate, params.description, new Date().toISOString()],
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<TripRow | null> {
    const result = await this.db.query<TripRow>('SELECT * FROM trips WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async listByDriver(driverId: string): Promise<TripRow[]> {
    const result = await this.db.query<TripRow>(
      'SELECT * FROM trips WHERE driver_id = $1 ORDER BY trip_date DESC, created_at DESC',
      [driverId],
    );
    return result.rows;
  }

  /** Every trip on any truck this owner owns, regardless of which driver logged it. */
  async listByOwner(ownerId: string): Promise<TripRow[]> {
    const result = await this.db.query<TripRow>(
      `SELECT trips.* FROM trips
       JOIN trucks ON trucks.id = trips.truck_id
       WHERE trucks.owner_id = $1
       ORDER BY trips.trip_date DESC, trips.created_at DESC`,
      [ownerId],
    );
    return result.rows;
  }

  async listByDriverAndTruck(driverId: string, truckId: string): Promise<TripRow[]> {
    const result = await this.db.query<TripRow>(
      'SELECT * FROM trips WHERE driver_id = $1 AND truck_id = $2 ORDER BY trip_date DESC, created_at DESC',
      [driverId, truckId],
    );
    return result.rows;
  }

  /** Owner-only: set commission / settled / paidTo on a trip (Phase-1-prototype's settlement
   *  editor — the owner reconciles who actually received the barnameh money for each trip). */
  async updateSettlement(id: string, fields: {
    commission?: number; settled?: boolean; paidTo?: 'driver' | 'owner' | null;
  }): Promise<TripRow> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Trip not found');
    const result = await this.db.query<TripRow>(
      `UPDATE trips SET commission = $1, settled = $2, paid_to = $3 WHERE id = $4 RETURNING *`,
      [
        fields.commission ?? existing.commission,
        fields.settled === undefined ? existing.settled : (fields.settled ? 1 : 0),
        fields.paidTo === undefined ? existing.paid_to : fields.paidTo,
        id,
      ],
    );
    return result.rows[0];
  }
}
