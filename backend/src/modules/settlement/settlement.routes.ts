import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { SettlementRepository } from './settlement.repository.ts';
import { settlementSummary } from './settlement.calc.ts';
import { ProfileRepository } from '../profile/profile.repository.ts';
import { InvitationRepository } from '../invitations/invitation.repository.ts';
import { TripRepository } from '../trips/trip.repository.ts';
import { ExpenseRepository } from '../expenses/expense.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePositiveInteger } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

export function registerSettlementRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const settlements = new SettlementRepository(db);
  const profiles = new ProfileRepository(db);
  const invitations = new InvitationRepository(db);
  const trips = new TripRepository(db);
  const expenses = new ExpenseRepository(db);
  const auth = requireAuth(config.jwtSecret);

  async function buildSummary(ownerId: string, driverId: string, truckId: string) {
    const driver = await profiles.getDriverById(driverId);
    if (!driver) throw AppError.notFound('راننده یافت نشد.');

    const settlement = await settlements.findOrCreateOpen(ownerId, driverId, truckId);
    const [tripList, expenseList, payments] = await Promise.all([
      trips.listByDriverAndTruck(driverId, truckId),
      expenses.listByOwner(ownerId),
      settlements.listPayments(settlement.id),
    ]);
    const manualPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const summary = settlementSummary(tripList, expenseList, driver, manualPaid);
    await settlements.updateTotals(settlement.id, summary.totalIncome, summary.totalExpense, summary.remaining);

    return {
      settlementId: settlement.id,
      driverId,
      payType: driver.pay_type,
      payValue: driver.pay_value,
      totalIncome: summary.totalIncome,
      totalExpense: summary.totalExpense,
      driverEntitlement: summary.entitlement,
      paidDirect: summary.paidDirect,
      manualPaid: summary.manualPaid,
      remaining: summary.remaining,
      payments: payments.map((p) => ({ id: p.id, amount: p.amount, paymentDate: p.payment_date, method: p.method })),
    };
  }

  router.get('/owner/settlement/summary', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();
    const driverId = ctx.query.get('driverId');
    if (!driverId) throw AppError.badRequest('پارامتر driverId الزامی است.');

    const link = await invitations.findActiveLinkForOwnerAndDriver(owner.id, driverId);
    if (!link) throw AppError.notFound('راننده یافت نشد.');

    sendSuccess(ctx.res, await buildSummary(owner.id, driverId, link.truck_id));
  }, [auth, requireRole('owner')]);

  router.get('/driver/settlement/summary', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();
    const activeTruck = await invitations.findActiveDriverTruck(driver.id);
    if (!activeTruck) throw AppError.forbidden('شما در حال حاضر به هیچ کامیونی متصل نیستید.');

    const truck = await db.query<{ owner_id: string }>('SELECT owner_id FROM trucks WHERE id = $1', [activeTruck.truck_id]);
    const ownerId = truck.rows[0]?.owner_id;
    if (!ownerId) throw AppError.notFound();

    sendSuccess(ctx.res, await buildSummary(ownerId, driver.id, activeTruck.truck_id));
  }, [auth, requireRole('driver')]);

  router.post('/owner/settlement/payments', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();

    const body = requireFields(ctx.body, ['driverId', 'amount']);
    const driverId = String(body.driverId);
    const amount = validatePositiveInteger(body.amount, 'amount');

    const link = await invitations.findActiveLinkForOwnerAndDriver(owner.id, driverId);
    if (!link) throw AppError.notFound('راننده یافت نشد.');

    const before = await buildSummary(owner.id, driverId, link.truck_id);
    if (amount > before.remaining) {
      throw AppError.validation('مبلغ پرداخت از باقی‌ماندهٔ بدهی بیشتر است.', { field: 'amount', remaining: before.remaining });
    }

    const settlement = await settlements.findOrCreateOpen(owner.id, driverId, link.truck_id);
    const paymentDate = body.paymentDate ? String(body.paymentDate) : new Date().toISOString();
    const payment = await settlements.addPayment(settlement.id, amount, paymentDate, body.method ? String(body.method) : null);

    await recordAudit(db, {
      userId: ctx.userId!, action: 'RECORD_PAYMENT', entityType: 'payment', entityId: payment.id,
      newValue: { driverId, amount, paymentDate },
    });

    sendSuccess(ctx.res, await buildSummary(owner.id, driverId, link.truck_id), 201);
  }, [auth, requireRole('owner')]);
}
