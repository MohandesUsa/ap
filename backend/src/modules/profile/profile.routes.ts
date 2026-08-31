import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { ProfileRepository } from './profile.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { AppError } from '../../errors/AppError.ts';

export function registerProfileRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const repo = new ProfileRepository(db);
  const auth = requireAuth(config.jwtSecret);

  router.get('/owners/me', async (ctx) => {
    const owner = await repo.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.notFound('پروفایل صاحب کامیون یافت نشد.');
    sendSuccess(ctx.res, {
      id: owner.id,
      fullName: owner.full_name,
      companyName: owner.company_name,
    });
  }, [auth, requireRole('owner')]);

  router.put('/owners/me', async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    const updated = await repo.updateOwner(ctx.userId!, {
      fullName: body.fullName ? String(body.fullName) : undefined,
      companyName: body.companyName !== undefined ? String(body.companyName) : undefined,
    });
    sendSuccess(ctx.res, { id: updated.id, fullName: updated.full_name, companyName: updated.company_name });
  }, [auth, requireRole('owner')]);

  router.get('/drivers/me', async (ctx) => {
    const driver = await repo.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.notFound('پروفایل راننده یافت نشد.');
    const truck = await repo.getDriverCurrentTruck(driver.id);

    sendSuccess(ctx.res, {
      id: driver.id,
      fullName: driver.full_name,
      payType: driver.pay_type,
      payValue: driver.pay_value,
      currentTruck: truck
        ? {
            id: truck.truck_id,
            plate: truck.plate,
            brand: truck.brand,
            modelYear: truck.model_year,
            ownerFullName: truck.owner_full_name,
            ownerCompanyName: truck.owner_company_name,
          }
        : null,
    });
  }, [auth, requireRole('driver')]);

  router.put('/drivers/me', async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    const updated = await repo.updateDriver(ctx.userId!, {
      fullName: body.fullName ? String(body.fullName) : undefined,
    });
    sendSuccess(ctx.res, { id: updated.id, fullName: updated.full_name });
  }, [auth, requireRole('driver')]);
}
