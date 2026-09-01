import type { Router } from '../../http/router.ts';
import type { AppConfig } from '../../config/env.ts';
import type { DbClient } from '../../db/DbClient.ts';
import { AuthService } from './auth.service.ts';
import { requireAuth } from '../../http/middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields, validatePhone, validateRole } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';

export function registerAuthRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const service = new AuthService(db, config);

  router.post('/auth/register', async (ctx) => {
    const body = requireFields(ctx.body, ['phoneNumber', 'password', 'fullName', 'role', 'deviceId']);
    const phoneNumber = String(body.phoneNumber);
    const role = validateRole(body.role);
    validatePhone(phoneNumber);

    const password = String(body.password);
    if (password.length < 6) {
      throw AppError.validation('رمز عبور باید حداقل ۶ کاراکتر باشد.', { field: 'password' });
    }

    const { tokens, user } = await service.register({
      phoneNumber,
      password,
      fullName: String(body.fullName),
      role,
      companyName: body.companyName ? String(body.companyName) : undefined,
      deviceId: String(body.deviceId),
      // NOTE: inviteCode (for driver registration) is intentionally NOT handled here — a
      // driver's invitation is accepted via POST /driver/invitations/{id}/accept as its own
      // explicit step (Phase 3 §23), not silently folded into registration. This keeps
      // "creating an account" and "accepting a specific owner's invitation" as separately
      // auditable actions.
    });

    sendSuccess(ctx.res, { status: 'authenticated', ...tokens, ...toAuthResponseUser(user) }, 201);
  });

  // Every login now requires a client-generated deviceId (a stable random id the client keeps
  // across sessions — e.g. crypto.randomUUID() cached in localStorage on web, an EncryptedShared
  // Preferences UUID on Android). This is what the single-trusted-device rule keys on.
  router.post('/auth/login', async (ctx) => {
    const body = requireFields(ctx.body, ['phoneNumber', 'password', 'deviceId']);
    const result = await service.login({
      phoneNumber: String(body.phoneNumber),
      password: String(body.password),
      deviceId: String(body.deviceId),
      deviceLabel: body.deviceLabel ? String(body.deviceLabel) : null,
    });
    if (result.status === 'pending_approval') {
      sendSuccess(ctx.res, { status: 'pending_approval', requestId: result.requestId }, 202);
      return;
    }
    sendSuccess(ctx.res, { status: 'authenticated', ...result.tokens, ...toAuthResponseUser(result.user) });
  });

  // --- Device approval (unauthenticated: an unguessable request id is the only gate, exactly
  // like this codebase's invitation-accept links) ---

  router.get('/auth/device-requests/:id', async (ctx) => {
    const result = await service.pollDeviceRequest(ctx.params.id);
    if (result.status === 'authenticated') {
      sendSuccess(ctx.res, { status: 'authenticated', ...result.tokens, ...toAuthResponseUser(result.user) });
    } else {
      sendSuccess(ctx.res, { status: result.status });
    }
  });

  // --- Device approval actions (authenticated: only the currently trusted device, which is
  // already logged in, can see and decide its own account's pending requests) ---

  router.get('/auth/device-requests', async (ctx) => {
    const requests = await service.listPendingDeviceRequests(ctx.userId!);
    sendSuccess(ctx.res, {
      requests: requests.map((r) => ({ id: r.id, deviceLabel: r.device_label, createdAt: r.created_at })),
    });
  }, [requireAuth(config.jwtSecret)]);

  router.post('/auth/device-requests/:id/approve', async (ctx) => {
    await service.approveDeviceRequest(ctx.userId!, ctx.params.id);
    sendSuccess(ctx.res, { success: true });
  }, [requireAuth(config.jwtSecret)]);

  router.post('/auth/device-requests/:id/deny', async (ctx) => {
    await service.denyDeviceRequest(ctx.userId!, ctx.params.id);
    sendSuccess(ctx.res, { success: true });
  }, [requireAuth(config.jwtSecret)]);

  router.post('/auth/refresh', async (ctx) => {
    const body = requireFields(ctx.body, ['refreshToken']);
    const tokens = await service.refresh(String(body.refreshToken));
    sendSuccess(ctx.res, tokens);
  });

  router.post('/auth/logout', async (ctx) => {
    const body = requireFields(ctx.body, ['refreshToken']);
    await service.logout(String(body.refreshToken));
    sendSuccess(ctx.res, { success: true });
  });

  router.get('/auth/me', async (ctx) => {
    const user = await service.getCurrentUser(ctx.userId!);
    sendSuccess(ctx.res, toAuthResponseUser(user));
  }, [requireAuth(config.jwtSecret)]);
}

function toAuthResponseUser(user: { id: string; role: string; fullName: string; phoneNumber: string }) {
  return {
    userId: user.id,
    role: user.role,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    // Subscription fields match Phase 2 addendum §11.10's contract; Phase 3 does not build the
    // real subscription/billing system, so every account is reported as being in an active trial
    // — Android's existing StartDestination/paywall logic already handles this shape correctly.
    subscriptionStatus: 'trial',
    trialDaysLeft: 30,
  };
}
