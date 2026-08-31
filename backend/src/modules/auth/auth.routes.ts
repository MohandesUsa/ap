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
    const body = requireFields(ctx.body, ['phoneNumber', 'password', 'fullName', 'role']);
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
      // NOTE: inviteCode (for driver registration) is intentionally NOT handled here — a
      // driver's invitation is accepted via POST /driver/invitations/{id}/accept as its own
      // explicit step (Phase 3 §23), not silently folded into registration. This keeps
      // "creating an account" and "accepting a specific owner's invitation" as separately
      // auditable actions.
    });

    sendSuccess(ctx.res, { ...tokens, ...toAuthResponseUser(user) }, 201);
  });

  router.post('/auth/login', async (ctx) => {
    const body = requireFields(ctx.body, ['phoneNumber', 'password']);
    const { tokens, user } = await service.login({
      phoneNumber: String(body.phoneNumber),
      password: String(body.password),
    });
    sendSuccess(ctx.res, { ...tokens, ...toAuthResponseUser(user) });
  });

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
