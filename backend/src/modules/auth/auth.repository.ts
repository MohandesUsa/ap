import { randomUUID } from 'node:crypto';
import type { DbClient } from '../../db/DbClient.ts';

export interface UserRow {
  id: string;
  phone_number: string;
  password_hash: string;
  role: 'owner' | 'driver';
  phone_verified: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  trusted_device_id: string | null;
}

export interface DeviceLoginRequestRow {
  id: string;
  user_id: string;
  device_id: string;
  device_label: string | null;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'consumed';
  created_at: string;
  decided_at: string | null;
}

export interface OwnerRow {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string | null;
}

export interface DriverRow {
  id: string;
  user_id: string;
  full_name: string;
  license_number: string | null;
  pay_type: 'percent' | 'salary';
  pay_value: number;
}

export class AuthRepository {
  private readonly db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  async findUserByPhone(phone: string): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>('SELECT * FROM users WHERE phone_number = $1', [phone]);
    return rows[0] ?? null;
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const { rows } = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findOwnerByUserId(userId: string): Promise<OwnerRow | null> {
    const { rows } = await this.db.query<OwnerRow>('SELECT * FROM owners WHERE user_id = $1', [userId]);
    return rows[0] ?? null;
  }

  async findDriverByUserId(userId: string): Promise<DriverRow | null> {
    const { rows } = await this.db.query<DriverRow>('SELECT * FROM drivers WHERE user_id = $1', [userId]);
    return rows[0] ?? null;
  }

  /** Creates the user + role-profile row in a single transaction — either both succeed or
   *  neither does (Phase 1 §9's registration flow: Create User -> Create Owner/Driver Profile). */
  async createUserWithProfile(params: {
    phoneNumber: string;
    passwordHash: string;
    role: 'owner' | 'driver';
    fullName: string;
    companyName?: string | null;
    deviceId: string;
  }): Promise<{ user: UserRow; profileId: string }> {
    return this.db.transaction(async (tx) => {
      const now = new Date().toISOString();
      const userId = randomUUID();

      // The registering device is trusted immediately — it's the first device this account has
      // ever had, so there is nothing else for it to be approved against.
      const { rows: userRows } = await tx.query<UserRow>(
        `INSERT INTO users (id, phone_number, password_hash, role, phone_verified, is_active, trusted_device_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 0, 1, $5, $6, $7)
         RETURNING *`,
        [userId, params.phoneNumber, params.passwordHash, params.role, params.deviceId, now, now],
      );
      const user = userRows[0];

      const profileId = randomUUID();
      if (params.role === 'owner') {
        await tx.query(
          `INSERT INTO owners (id, user_id, full_name, company_name, created_at) VALUES ($1, $2, $3, $4, $5)`,
          [profileId, userId, params.fullName, params.companyName ?? null, now],
        );
      } else {
        await tx.query(
          `INSERT INTO drivers (id, user_id, full_name, license_number, pay_type, pay_value, created_at)
           VALUES ($1, $2, $3, NULL, 'percent', 20, $4)`,
          [profileId, userId, params.fullName, now],
        );
      }

      return { user, profileId };
    });
  }

  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: string): Promise<string> {
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, tokenHash, expiresAt, new Date().toISOString()],
    );
    return id;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<
    { id: string; user_id: string; expires_at: string; revoked_at: string | null } | null
  > {
    const { rows } = await this.db.query<{ id: string; user_id: string; expires_at: string; revoked_at: string | null }>(
      'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash],
    );
    return rows[0] ?? null;
  }

  /** Rotation (Phase 3 §12): revokes the old token and links it to its replacement, rather than
   *  just deleting it — keeps an audit trail of the rotation chain. */
  async rotateRefreshToken(oldTokenId: string, newTokenId: string): Promise<void> {
    await this.db.query(
      'UPDATE refresh_tokens SET revoked_at = $1, replaced_by_token_id = $2 WHERE id = $3',
      [new Date().toISOString(), newTokenId, oldTokenId],
    );
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL',
      [new Date().toISOString(), userId],
    );
  }

  async setTrustedDevice(userId: string, deviceId: string): Promise<void> {
    await this.db.query('UPDATE users SET trusted_device_id = $1, updated_at = $2 WHERE id = $3', [
      deviceId, new Date().toISOString(), userId,
    ]);
  }

  async createDeviceLoginRequest(params: { userId: string; deviceId: string; deviceLabel: string | null }): Promise<DeviceLoginRequestRow> {
    const id = randomUUID();
    const { rows } = await this.db.query<DeviceLoginRequestRow>(
      `INSERT INTO device_login_requests (id, user_id, device_id, device_label, status, created_at, decided_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NULL) RETURNING *`,
      [id, params.userId, params.deviceId, params.deviceLabel, new Date().toISOString()],
    );
    return rows[0];
  }

  async findDeviceLoginRequestById(id: string): Promise<DeviceLoginRequestRow | null> {
    const { rows } = await this.db.query<DeviceLoginRequestRow>('SELECT * FROM device_login_requests WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async listPendingDeviceLoginRequests(userId: string): Promise<DeviceLoginRequestRow[]> {
    const { rows } = await this.db.query<DeviceLoginRequestRow>(
      `SELECT * FROM device_login_requests WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  }

  async setDeviceLoginRequestStatus(id: string, status: DeviceLoginRequestRow['status']): Promise<DeviceLoginRequestRow> {
    const { rows } = await this.db.query<DeviceLoginRequestRow>(
      `UPDATE device_login_requests SET status = $1, decided_at = $2 WHERE id = $3 RETURNING *`,
      [status, new Date().toISOString(), id],
    );
    return rows[0];
  }
}
