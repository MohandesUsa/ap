import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { ExpenseRepository, type ExpenseRow } from './expense.repository.ts';
import { ProfileRepository } from '../profile/profile.repository.ts';
import { InvitationRepository } from '../invitations/invitation.repository.ts';
import { TruckRepository } from '../trucks/truck.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePositiveInteger } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

function toResponse(expense: ExpenseRow) {
  return {
    id: expense.id,
    truckId: expense.truck_id,
    driverId: expense.driver_id,
    category: expense.category,
    amount: expense.amount,
    expenseDate: expense.expense_date,
    description: expense.description,
  };
}

export function registerExpenseRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const expenses = new ExpenseRepository(db);
  const profiles = new ProfileRepository(db);
  const invitations = new InvitationRepository(db);
  const trucks = new TruckRepository(db);
  const auth = requireAuth(config.jwtSecret);

  // Same "resolve from the session, never trust the client" rule as trips: a driver logs an
  // expense against the truck/owner they are currently assigned to, not one they name.
  router.post('/expenses', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();
    const activeTruck = await invitations.findActiveDriverTruck(driver.id);
    if (!activeTruck) throw AppError.forbidden('شما در حال حاضر به هیچ کامیونی متصل نیستید.');
    const truck = await trucks.findById(activeTruck.truck_id);
    if (!truck) throw AppError.forbidden();

    const body = requireFields(ctx.body, ['category', 'amount', 'expenseDate']);
    const amount = validatePositiveInteger(body.amount, 'amount');

    const expense = await expenses.create({
      truckId: truck.id,
      driverId: driver.id,
      ownerId: truck.owner_id,
      category: String(body.category),
      amount,
      expenseDate: String(body.expenseDate),
      description: body.description ? String(body.description) : null,
    });
    await recordAudit(db, { userId: ctx.userId!, action: 'CREATE_EXPENSE', entityType: 'expense', entityId: expense.id, newValue: toResponse(expense) });
    sendSuccess(ctx.res, toResponse(expense), 201);
  }, [auth, requireRole('driver')]);

  router.get('/driver/expenses', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();
    const list = await expenses.listByDriver(driver.id);
    sendSuccess(ctx.res, { expenses: list.map(toResponse) });
  }, [auth, requireRole('driver')]);

  router.get('/owner/expenses', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();
    const list = await expenses.listByOwner(owner.id);
    sendSuccess(ctx.res, { expenses: list.map(toResponse) });
  }, [auth, requireRole('owner')]);
}
