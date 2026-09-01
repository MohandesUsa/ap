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
  // --- Admin App (Phase A) ---
  // A DIFFERENT secret from jwtSecret/jwtRefreshSecret — not just a different TTL — is the actual
  // security boundary that makes a normal Owner/Driver access token unusable against any /admin/*
  // route: verifyJwt(userToken, adminJwtSecret) fails signature verification outright, before any
  // role check even runs. See admin-auth/admin.middleware.ts.
  adminJwtSecret: string;
  adminAccessTokenTtlSeconds: number;
  /** 32-byte (64 hex char) key for AES-256-GCM encryption of secrets at rest (SMS/payment
   *  provider API keys) — see security/secretCrypto.ts. Never reused for JWT signing. */
  encryptionKey: string;
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
    adminJwtSecret: requireEnv('ADMIN_JWT_SECRET'),
    adminAccessTokenTtlSeconds: Number(process.env.ADMIN_ACCESS_TOKEN_TTL_SECONDS ?? 60 * 60 * 8), // 8 hours
    encryptionKey: requireEnv('ENCRYPTION_KEY'),
  };
}
