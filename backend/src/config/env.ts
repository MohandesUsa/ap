/**
 * Single place every config value is read from — Phase 3 §6: nothing sensitive lives in source
 * code, everything comes from the environment (see .env.example for the full list of variables
 * a deployment must set).
 */
export interface AppConfig {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  invitationTtlSeconds: number;
  authRateLimit: { maxRequests: number; windowMs: number };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name} (see .env.example)`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900), // 15 minutes
    refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 30), // 30 days
    invitationTtlSeconds: Number(process.env.INVITATION_TTL_SECONDS ?? 60 * 60 * 24 * 7), // 7 days
    authRateLimit: {
      maxRequests: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
      windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
    },
  };
}
