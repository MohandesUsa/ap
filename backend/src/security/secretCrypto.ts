import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM encryption for secrets stored at rest (SMS/payment provider API keys — Phase 25:
 * "Secret را در Database به صورت Plain Text نگهداری نکن"). Separate from JWT signing (jwt.ts) and
 * password hashing (password.ts) — a different key for a different purpose, so compromising one
 * never compromises the others.
 *
 * Stored format: `<ivHex>:<authTagHex>:<ciphertextHex>` — everything needed to decrypt, nothing
 * that helps an attacker without the key itself.
 */
const ALGORITHM = 'aes-256-gcm';

function keyBuffer(encryptionKeyHex: string): Buffer {
  const buf = Buffer.from(encryptionKeyHex, 'hex');
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters) for AES-256-GCM.');
  }
  return buf;
}

export function encryptSecret(plainText: string, encryptionKeyHex: string): string {
  const key = keyBuffer(encryptionKeyHex);
  const iv = randomBytes(12); // 96-bit nonce, the GCM-recommended size
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

export function decryptSecret(stored: string, encryptionKeyHex: string): string {
  const key = keyBuffer(encryptionKeyHex);
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Malformed encrypted secret (expected ivHex:authTagHex:ciphertextHex).');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf-8');
}

/** Never return a secret's real value over the API — only enough to confirm which one is set. */
export function maskSecret(plainText: string): string {
  if (plainText.length <= 4) return '••••';
  return '•'.repeat(Math.max(plainText.length - 4, 4)) + plainText.slice(-4);
}
