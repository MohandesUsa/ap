import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { InvitationRepository } from './invitation.repository.ts';
import { ProfileRepository } from '../profile/profile.repository.ts';
import { requireAuth, requireRole } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePhone } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { generateInviteCode, generateRandomToken } from '../../security/tokens.ts';
import { recordAudit } from '../audit/audit.repository.ts';

export function registerInvitationRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const invitations = new InvitationRepository(db);
  const profiles = new ProfileRepository(db);
  const auth = requireAuth(config.jwtSecret);

  // --- Owner side ---

  router.post('/invitations', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();

    const body = requireFields(ctx.body, ['driverPhone']);
    const driverPhone = String(body.driverPhone);
    validatePhone(driverPhone);

    const token = generateRandomToken(); // long, unguessable — the real accept credential
    const inviteCode = generateInviteCode(); // short, human-shown code (matches the prototype's "DRV-XXXXXX")
    const expiresAt = new Date(Date.now() + config.invitationTtlSeconds * 1000).toISOString();

    const invitation = await invitations.create({
      ownerId: owner.id,
      driverPhone,
      truckId: body.truckId ? String(body.truckId) : null,
      token: `${inviteCode}:${token}`, // code embedded so lookups can happen by the human-shown code too
      expiresAt,
    });

    await recordAudit(db, {
      userId: ctx.userId!, action: 'INVITE_DRIVER', entityType: 'invitation', entityId: invitation.id,
      newValue: { driverPhone, truckId: body.truckId ?? null },
    });

    sendSuccess(ctx.res, { id: invitation.id, inviteCode, expiresAt }, 201);
  }, [auth, requireRole('owner')]);

  router.get('/owner/invitations', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();
    const list = await invitations.listByOwner(owner.id);
    sendSuccess(ctx.res, {
      invitations: list.map((i) => ({
        id: i.id,
        driverPhone: i.driver_phone,
        status: i.status,
        expiresAt: i.expires_at,
      })),
    });
  }, [auth, requireRole('owner')]);

  // --- Driver side ---

  router.get('/driver/invitations', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();

    // A driver looks up invitations addressed to their own phone number — we resolve phone via
    // the user record rather than trusting a client-supplied phone (Phase 3 §31: server-side only).
    const user = await db.query<{ phone_number: string }>('SELECT phone_number FROM users WHERE id = $1', [ctx.userId]);
    const phone = user.rows[0]?.phone_number;
    if (!phone) throw AppError.notFound();

    const list = await invitations.listPendingForPhone(phone);
    sendSuccess(ctx.res, {
      invitations: list.map((i) => ({ id: i.id, expiresAt: i.expires_at, truckId: i.truck_id })),
    });
  }, [auth, requireRole('driver')]);

  router.post('/driver/invitations/:id/accept', async (ctx) => {
    const driver = await profiles.getDriverByUserId(ctx.userId!);
    if (!driver) throw AppError.forbidden();

    const invitation = await invitations.findById(ctx.params.id);
    if (!invitation) throw AppError.notFound('دعوت‌نامه یافت نشد.');

    // Critical authorization check (Phase 3 §35/§37): a driver must only ever be able to accept
    // an invitation addressed to their OWN phone number — without this, any authenticated driver
    // who obtains another invitation's id (e.g. a guessed/shared link) could accept it on someone
    // else's behalf. Resolved server-side from the session, never trusted from the request.
    const user = await db.query<{ phone_number: string }>('SELECT phone_number FROM users WHERE id = $1', [ctx.userId]);
    if (user.rows[0]?.phone_number !== invitation.driver_phone) {
      throw AppError.forbidden('این دعوت‌نامه برای شما نیست.');
    }

    try {
      const { driverTruckId } = await invitations.acceptInTransaction(invitation.id, ctx.userId!, driver.id);
      await recordAudit(db, {
        userId: ctx.userId!, action: 'ACCEPT_INVITATION', entityType: 'invitation', entityId: invitation.id,
        newValue: { driverTruckId },
      });
      sendSuccess(ctx.res, { success: true, driverTruckId });
    } catch (err) {
      if (err instanceof Error && err.message === 'ALREADY_USED') {
        throw AppError.conflict('این دعوت‌نامه قبلاً استفاده شده است.');
      }
      if (err instanceof Error && err.message === 'EXPIRED') {
        throw AppError.conflict('این دعوت‌نامه منقضی شده است.');
      }
      throw err;
    }
  }, [auth, requireRole('driver')]);

  router.delete('/owner/drivers/:driverTruckId', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();
    await invitations.disconnectDriver(ctx.params.driverTruckId);
    await recordAudit(db, {
      userId: ctx.userId!, action: 'DISCONNECT_DRIVER', entityType: 'driver_truck', entityId: ctx.params.driverTruckId,
    });
    sendSuccess(ctx.res, { success: true });
  }, [auth, requireRole('owner')]);

  router.get('/drivers', async (ctx) => {
    const owner = await profiles.getOwnerByUserId(ctx.userId!);
    if (!owner) throw AppError.forbidden();
    const list = await invitations.listDriversForOwner(owner.id);
    sendSuccess(ctx.res, {
      drivers: list.map((d) => ({
        id: d.driver_id, fullName: d.full_name, payType: d.pay_type, payValue: d.pay_value,
        truckId: d.truck_id, plate: d.plate,
      })),
    });
  }, [auth, requireRole('owner')]);
}
