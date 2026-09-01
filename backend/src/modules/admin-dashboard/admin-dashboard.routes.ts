import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { requireAdminAuth, requirePermission } from '../admin-auth/admin.middleware.ts';
import { sendSuccess } from '../../http/respond.ts';

async function count(db: DbClient, sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await db.query<{ total: number }>(sql, params);
  return Number(rows[0]?.total ?? 0);
}

/** Phase 4 — one aggregate endpoint for the Admin dashboard's headline numbers, gated on
 *  USERS_VIEW (the least-restrictive of the metrics it shows) rather than requiring every
 *  underlying permission individually; the dashboard is a summary, not a way to bypass the more
 *  specific per-resource permissions the detail pages behind it still enforce. */
export function registerAdminDashboardRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const auth = requireAdminAuth(config.adminJwtSecret);

  router.get('/admin/dashboard', async (ctx) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      totalUsers, activeUsers, newUsersToday, newUsersThisMonth,
      totalOwners, totalDrivers, totalTrucks,
      activeSubscriptions, expiredSubscriptions,
      paymentCounts,
    ] = await Promise.all([
      count(db, 'SELECT COUNT(*) AS total FROM users'),
      count(db, 'SELECT COUNT(*) AS total FROM users WHERE is_active = 1'),
      count(db, 'SELECT COUNT(*) AS total FROM users WHERE created_at >= $1', [startOfDay]),
      count(db, 'SELECT COUNT(*) AS total FROM users WHERE created_at >= $1', [startOfMonth]),
      count(db, 'SELECT COUNT(*) AS total FROM owners'),
      count(db, 'SELECT COUNT(*) AS total FROM drivers'),
      count(db, `SELECT COUNT(*) AS total FROM trucks WHERE status = 'active'`),
      count(db, `SELECT COUNT(*) AS total FROM subscriptions WHERE status = 'active'`),
      count(db, `SELECT COUNT(*) AS total FROM subscriptions WHERE status = 'expired'`),
      db.query<{ status: string; count: number }>(`SELECT status, COUNT(*) AS count FROM subscription_payments GROUP BY status`),
    ]);

    const revenue = async (since: string) => {
      const { rows } = await db.query<{ total: number | null }>(
        `SELECT SUM(amount) AS total FROM subscription_payments WHERE status = 'successful' AND created_at >= $1`,
        [since],
      );
      return Number(rows[0]?.total ?? 0);
    };
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const [todayRevenue, monthlyRevenue, yearlyRevenue] = await Promise.all([
      revenue(startOfDay), revenue(startOfMonth), revenue(startOfYear),
    ]);

    const paymentCountMap: Record<string, number> = { pending: 0, successful: 0, failed: 0 };
    for (const row of paymentCounts.rows) paymentCountMap[row.status] = Number(row.count);

    sendSuccess(ctx.res, {
      users: { total: totalUsers, active: activeUsers, newToday: newUsersToday, newThisMonth: newUsersThisMonth },
      fleet: { totalOwners, totalDrivers, totalTrucks },
      subscriptions: { active: activeSubscriptions, expired: expiredSubscriptions },
      revenue: { today: todayRevenue, thisMonth: monthlyRevenue, thisYear: yearlyRevenue },
      payments: { successful: paymentCountMap.successful, failed: paymentCountMap.failed, pending: paymentCountMap.pending },
    });
  }, [auth, requirePermission(db, 'USERS_VIEW')]);

  /** Daily user-signup and revenue series for the last N days (Phase 4's charts) — a plain time
   *  series the client renders itself; charting is a UI concern, not this endpoint's job. */
  router.get('/admin/dashboard/growth', async (ctx) => {
    const days = Math.min(Math.max(Number(ctx.query.get('days') ?? 30), 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [userRows, revenueRows] = await Promise.all([
      db.query<{ day: string; count: number }>(
        `SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS count FROM users WHERE created_at >= $1 GROUP BY day ORDER BY day`,
        [since],
      ),
      db.query<{ day: string; total: number }>(
        `SELECT SUBSTR(created_at, 1, 10) AS day, SUM(amount) AS total FROM subscription_payments
         WHERE status = 'successful' AND created_at >= $1 GROUP BY day ORDER BY day`,
        [since],
      ),
    ]);

    sendSuccess(ctx.res, {
      userGrowth: userRows.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
      revenue: revenueRows.rows.map((r) => ({ day: r.day, amount: Number(r.total) })),
    });
  }, [auth, requirePermission(db, 'REVENUE_VIEW')]);
}
