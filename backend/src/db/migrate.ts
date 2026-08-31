import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { DbClient } from './DbClient.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', '..', 'migrations');

/**
 * Applies every `.sql` file in /migrations that hasn't run yet, in filename order (hence the
 * `001_`, `002_`, ... prefix convention — Phase 3 §39: migrations must be ordered, version
 * controlled, and safe to run against a fresh database).
 */
export async function runMigrations(db: DbClient): Promise<string[]> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    (await db.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map((r) => r.version),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    // Split on statement boundaries: semicolon at end of line, ignoring semicolons inside
    // string literals is not a concern here since our migrations never embed one.
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await db.query(statement);
    }

    await db.query('INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)', [
      file,
      new Date().toISOString(),
    ]);
    newlyApplied.push(file);
  }

  return newlyApplied;
}
