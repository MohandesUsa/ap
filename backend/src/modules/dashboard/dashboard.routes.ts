import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { ProfileRepository } from '../profile/profile.repository.ts';
import { TruckRepository } from '../trucks/truck.repository.ts';
import { InvitationRepository } from '../invitations/invitation.repository.ts';
import { TripRepository } from '../trips/trip.repository.ts';
import { ExpenseRepository } from '../expenses/expense.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { AppError } from '../../errors/AppError.ts';

export function registerDashboardRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const profiles = new ProfileRepository(db);
  const trucks = new TruckRepository(db);
  const invitations = new InvitationRepository(db);
  const trips = new TripRepository(db);
  const expenses = new ExpenseRepository(db);
  const auth = requireAuth(config.jwtSecret);

  router.get('/owner/dashboard', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();

    const [truckList, driverList, tripList, expenseList] = await Promise.all([
      trucks.listByOwner(owner.id),
      invitations.listDriversForOwner(owner.id),
      trips.listByOwner(owner.id),
      expenses.listByOwner(owner.id),
    ]);

    sendSuccess(ctx.res, {
      truckCount: truckList.length,
      driverCount: driverList.length,
      // "ThisMonth" in the field name is aspirational — trip_date/expense_date are free-text
      // (the Android/web clients write Jalali dates like "1403/06/02"), so there is no reliable
      // calendar-month boundary to filter on yet; these are running totals across all history,
      // same as the prototype's own settlement screen.
      incomeThisMonth: tripList.reduce((sum, t) => sum + t.income, 0),
      expenseThisMonth: expenseList.reduce((sum, e) => sum + e.amount, 0),
      pendingSettlements: tripList.filter((t) => t.settled === 0).length,
    });
  }, [auth, requireRole('owner')]);

  router.get('/driver/dashboard', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();

    const [truck, tripList, expenseList] = await Promise.all([
      profiles.getDriverCurrentTruck(driver.id),
      trips.listByDriver(driver.id),
      expenses.listByDriver(driver.id),
    ]);

    sendSuccess(ctx.res, {
      currentTruck: truck
        ? { id: truck.truck_id, plate: truck.plate, brand: truck.brand, modelYear: truck.model_year }
        : null,
      tripCountThisMonth: tripList.length,
      incomeThisMonth: tripList.reduce((sum, t) => sum + t.income, 0),
      expenseThisMonth: expenseList.reduce((sum, e) => sum + e.amount, 0),
    });
  }, [auth, requireRole('driver')]);
}
