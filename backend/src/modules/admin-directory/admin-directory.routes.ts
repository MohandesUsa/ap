import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { AdminDirectoryRepository } from './admin-directory.repository.ts';
import { TruckRepository } from '../trucks/truck.repository.ts';
import { TripRepository } from '../trips/trip.repository.ts';
import { ExpenseRepository } from '../expenses/expense.repository.ts';
import { InvitationRepository } from '../invitations/invitation.repository.ts';
import { requireAdminAuth, requirePermission } from '../admin-auth/admin.middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

function pagination(ctx: { query: URLSearchParams }) {
  const limit = Math.min(Math.max(Number(ctx.query.get('limit') ?? 20), 1), 100);
  const page = Math.max(Number(ctx.query.get('page') ?? 1), 1);
  return { limit, offset: (page - 1) * limit, page };
}

export function registerAdminDirectoryRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const directory = new AdminDirectoryRepository(db);
  const trucks = new TruckRepository(db);
  const trips = new TripRepository(db);
  const expenses = new ExpenseRepository(db);
  const invitations = new InvitationRepository(db);
  const auth = requireAdminAuth(config.adminJwtSecret);

  // --- Users (Phase 5) ---

  router.get('/admin/users', async (ctx) => {
    const { limit, offset, page } = pagination(ctx);
    const role = ctx.query.get('role');
    const { rows, total } = await directory.listUsers({
      search: ctx.query.get('search') ?? undefined,
      role: role === 'owner' || role === 'driver' ? role : undefined,
      limit, offset,
    });
    sendSuccess(ctx.res, { users: rows, pagination: { page, limit, total } });
  }, [auth, requirePermission(db, 'USERS_VIEW')]);

  router.get('/admin/users/:id', async (ctx) => {
    const user = await directory.getUserDetail(ctx.params.id);
    if (!user) throw AppError.notFound('کاربر یافت نشد.');

    let extra: Record<string, unknown> = {};
    if (user.role === 'owner' && user.owner_id) {
      const [truckList, tripList, expenseList, driverList] = await Promise.all([
        trucks.listByOwner(user.owner_id), trips.listByOwner(user.owner_id),
        expenses.listByOwner(user.owner_id), invitations.listDriversForOwner(user.owner_id),
      ]);
      extra = { trucks: truckList, drivers: driverList, tripCount: tripList.length, expenseCount: expenseList.length };
    } else if (user.role === 'driver' && user.driver_id) {
      const activeTruck = await invitations.findActiveDriverTruck(user.driver_id);
      const [tripList, expenseList] = await Promise.all([
        trips.listByDriver(user.driver_id), expenses.listByDriver(user.driver_id),
      ]);
      extra = { activeTruckId: activeTruck?.truck_id ?? null, tripCount: tripList.length, expenseCount: expenseList.length };
    }

    sendSuccess(ctx.res, { ...user, ...extra });
  }, [auth, requirePermission(db, 'USERS_VIEW')]);

  router.put('/admin/users/:id/status', async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    if (typeof body.isActive !== 'boolean') throw AppError.validation('isActive باید true یا false باشد.');

    const user = await directory.getUserDetail(ctx.params.id);
    if (!user) throw AppError.notFound('کاربر یافت نشد.');

    await directory.setUserActive(ctx.params.id, body.isActive);
    await recordAudit(db, {
      userId: null, adminId: ctx.adminId!, action: body.isActive ? 'ADMIN_ACTIVATE_USER' : 'ADMIN_SUSPEND_USER',
      entityType: 'user', entityId: ctx.params.id, oldValue: { isActive: !!user.is_active }, newValue: { isActive: body.isActive },
    });
    sendSuccess(ctx.res, { success: true });
  }, [auth, requirePermission(db, 'USERS_EDIT')]);

  // --- Owners (Phase 6) ---

  router.get('/admin/owners', async (ctx) => {
    const { limit, offset, page } = pagination(ctx);
    const { rows, total } = await directory.listOwners({ limit, offset });
    sendSuccess(ctx.res, { owners: rows, pagination: { page, limit, total } });
  }, [auth, requirePermission(db, 'OWNERS_VIEW')]);

  router.get('/admin/owners/:id', async (ctx) => {
    const owner = await directory.getOwnerDetail(ctx.params.id);
    if (!owner) throw AppError.notFound('صاحب کامیون یافت نشد.');
    const [truckList, tripList, expenseList, driverList] = await Promise.all([
      trucks.listByOwner(ctx.params.id), trips.listByOwner(ctx.params.id),
      expenses.listByOwner(ctx.params.id), invitations.listDriversForOwner(ctx.params.id),
    ]);
    sendSuccess(ctx.res, {
      ...owner, trucks: truckList, drivers: driverList, trips: tripList, expenses: expenseList,
      totalIncome: tripList.reduce((s, t) => s + t.income, 0),
      totalExpense: expenseList.reduce((s, e) => s + e.amount, 0),
    });
  }, [auth, requirePermission(db, 'OWNERS_VIEW')]);

  // --- Drivers (Phase 7) ---

  router.get('/admin/drivers', async (ctx) => {
    const { limit, offset, page } = pagination(ctx);
    const { rows, total } = await directory.listDrivers({ limit, offset });
    sendSuccess(ctx.res, { drivers: rows, pagination: { page, limit, total } });
  }, [auth, requirePermission(db, 'DRIVERS_VIEW')]);

  router.get('/admin/drivers/:id', async (ctx) => {
    const driver = await directory.getDriverDetail(ctx.params.id);
    if (!driver) throw AppError.notFound('راننده یافت نشد.');
    const activeTruck = await invitations.findActiveDriverTruck(ctx.params.id);
    const [tripList, expenseList] = await Promise.all([
      trips.listByDriver(ctx.params.id), expenses.listByDriver(ctx.params.id),
    ]);
    sendSuccess(ctx.res, {
      ...driver, activeTruckId: activeTruck?.truck_id ?? null, trips: tripList, expenses: expenseList,
      totalIncome: tripList.reduce((s, t) => s + t.income, 0),
      totalExpense: expenseList.reduce((s, e) => s + e.amount, 0),
    });
  }, [auth, requirePermission(db, 'DRIVERS_VIEW')]);

  // --- Trucks (Phase 8) ---

  router.get('/admin/trucks', async (ctx) => {
    const { limit, offset, page } = pagination(ctx);
    const { rows, total } = await directory.listTrucks({ limit, offset });
    sendSuccess(ctx.res, { trucks: rows, pagination: { page, limit, total } });
  }, [auth, requirePermission(db, 'TRUCKS_VIEW')]);

  router.get('/admin/trucks/:id', async (ctx) => {
    const truck = await directory.getTruckDetail(ctx.params.id);
    if (!truck) throw AppError.notFound('کامیون یافت نشد.');
    const tripList = (await trips.listByOwner((truck as { owner_id: string }).owner_id)).filter((t) => t.truck_id === ctx.params.id);
    sendSuccess(ctx.res, {
      ...truck, trips: tripList, totalIncome: tripList.reduce((s, t) => s + t.income, 0),
    });
  }, [auth, requirePermission(db, 'TRUCKS_VIEW')]);
}
