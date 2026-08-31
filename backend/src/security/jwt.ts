import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export interface JwtPayload {
  sub: string; // user id
  role: 'owner' | 'driver';
  iat: number;
  exp: number;
  [key: string]: unknown;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Signs a standard three-part HS256 JWT: base64url(header).base64url(payload).signature.
 * This is a from-scratch implementation of the same algorithm the `jsonwebtoken` npm package
 * uses for HS256 — chosen so the backend has zero non-`pg` runtime dependencies (see PgClient.ts
 * doc comment). `expiresInSeconds` is required explicitly at every call site rather than
 * defaulted, so a caller can never forget to set an expiry.
 */
export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  // `jti` (JWT ID) guarantees two tokens are never byte-identical even if issued for the same
  // user/role within the same second, which otherwise happens easily (e.g. two refresh calls in
  // a tight test loop) and would violate refresh_tokens.token_hash's UNIQUE constraint since an
  // identical token hashes to an identical value.
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds, jti: randomUUID() };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(fullPayload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export type VerifyResult =
  | { valid: true; payload: JwtPayload }
  | { valid: false; reason: 'malformed' | 'bad_signature' | 'expired' };

/** Verifies signature AND expiry. Never throws — callers branch on `.valid`. */
export function verifyJwt(token: string, secret: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'malformed' };
  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, secret);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: 'bad_signature' };
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, reason: 'malformed' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return { valid: false, reason: 'expired' };

  return { valid: true, payload };
}
