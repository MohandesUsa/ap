import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface PlanRow {
  id: string; name: string; duration_days: number; price: number; description: string | null;
  is_active: number; created_at: string; updated_at: string;
}
export interface SubscriptionRow {
  id: string; owner_id: string; plan_id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled'; started_at: string | null; expires_at: string | null; created_at: string;
}
export interface OrderRow {
  id: string; owner_id: string; plan_id: string; subscription_id: string | null; amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled'; created_at: string; updated_at: string;
}
export interface SubscriptionPaymentRow {
  id: string; order_id: string; amount: number; provider: string;
  status: 'pending' | 'successful' | 'failed'; reference_id: string | null; created_at: string;
}

export class SubscriptionRepository {
  private readonly db: DbClient;
  constructor(db: DbClient) { this.db = db; }

  // --- Plans (Phase 10) ---

  async listPlans(includeInactive = false): Promise<PlanRow[]> {
    const sql = includeInactive
      ? 'SELECT * FROM subscription_plans ORDER BY price ASC'
      : `SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC`;
    const { rows } = await this.db.query<PlanRow>(sql);
    return rows;
  }

  async findPlanById(id: string): Promise<PlanRow | null> {
    const { rows } = await this.db.query<PlanRow>('SELECT * FROM subscription_plans WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async createPlan(params: { name: string; durationDays: number; price: number; description: string | null }): Promise<PlanRow> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const { rows } = await this.db.query<PlanRow>(
      `INSERT INTO subscription_plans (id, name, duration_days, price, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6, $7) RETURNING *`,
      [id, params.name, params.durationDays, params.price, params.description, now, now],
    );
    return rows[0];
  }

  async updatePlan(id: string, fields: { name?: string; durationDays?: number; price?: number; description?: string | null; isActive?: boolean }): Promise<PlanRow> {
    const existing = await this.findPlanById(id);
    if (!existing) throw new Error('Plan not found');
    const { rows } = await this.db.query<PlanRow>(
      `UPDATE subscription_plans SET name = $1, duration_days = $2, price = $3, description = $4, is_active = $5, updated_at = $6 WHERE id = $7 RETURNING *`,
      [
        fields.name ?? existing.name,
        fields.durationDays ?? existing.duration_days,
        fields.price ?? existing.price,
        fields.description === undefined ? existing.description : fields.description,
        fields.isActive === undefined ? existing.is_active : (fields.isActive ? 1 : 0),
        new Date().toISOString(), id,
      ],
    );
    return rows[0];
  }

  // --- Subscriptions (Phase 9) ---

