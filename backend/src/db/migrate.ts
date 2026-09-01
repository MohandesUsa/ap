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
  // version is a migration filename (e.g. "001_init.sql") — 255 chars is generous headroom, and
  // (unlike the plain TEXT this used to be) MySQL requires a declared length to put a PRIMARY KEY
  // on it at all; SQLite ignores the length and stores it identically either way.
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
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

    const rawSql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    // Strip `-- ...` line comments BEFORE splitting on `;` — a semicolon used as ordinary
    // punctuation in a comment's prose (this has happened twice already) would otherwise split
    // the file mid-statement and fail with a confusing "statement has been finalized"/syntax
    // error that points nowhere near the real cause. String literals are still not a concern
    // (migrations here never embed a semicolon inside one).
    const sql = rawSql
      .split('\n')
      .map((line) => {
        const commentIdx = line.indexOf('--');
        return commentIdx === -1 ? line : line.slice(0, commentIdx);
      })
      .join('\n');
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
