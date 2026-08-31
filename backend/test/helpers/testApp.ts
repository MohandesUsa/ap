import { SqliteClient } from '../../src/db/SqliteClient.ts';
import { buildApp } from '../../src/app.ts';
import type { AppConfig } from '../../src/config/env.ts';

export interface TestApp {
  baseUrl: string;
  db: SqliteClient;
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

export async function startTestApp(configOverrides: Partial<AppConfig> = {}): Promise<TestApp> {
  const db = new SqliteClient(':memory:');
  const server = await buildApp(db, { ...testConfig, ...configOverrides });

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
