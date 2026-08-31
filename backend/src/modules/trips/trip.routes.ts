import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { TripRepository, type TripRow } from './trip.repository.ts';
import { ProfileRepository } from '../profile/profile.repository.ts';
import { InvitationRepository } from '../invitations/invitation.repository.ts';
import { TruckRepository } from '../trucks/truck.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePositiveInteger } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

function toResponse(trip: TripRow) {
  return {
    id: trip.id,
    truckId: trip.truck_id,
    driverId: trip.driver_id,
    origin: trip.origin,
    destination: trip.destination,
    cargoType: trip.cargo_type,
    cargoWeight: trip.cargo_weight,
    income: trip.income,
    commission: trip.commission,
    tripDate: trip.trip_date,
    description: trip.description,
    settled: trip.settled === 1,
    paidTo: trip.paid_to,
  };
}

export function registerTripRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const trips = new TripRepository(db);
  const profiles = new ProfileRepository(db);
  const invitations = new InvitationRepository(db);
  const trucks = new TruckRepository(db);
  const auth = requireAuth(config.jwtSecret);

  // A driver logs a service against the truck they are currently assigned to — same rule as
  // Phase 3 §11.2 for pay type: one source of truth (driver_trucks), never a client-supplied
  // truckId, so a driver can never log a trip against someone else's truck.
  router.post('/trips', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();
    const activeTruck = await invitations.findActiveDriverTruck(driver.id);
    if (!activeTruck) throw AppError.forbidden('شما در حال حاضر به هیچ کامیونی متصل نیستید.');

    const body = requireFields(ctx.body, ['origin', 'destination', 'income', 'tripDate']);
    const income = validatePositiveInteger(body.income, 'income');

    const trip = await trips.create({
      truckId: activeTruck.truck_id,
      driverId: driver.id,
      origin: String(body.origin),
      destination: String(body.destination),
      cargoType: body.cargoType ? String(body.cargoType) : null,
      cargoWeight: body.cargoWeight ? String(body.cargoWeight) : null,
      income,
      tripDate: String(body.tripDate),
      description: body.description ? String(body.description) : null,
    });
    await recordAudit(db, { userId: ctx.userId!, action: 'CREATE_TRIP', entityType: 'trip', entityId: trip.id, newValue: toResponse(trip) });
    sendSuccess(ctx.res, toResponse(trip), 201);
  }, [auth, requireRole('driver')]);

  router.get('/driver/trips', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();
    const list = await trips.listByDriver(driver.id);
    sendSuccess(ctx.res, { trips: list.map(toResponse) });
  }, [auth, requireRole('driver')]);

  // Every trip logged against any of this owner's trucks, by any driver — matches the
  // prototype's owner "سرویس‌ها" screen, which is fleet-wide rather than per-truck.
  router.get('/owner/trips', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();
    const list = await trips.listByOwner(owner.id);
    sendSuccess(ctx.res, { trips: list.map(toResponse) });
  }, [auth, requireRole('owner')]);

  /** Same authorization shape as truck.routes.ts's assertOwnsTruck: 404 (not 403) when the
   *  trip belongs to a truck this owner doesn't own, so its existence isn't even confirmed. */
  async function assertOwnerOwnsTrip(userId: string, tripId: string): Promise<TripRow> {
    const owner = await profiles.getOwnerByUserId(userId);
    if (!owner) throw AppError.forbidden();
    const trip = await trips.findById(tripId);
    if (!trip) throw AppError.notFound('سرویس یافت نشد.');
    const truck = await trucks.findById(trip.truck_id);
    if (!truck || truck.owner_id !== owner.id) throw AppError.notFound('سرویس یافت نشد.');
    return trip;
  }

  router.put('/trips/:id/settlement', async (ctx) => {
    const before = await assertOwnerOwnsTrip(ctx.userId!, ctx.params.id);
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    if (body.paidTo !== undefined && body.paidTo !== null && body.paidTo !== 'driver' && body.paidTo !== 'owner') {
      throw AppError.validation('paidTo باید driver یا owner باشد.', { field: 'paidTo' });
    }
    const updated = await trips.updateSettlement(before.id, {
      commission: body.commission !== undefined ? validatePositiveInteger(body.commission, 'commission') : undefined,
      settled: typeof body.settled === 'boolean' ? body.settled : undefined,
      paidTo: body.paidTo === undefined ? undefined : (body.paidTo as 'driver' | 'owner' | null),
    });
    await recordAudit(db, {
      userId: ctx.userId!, action: 'UPDATE_TRIP_SETTLEMENT', entityType: 'trip', entityId: updated.id,
      oldValue: toResponse(before), newValue: toResponse(updated),
    });
    sendSuccess(ctx.res, toResponse(updated));
  }, [auth, requireRole('owner')]);
}
