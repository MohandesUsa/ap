import { loadConfig } from './config/env.ts';
import { MySqlClient } from './db/MySqlClient.ts';
import type { DbClient } from './db/DbClient.ts';
import { buildApp } from './app.ts';
import { AdminRepository } from './modules/admin-auth/admin.repository.ts';
import { hashPassword } from './security/password.ts';
import { validatePhone } from './http/validate.ts';

/**
 * Optional, env-var-gated bootstrap for the first SUPER_ADMIN account — for platforms with no
 * shell access to run `scripts/create-admin.ts` manually (e.g. a free-tier PaaS like Render).
 * Does nothing unless all three BOOTSTRAP_ADMIN_* vars are set, and is a no-op (not an error) if
 * an admin with that phone number already exists — safe to leave set across every restart.
 */
async function bootstrapAdminIfConfigured(db: DbClient): Promise<void> {
  const phoneNumber = process.env.BOOTSTRAP_ADMIN_PHONE;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME;
  if (!phoneNumber || !password || !fullName) return;

  try {
    validatePhone(phoneNumber);
    const admins = new AdminRepository(db);
    if (await admins.findByPhone(phoneNumber)) {
      console.log(`Bootstrap admin ${phoneNumber} already exists — skipping.`);
      return;
    }
    const passwordHash = await hashPassword(password);
    const admin = await admins.create({ phoneNumber, passwordHash, fullName, role: 'SUPER_ADMIN' });
    console.log(`Bootstrap created SUPER_ADMIN "${admin.full_name}" (${admin.phone_number}).`);
  } catch (err) {
    console.error('BOOTSTRAP_ADMIN_* was set but admin creation failed:', err);
  }
}

async function main() {
  const config = loadConfig();
  const db = new MySqlClient(config.databaseUrl);

  const server = await buildApp(db, config);
  await bootstrapAdminIfConfigured(db);

  server.listen(config.port, () => {
    console.log(`TruckAccounting backend listening on port ${config.port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await db.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
