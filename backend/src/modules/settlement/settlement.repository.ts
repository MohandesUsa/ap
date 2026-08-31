import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface SettlementRow {
  id: string;
  owner_id: string;
  driver_id: string;
  truck_id: string;
  period_start: string;
  period_end: string;
  total_income: number;
  total_expense: number;
  net_payable: number;
  status: 'pending' | 'settled';
  created_at: string;
}

export interface PaymentRow {
  id: string;
  settlement_id: string;
  amount: number;
  payment_date: string;
  method: string | null;
  created_at: string;
}

export class SettlementRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  /** One running, still-`pending` ledger per (owner, driver, truck) — reused across calls
   *  instead of minting a new settlement row every time the summary is read, since the
   *  prototype's settlement screen has no notion of "closing a period" yet. */
  async findOrCreateOpen(ownerId: string, driverId: string, truckId: string): Promise<SettlementRow> {
    const existing = await this.db.query<SettlementRow>(
      `SELECT * FROM settlements WHERE owner_id = $1 AND driver_id = $2 AND truck_id = $3 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [ownerId, driverId, truckId],
    );
    if (existing.rows[0]) return existing.rows[0];

    const id = randomUUID();
    const now = new Date().toISOString();
    const created = await this.db.query<SettlementRow>(
      `INSERT INTO settlements (id, owner_id, driver_id, truck_id, period_start, period_end,
                                 total_income, total_expense, net_payable, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $5, 0, 0, 0, 'pending', $5) RETURNING *`,
      [id, ownerId, driverId, truckId, now],
    );
    return created.rows[0];
  }

  async updateTotals(id: string, totalIncome: number, totalExpense: number, netPayable: number): Promise<void> {
    await this.db.query(
      `UPDATE settlements SET total_income = $1, total_expense = $2, net_payable = $3, period_end = $4 WHERE id = $5`,
      [totalIncome, totalExpense, netPayable, new Date().toISOString(), id],
    );
  }

  async addPayment(settlementId: string, amount: number, paymentDate: string, method: string | null): Promise<PaymentRow> {
    const id = randomUUID();
    const result = await this.db.query<PaymentRow>(
      `INSERT INTO payments (id, settlement_id, amount, payment_date, method, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, settlementId, amount, paymentDate, method, new Date().toISOString()],
    );
    return result.rows[0];
  }

  async listPayments(settlementId: string): Promise<PaymentRow[]> {
    const result = await this.db.query<PaymentRow>(
      'SELECT * FROM payments WHERE settlement_id = $1 ORDER BY payment_date DESC, created_at DESC',
      [settlementId],
    );
    return result.rows;
  }
}
