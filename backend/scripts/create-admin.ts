/**
 * Operator-run bootstrap for the very first admin account — there is deliberately no public API
 * endpoint for this (see admin-auth.routes.ts's doc comment on why). Every admin after the first
 * is created through POST /admin/admins by an existing SUPER_ADMIN.
 *
 * Usage:
 *   node scripts/create-admin.ts <phoneNumber> <password> <fullName> [role]
 *   role defaults to SUPER_ADMIN; pass ADMIN/SUPPORT/ACCOUNTANT to create a lesser role instead
 *   (e.g. for testing permission boundaries without a second SUPER_ADMIN).
 */
import { loadConfig } from '../src/config/env.ts';
import { MySqlClient } from '../src/db/MySqlClient.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { AdminRepository } from '../src/modules/admin-auth/admin.repository.ts';
import { hashPassword } from '../src/security/password.ts';
import { validatePhone } from '../src/http/validate.ts';
import type { AdminRole } from '../src/modules/admin-auth/permissions.ts';

async function main() {
  const [phoneNumber, password, fullName, role = 'SUPER_ADMIN'] = process.argv.slice(2);
  if (!phoneNumber || !password || !fullName) {
    console.error('Usage: node scripts/create-admin.ts <phoneNumber> <password> <fullName> [role]');
    process.exit(1);
  }
  validatePhone(phoneNumber);
  if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'ACCOUNTANT'].includes(role)) {
    console.error(`Invalid role: ${role}`);
    process.exit(1);
  }

  const config = loadConfig();
  const db = new MySqlClient(config.databaseUrl);
  try {
    await runMigrations(db);
    const admins = new AdminRepository(db);
    const existing = await admins.findByPhone(phoneNumber);
    if (existing) {
      console.error(`An admin with phone ${phoneNumber} already exists (id: ${existing.id}).`);
      process.exit(1);
    }
    const passwordHash = await hashPassword(password);
    const admin = await admins.create({ phoneNumber, passwordHash, fullName, role: role as AdminRole });
    console.log(`Created ${admin.role} "${admin.full_name}" (${admin.phone_number}), id: ${admin.id}`);
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
