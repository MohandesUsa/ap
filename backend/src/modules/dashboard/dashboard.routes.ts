import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { ProfileRepository } from '../profile/profile.repository.ts';
import { TruckRepository } from '../trucks/truck.repository.ts';
import { InvitationRepository } from '../invitations/invitation.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { AppError } from '../../errors/AppError.ts';

export function registerDashboardRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const profiles = new ProfileRepository(db);
  const trucks = new TruckRepository(db);
  const invitations = new InvitationRepository(db);
  const auth = requireAuth(config.jwtSecret);

  router.get('/owner/dashboard', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();

    const truckList = await trucks.listByOwner(owner.id);
    const driverList = await invitations.listDriversForOwner(owner.id);

    sendSuccess(ctx.res, {
      truckCount: truckList.length,
      driverCount: driverList.length,
      // Phase 3 §27 explicitly allows placeholder/zero financial figures here — the accounting
      // engine (trips/expenses/settlements business logic) is out of scope until a later phase
      // (consistent with Android Phase 2's OwnerDashboardViewModel, which has the same note).
      incomeThisMonth: 0,
      expenseThisMonth: 0,
      pendingSettlements: 0,
    });
  }, [auth, requireRole('owner')]);

  router.get('/driver/dashboard', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();

    const truck = await profiles.getDriverCurrentTruck(driver.id);

    sendSuccess(ctx.res, {
      currentTruck: truck
        ? { id: truck.truck_id, plate: truck.plate, brand: truck.brand, modelYear: truck.model_year }
        : null,
      tripCountThisMonth: 0,
      incomeThisMonth: 0,
      expenseThisMonth: 0,
    });
  }, [auth, requireRole('driver')]);
}
