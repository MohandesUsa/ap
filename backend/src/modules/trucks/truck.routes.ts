import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { TruckRepository, type TruckRow } from './truck.repository.ts';
import { ProfileRepository } from '../profile/profile.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePlate } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

function toResponse(truck: TruckRow) {
  return { id: truck.id, plate: truck.plate, brand: truck.brand, modelYear: truck.model_year };
}

export function registerTruckRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const trucks = new TruckRepository(db);
  const profiles = new ProfileRepository(db);
  const auth = requireAuth(config.jwtSecret);
  const ownerOnly = requireRole('owner');

  /** Resolves the caller's owner_id and asserts the given truck belongs to them.
   *  This IS the fix for Phase 3 §20 — every truck-scoped route below calls this before doing
   *  anything else, so "Owner A cannot read/modify Owner B's truck" holds by construction rather
   *  than by remembering to add a check in each handler separately. */
  async function assertOwnsTruck(userId: string, truckId: string): Promise<TruckRow> {
    const owner = await profiles.getOwnerByUserId(userId);
    if (!owner) throw AppError.forbidden();

    const truck = await trucks.findById(truckId);
    if (!truck || truck.status === 'inactive') throw AppError.notFound('کامیون یافت نشد.');
    if (truck.owner_id !== owner.id) {
      // Same response as "not found" (404, not 403) — Phase 3 §20's intent is that Owner B
      // cannot even confirm Truck 103 exists, not just that they can't read its contents.
      throw AppError.notFound('کامیون یافت نشد.');
    }
    return truck;
  }

  router.get('/trucks', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();
    const list = await trucks.listByOwner(owner.id);
    sendSuccess(ctx.res, { trucks: list.map(toResponse) });
  }, [auth, ownerOnly]);

  router.post('/trucks', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();

    const body = requireFields(ctx.body, ['plate', 'brand', 'modelYear']);
    const plate = String(body.plate);
    validatePlate(plate);

    if (await trucks.plateExists(plate)) {
      throw AppError.conflict('این پلاک قبلاً ثبت شده است.', { field: 'plate' });
    }

    const truck = await trucks.create(owner.id, plate, String(body.brand), String(body.modelYear));
    await recordAudit(db, {
      userId: ctx.userId!, action: 'CREATE_TRUCK', entityType: 'truck', entityId: truck.id, newValue: toResponse(truck),
    });
    sendSuccess(ctx.res, toResponse(truck), 201);
  }, [auth, ownerOnly]);

  router.get('/trucks/:id', async (ctx) => {
    const truck = await assertOwnsTruck(ctx.userId!, ctx.params.id);
    sendSuccess(ctx.res, toResponse(truck));
  }, [auth, ownerOnly]);

  router.put('/trucks/:id', async (ctx) => {
    const before = await assertOwnsTruck(ctx.userId!, ctx.params.id);
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    if (body.plate) validatePlate(String(body.plate));

    const updated = await trucks.update(ctx.params.id, {
      plate: body.plate ? String(body.plate) : undefined,
      brand: body.brand ? String(body.brand) : undefined,
      modelYear: body.modelYear ? String(body.modelYear) : undefined,
    });
    await recordAudit(db, {
      userId: ctx.userId!, action: 'UPDATE_TRUCK', entityType: 'truck', entityId: updated.id,
      oldValue: toResponse(before), newValue: toResponse(updated),
    });
    sendSuccess(ctx.res, toResponse(updated));
  }, [auth, ownerOnly]);

  router.delete('/trucks/:id', async (ctx) => {
    const truck = await assertOwnsTruck(ctx.userId!, ctx.params.id);
    await trucks.softDelete(truck.id);
    await recordAudit(db, { userId: ctx.userId!, action: 'DELETE_TRUCK', entityType: 'truck', entityId: truck.id });
    sendSuccess(ctx.res, { success: true });
  }, [auth, ownerOnly]);
}