  async listSubscriptions(params: { status?: string; limit: number; offset: number }): Promise<{ rows: unknown[]; total: number }> {
    const where = params.status ? 'WHERE s.status = $1' : '';
    const values = params.status ? [params.status] : [];
    const { rows: countRows } = await this.db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM subscriptions s ${where}`, values);
    const total = Number(countRows[0]?.total ?? 0);

    const limitParams = [...values, params.limit, params.offset];
    const { rows } = await this.db.query(
      `SELECT s.*, o.full_name AS owner_name, p.name AS plan_name
       FROM subscriptions s
       JOIN owners o ON o.id = s.owner_id
       JOIN subscription_plans p ON p.id = s.plan_id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
      limitParams,
    );
    return { rows, total };
  }

  async findCurrentSubscriptionForOwner(ownerId: string): Promise<SubscriptionRow | null> {
    const { rows } = await this.db.query<SubscriptionRow>(
      `SELECT * FROM subscriptions WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [ownerId],
    );
    return rows[0] ?? null;
  }

  async createSubscription(ownerId: string, planId: string): Promise<SubscriptionRow> {
    const id = randomUUID();
    const { rows } = await this.db.query<SubscriptionRow>(
      `INSERT INTO subscriptions (id, owner_id, plan_id, status, started_at, expires_at, created_at)
       VALUES ($1, $2, $3, 'pending', NULL, NULL, $4) RETURNING *`,
      [id, ownerId, planId, new Date().toISOString()],
    );
    return rows[0];
  }

  async activateSubscription(id: string, durationDays: number): Promise<SubscriptionRow> {
    const now = new Date();
    const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const { rows } = await this.db.query<SubscriptionRow>(
      `UPDATE subscriptions SET status = 'active', started_at = $1, expires_at = $2 WHERE id = $3 RETURNING *`,
      [now.toISOString(), expires.toISOString(), id],
    );
    return rows[0];
  }

  // --- Orders (Phase 11) ---

  async createOrder(params: { ownerId: string; planId: string; amount: number }): Promise<OrderRow> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const { rows } = await this.db.query<OrderRow>(
      `INSERT INTO orders (id, owner_id, plan_id, subscription_id, amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, $4, 'pending', $5, $5) RETURNING *`,
      [id, params.ownerId, params.planId, params.amount, now],
    );
    return rows[0];
  }

  async findOrderById(id: string): Promise<OrderRow | null> {
    const { rows } = await this.db.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async updateOrderStatus(id: string, status: OrderRow['status'], subscriptionId?: string): Promise<OrderRow> {
    const existing = await this.findOrderById(id);
    if (!existing) throw new Error('Order not found');
    const { rows } = await this.db.query<OrderRow>(
      `UPDATE orders SET status = $1, subscription_id = $2, updated_at = $3 WHERE id = $4 RETURNING *`,
      [status, subscriptionId ?? existing.subscription_id, new Date().toISOString(), id],
    );
    return rows[0];
  }

  async listOrders(params: { status?: string; limit: number; offset: number }): Promise<{ rows: unknown[]; total: number }> {
    const where = params.status ? 'WHERE ord.status = $1' : '';
    const values = params.status ? [params.status] : [];
    const { rows: countRows } = await this.db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM orders ord ${where}`, values);
    const total = Number(countRows[0]?.total ?? 0);

    const limitParams = [...values, params.limit, params.offset];
    const { rows } = await this.db.query(
      `SELECT ord.*, o.full_name AS owner_name, p.name AS plan_name
       FROM orders ord
       JOIN owners o ON o.id = ord.owner_id
       JOIN subscription_plans p ON p.id = ord.plan_id
       ${where}
       ORDER BY ord.created_at DESC
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
      limitParams,
    );
    return { rows, total };
  }

  // --- Subscription payments (Phase 12) ---

  async createPayment(params: { orderId: string; amount: number; provider: string; referenceId: string | null; status: SubscriptionPaymentRow['status'] }): Promise<SubscriptionPaymentRow> {
    const id = randomUUID();
    const { rows } = await this.db.query<SubscriptionPaymentRow>(
      `INSERT INTO subscription_payments (id, order_id, amount, provider, status, reference_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, params.orderId, params.amount, params.provider, params.status, params.referenceId, new Date().toISOString()],
    );
    return rows[0];
  }

  async listPayments(params: { status?: string; limit: number; offset: number }): Promise<{ rows: unknown[]; total: number }> {
    const where = params.status ? 'WHERE sp.status = $1' : '';
    const values = params.status ? [params.status] : [];
    const { rows: countRows } = await this.db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM subscription_payments sp ${where}`, values);
    const total = Number(countRows[0]?.total ?? 0);

    const limitParams = [...values, params.limit, params.offset];
    const { rows } = await this.db.query(
      `SELECT sp.*, ord.owner_id, o.full_name AS owner_name, ord.plan_id, p.name AS plan_name
       FROM subscription_payments sp
       JOIN orders ord ON ord.id = sp.order_id
       JOIN owners o ON o.id = ord.owner_id
       JOIN subscription_plans p ON p.id = ord.plan_id
       ${where}
       ORDER BY sp.created_at DESC
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
      limitParams,
    );
    return { rows, total };
  }

  // --- Revenue (Phase 13) ---

  async revenueSince(isoTimestamp: string): Promise<number> {
    const { rows } = await this.db.query<{ total: number | null }>(
      `SELECT SUM(amount) AS total FROM subscription_payments WHERE status = 'successful' AND created_at >= $1`,
      [isoTimestamp],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async totalRevenue(): Promise<number> {
    const { rows } = await this.db.query<{ total: number | null }>(
      `SELECT SUM(amount) AS total FROM subscription_payments WHERE status = 'successful'`,
    );
    return Number(rows[0]?.total ?? 0);
  }

  async paymentCountsByStatus(): Promise<Record<string, number>> {
    const { rows } = await this.db.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) AS count FROM subscription_payments GROUP BY status`,
    );
    const result: Record<string, number> = { pending: 0, successful: 0, failed: 0 };
    for (const r of rows) result[r.status] = Number(r.count);
    return result;
  }
}
