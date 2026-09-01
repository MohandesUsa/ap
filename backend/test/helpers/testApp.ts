import type { DbClient } from '../../src/db/DbClient.ts';
import { SqliteClient } from '../../src/db/SqliteClient.ts';
import { buildApp } from '../../src/app.ts';
import type { AppConfig } from '../../src/config/env.ts';

export interface TestApp {
  baseUrl: string;
  db: DbClient;
  close: () => Promise<void>;
}

const testConfig: AppConfig = {
  port: 0, // ask the OS for a free port
  databaseUrl: ':memory:',
  jwtSecret: 'test-jwt-secret',
  jwtRefreshSecret: 'test-jwt-refresh-secret',
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 60 * 60 * 24 * 30,
  invitationTtlSeconds: 60 * 60 * 24 * 7,
  authRateLimit: { maxRequests: 100_000, windowMs: 60_000 },
};

/**
 * Every test in this suite runs against SQLite by default — zero setup, no server required
 * (see SqliteClient.ts). Set TEST_DB=mysql (and DATABASE_URL to a real, throwaway-safe MySQL/
 * MariaDB database — every table gets dropped between runs) to run this EXACT same suite against
 * real MySQL/MariaDB instead, exercising MySqlClient.ts's RETURNING emulation and placeholder
 * translation for real rather than relying on SQLite's native RETURNING support to mask a bug
 * that would only surface on MySQL. This is how Phase 3.1's migration itself was verified.
 */
async function createTestDb(): Promise<DbClient> {
  if (process.env.TEST_DB === 'mysql') {
    const { MySqlClient } = await import('../../src/db/MySqlClient.ts');
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('TEST_DB=mysql requires DATABASE_URL to point at a real MySQL/MariaDB database');
    const db = new MySqlClient(url);
    // Tests assume a pristine schema every run — drop everything left over from the last run
    // (foreign-key ordering doesn't matter with the checks disabled for the duration of the drop).
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    const { rows } = await db.query<{ name: string }>(
      `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()`,
    );
    for (const { name } of rows) await db.query(`DROP TABLE IF EXISTS \`${name}\``);
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    return db;
  }
  return new SqliteClient(':memory:');
}

export async function startTestApp(configOverrides: Partial<AppConfig> = {}): Promise<TestApp> {
  const db = await createTestDb();
  const config = { ...testConfig, ...configOverrides };
  if (process.env.TEST_DB === 'mysql') config.databaseUrl = process.env.DATABASE_URL!;
  const server = await buildApp(db, config);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    db,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.close();
    },
  };
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

export async function apiCall<T = unknown>(
  baseUrl: string,
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<ApiResponse<T>> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const body = (await res.json().catch(() => undefined)) as T;
  return { status: res.status, body };
}
