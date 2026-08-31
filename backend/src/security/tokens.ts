import { randomBytes, createHash } from 'node:crypto';

/** Cryptographically random, URL-safe token — used for both refresh tokens and invitation tokens. */
export function generateRandomToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Refresh/invitation tokens are hashed before storage (Phase 3 §22/§12) using plain SHA-256 —
 * unlike passwords, these tokens are already high-entropy random values (not human-chosen, not
 * guessable/brute-forceable), so a fast hash is appropriate here; scrypt's deliberate slowness
 * (see password.ts) exists specifically to resist guessing low-entropy human passwords, which
 * doesn't apply to a 256-bit random token.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Short human-typeable invite code shown in the UI (e.g. "DRV-849251"), separate from the
 *  long random token used as the actual accept-link/API credential. */
export function generateInviteCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `DRV-${digits}`;
}
