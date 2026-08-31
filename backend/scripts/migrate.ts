import { loadConfig } from '../src/config/env.ts';
import { PgClient } from '../src/db/PgClient.ts';
import { runMigrations } from '../src/db/migrate.ts';

async function main() {
  const config = loadConfig();
  const db = new PgClient(config.databaseUrl);
  try {
    const applied = await runMigrations(db);
    if (applied.length === 0) {
      console.log('Database is already up to date — no migrations to apply.');
    } else {
      console.log('Applied migrations:', applied.join(', '));
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
