import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface ExpenseRow {
  id: string;
  truck_id: string;
  driver_id: string;
  owner_id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
  receipt_url: string | null;
  created_at: string;
}

export class ExpenseRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  async create(params: {
    truckId: string; driverId: string; ownerId: string; category: string; amount: number;
    expenseDate: string; description: string | null;
  }): Promise<ExpenseRow> {
    const id = randomUUID();
    const result = await this.db.query<ExpenseRow>(
      `INSERT INTO expenses (id, truck_id, driver_id, owner_id, category, amount, expense_date, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, params.truckId, params.driverId, params.ownerId, params.category, params.amount, params.expenseDate,
        params.description, new Date().toISOString()],
    );
    return result.rows[0];
  }

  async listByDriver(driverId: string): Promise<ExpenseRow[]> {
    const result = await this.db.query<ExpenseRow>(
      'SELECT * FROM expenses WHERE driver_id = $1 ORDER BY expense_date DESC, created_at DESC',
      [driverId],
    );
    return result.rows;
  }

  async listByOwner(ownerId: string): Promise<ExpenseRow[]> {
    const result = await this.db.query<ExpenseRow>(
      'SELECT * FROM expenses WHERE owner_id = $1 ORDER BY expense_date DESC, created_at DESC',
      [ownerId],
    );
    return result.rows;
  }
}
