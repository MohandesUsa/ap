import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { SubscriptionRepository } from './subscription.repository.ts';
import { requireAdminAuth, requirePermission } from '../admin-auth/admin.middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePositiveInteger } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

function pagination(ctx: { query: URLSearchParams }) {
  const limit = Math.min(Math.max(Number(ctx.query.get('limit') ?? 20), 1), 100);
  const page = Math.max(Number(ctx.query.get('page') ?? 1), 1);
  return { limit, offset: (page - 1) * limit, page };
}

function planResponse(p: { id: string; name: string; duration_days: number; price: number; description: string | null; is_active: number }) {
  return { id: p.id, name: p.name, durationDays: p.duration_days, price: p.price, description: p.description, isActive: p.is_active === 1 };
}

export function registerSubscriptionRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const repo = new SubscriptionRepository(db);
  const auth = requireAdminAuth(config.adminJwtSecret);

  // Phase 10: "اپ کاربران نباید قیمت اشتراک را Hard-Code کند" — the User App reads plans from
  // here, unauthenticated (pricing is not sensitive; requiring a user login just to see prices
  // before signing up would be a worse product decision than the minor exposure of public prices).
  router.get('/subscription-plans', async (ctx) => {
    const plans = await repo.listPlans(false);
    sendSuccess(ctx.res, { plans: plans.map(planResponse) });
  });

  // --- Admin: plan management (Phase 10) ---

  router.get('/admin/subscription-plans', async (ctx) => {
    const plans = await repo.listPlans(true);
    sendSuccess(ctx.res, { plans: plans.map(planResponse) });
  }, [auth, requirePermission(db, 'SUBSCRIPTIONS_VIEW')]);

  router.post('/admin/subscription-plans', async (ctx) => {
    const body = requireFields(ctx.body, ['name', 'durationDays', 'price']);
    const durationDays = validatePositiveInteger(body.durationDays, 'durationDays');
    const price = validatePositiveInteger(body.price, 'price');
    const plan = await repo.createPlan({
      name: String(body.name), durationDays, price, description: body.description ? String(body.description) : null,
    });
    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_CREATE_PLAN', entityType: 'subscription_plan', entityId: plan.id, newValue: planResponse(plan) });
    sendSuccess(ctx.res, planResponse(plan), 201);
  }, [auth, requirePermission(db, 'SUBSCRIPTIONS_EDIT')]);

  router.put('/admin/subscription-plans/:id', async (ctx) => {
    const before = await repo.findPlanById(ctx.params.id);
    if (!before) throw AppError.notFound('پلن یافت نشد.');
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    const updated = await repo.updatePlan(ctx.params.id, {
      name: body.name ? String(body.name) : undefined,
      durationDays: body.durationDays !== undefined ? validatePositiveInteger(body.durationDays, 'durationDays') : undefined,
      price: body.price !== undefined ? validatePositiveInteger(body.price, 'price') : undefined,
      description: body.description !== undefined ? (body.description === null ? null : String(body.description)) : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    });
    await recordAudit(db, {
      userId: null, adminId: ctx.adminId!, action: 'ADMIN_UPDATE_PLAN', entityType: 'subscription_plan', entityId: updated.id,
      oldValue: planResponse(before), newValue: planResponse(updated),
    });
    sendSuccess(ctx.res, planResponse(updated));
  }, [auth, requirePermission(db, 'SUBSCRIPTIONS_EDIT')]);

  // --- Admin: subscriptions (Phase 9) ---

  router.get('/admin/subscriptions', async (ctx) => {
    const { limit, offset, page } = pagination(ctx);
    const { rows, total } = await repo.listSubscriptions({ status: ctx.query.get('status') ?? undefined, limit, offset });
    sendSuccess(ctx.res, { subscriptions: rows, pagination: { page, limit, total } });
  }, [auth, requirePermission(db, 'SUBSCRIPTIONS_VIEW')]);

  // --- Admin: orders (Phase 11) ---

  router.get('/admin/orders', async (ctx) => {
    const { limit, offset, page } = pagination(ctx);
    const { rows, total } = await repo.listOrders({ status: ctx.query.get('status') ?? undefined, limit, offset });
    sendSuccess(ctx.res, { orders: rows, pagination: { page, limit, total } });
  }, [auth, requirePermission(db, 'ORDERS_VIEW')]);

  // --- Admin: payments (Phase 12) ---

  router.get('/admin/payments', async (ctx) => {
    const { limit, offset, page } = pagination(ctx);
    const { rows, total } = await repo.listPayments({ status: ctx.query.get('status') ?? undefined, limit, offset });
    sendSuccess(ctx.res, { payments: rows, pagination: { page, limit, total } });
  }, [auth, requirePermission(db, 'PAYMENTS_VIEW')]);

  // --- Admin: revenue (Phase 13) ---

  router.get('/admin/revenue', async (ctx) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const [today, month, year, allTime, paymentCounts] = await Promise.all([
      repo.revenueSince(startOfDay), repo.revenueSince(startOfMonth), repo.revenueSince(startOfYear),
      repo.totalRevenue(), repo.paymentCountsByStatus(),
    ]);
    sendSuccess(ctx.res, { today, thisMonth: month, thisYear: year, allTime, paymentCounts });
  }, [auth, requirePermission(db, 'REVENUE_VIEW')]);
}
