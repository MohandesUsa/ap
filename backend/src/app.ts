import { Router } from './http/router.ts';
import { createApp } from './http/server.ts';
import { runMigrations } from './db/migrate.ts';
import type { DbClient } from './db/DbClient.ts';
import type { AppConfig } from './config/env.ts';

import { registerAuthRoutes } from './modules/auth/auth.routes.ts';
import { registerProfileRoutes } from './modules/profile/profile.routes.ts';
import { registerTruckRoutes } from './modules/trucks/truck.routes.ts';
import { registerInvitationRoutes } from './modules/invitations/invitation.routes.ts';
import { registerDashboardRoutes } from './modules/dashboard/dashboard.routes.ts';
import { registerTripRoutes } from './modules/trips/trip.routes.ts';
import { registerExpenseRoutes } from './modules/expenses/expense.routes.ts';
import { registerSettlementRoutes } from './modules/settlement/settlement.routes.ts';
import { sendSuccess } from './http/respond.ts';

export async function buildApp(db: DbClient, config: AppConfig) {
  await runMigrations(db);

  const router = new Router();

  router.get('/health', async (ctx) => {
    sendSuccess(ctx.res, { status: 'ok', timestamp: new Date().toISOString() });
  });

  registerAuthRoutes(router, db, config);
  registerProfileRoutes(router, db, config);
  registerTruckRoutes(router, db, config);
  registerInvitationRoutes(router, db, config);
  registerDashboardRoutes(router, db, config);
  registerTripRoutes(router, db, config);
  registerExpenseRoutes(router, db, config);
  registerSettlementRoutes(router, db, config);

  return createApp(router, config.authRateLimit);
}
