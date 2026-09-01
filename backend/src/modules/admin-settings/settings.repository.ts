import type { DbClient } from '../../db/DbClient.ts';
import { encryptSecret, decryptSecret } from '../../security/secretCrypto.ts';

export interface SettingRow {
  key: string;
  value: string | null;
  is_secret: number;
  updated_at: string;
  updated_by: string | null;
}

/** Generic key/value settings store — see migrations/002_admin.sql for the namespacing
 *  convention (sms.*, payment.*, system.*, feature.*). Secret values are encrypted at rest
 *  (Phase 25) and this repository is the ONLY place that ever decrypts one. */
export class SettingsRepository {
  private readonly db: DbClient;
  private readonly encryptionKey: string;

  constructor(db: DbClient, encryptionKey: string) {
    this.db = db;
    this.encryptionKey = encryptionKey;
  }

  async getRaw(key: string): Promise<SettingRow | null> {
    const { rows } = await this.db.query<SettingRow>('SELECT * FROM settings WHERE `key` = $1', [key]);
    return rows[0] ?? null;
  }

  /** Decrypted value if the row is a secret, plain value otherwise. Never returned over the API —
   *  for internal use only (e.g. actually calling the SMS/payment provider). */
  async getPlain(key: string): Promise<string | null> {
    const row = await this.getRaw(key);
    if (!row || row.value === null) return null;
    return row.is_secret ? decryptSecret(row.value, this.encryptionKey) : row.value;
  }

  async listByPrefix(prefix: string): Promise<SettingRow[]> {
    const { rows } = await this.db.query<SettingRow>('SELECT * FROM settings WHERE `key` LIKE $1 ORDER BY `key`', [`${prefix}%`]);
    return rows;
  }

  async set(key: string, value: string, isSecret: boolean, updatedBy: string): Promise<void> {
    const storedValue = isSecret ? encryptSecret(value, this.encryptionKey) : value;
    const existing = await this.getRaw(key);
    if (existing) {
      await this.db.query('UPDATE settings SET value = $1, is_secret = $2, updated_at = $3, updated_by = $4 WHERE `key` = $5', [
        storedValue, isSecret ? 1 : 0, new Date().toISOString(), updatedBy, key,
      ]);
    } else {
      await this.db.query('INSERT INTO settings (`key`, value, is_secret, updated_at, updated_by) VALUES ($1, $2, $3, $4, $5)', [
        key, storedValue, isSecret ? 1 : 0, new Date().toISOString(), updatedBy,
      ]);
    }
  }
}
