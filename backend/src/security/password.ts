import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;

/** Hashes a password with a random salt. Stored format: `<saltHex>:<hashHex>`. */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/** Verifies a password against a stored `<saltHex>:<hashHex>` value using a timing-safe compare. */
export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(':');
  if (!salt || !hashHex) return false;

  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, 'hex');

  if (derivedKey.length !== storedBuffer.length) return false;
  return timingSafeEqual(derivedKey, storedBuffer);
}
