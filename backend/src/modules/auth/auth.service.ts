import { AuthRepository } from './auth.repository.ts';
import type { DeviceLoginRequestRow } from './auth.repository.ts';
import { hashPassword, verifyPassword } from '../../security/password.ts';
import { signJwt, verifyJwt } from '../../security/jwt.ts';
import { hashToken } from '../../security/tokens.ts';
import { AppError } from '../../errors/AppError.ts';
import type { AppConfig } from '../../config/env.ts';
import { recordAudit } from '../audit/audit.repository.ts';
import type { DbClient } from '../../db/DbClient.ts';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionUser {
  id: string;
  role: 'owner' | 'driver';
  fullName: string;
  phoneNumber: string;
}

export type LoginResult =
  | { status: 'authenticated'; tokens: AuthTokens; user: SessionUser }
  | { status: 'pending_approval'; requestId: string };

/** A pending device-approval request expires after this long — an abandoned login attempt on a
 *  new device shouldn't stay approvable forever, and the trusted device's UI shouldn't need to
 *  track requests indefinitely. */
const DEVICE_REQUEST_TTL_MS = 5 * 60 * 1000;

export class AuthService {
  private readonly repo: AuthRepository;
  private readonly db: DbClient;
  private readonly config: AppConfig;

  constructor(db: DbClient, config: AppConfig) {
    this.db = db;
    this.config = config;
    this.repo = new AuthRepository(db);
  }

  async register(params: {
    phoneNumber: string;
    password: string;
    fullName: string;
    role: 'owner' | 'driver';
    companyName?: string;
    deviceId: string;
  }): Promise<{ tokens: AuthTokens; user: SessionUser }> {
    const existing = await this.repo.findUserByPhone(params.phoneNumber);
    if (existing) {
      throw AppError.conflict('این شماره موبایل قبلاً ثبت‌نام کرده است.', { field: 'phoneNumber' });
    }

    const passwordHash = await hashPassword(params.password);
    const { user } = await this.repo.createUserWithProfile({
      phoneNumber: params.phoneNumber,
      passwordHash,
      role: params.role,
      fullName: params.fullName,
      companyName: params.companyName,
      deviceId: params.deviceId,
    });

    const tokens = await this.issueTokens(user.id, params.role);
    await recordAudit(this.db, { userId: user.id, action: 'REGISTER', entityType: 'user', entityId: user.id });

    return {
      tokens,
      user: { id: user.id, role: params.role, fullName: params.fullName, phoneNumber: params.phoneNumber },
    };
  }

  /** Enforces the "one trusted device" rule: a login from the account's current
   *  `trusted_device_id` (or from any device when none is set yet — e.g. an account created
   *  before this feature existed) succeeds immediately, exactly like before. A login from any
   *  OTHER device does NOT get tokens — it opens a pending device_login_requests row that only
   *  the currently trusted device can approve or deny (see approveDeviceRequest/denyDeviceRequest
   *  below), and returns { status: 'pending_approval' } instead. */
  async login(params: { phoneNumber: string; password: string; deviceId: string; deviceLabel?: string | null }): Promise<LoginResult> {
    const user = await this.repo.findUserByPhone(params.phoneNumber);
    // Deliberately identical error for "no such user" and "wrong password" — distinguishing them
    // would let an attacker enumerate which phone numbers are registered.
    const invalidCredentialsError = AppError.badRequest('شماره موبایل یا رمز عبور اشتباه است.');

    if (!user) throw invalidCredentialsError;
    if (!user.is_active) throw AppError.forbidden('این حساب غیرفعال شده است.');

    const passwordOk = await verifyPassword(params.password, user.password_hash);
    if (!passwordOk) throw invalidCredentialsError;

    if (user.trusted_device_id && user.trusted_device_id !== params.deviceId) {
      const request = await this.repo.createDeviceLoginRequest({
        userId: user.id, deviceId: params.deviceId, deviceLabel: params.deviceLabel ?? null,
      });
      await recordAudit(this.db, {
        userId: user.id, action: 'LOGIN_DEVICE_APPROVAL_REQUESTED', entityType: 'device_login_request', entityId: request.id,
        newValue: { deviceLabel: params.deviceLabel ?? null },
      });
      return { status: 'pending_approval', requestId: request.id };
    }

    if (!user.trusted_device_id) {
      await this.repo.setTrustedDevice(user.id, params.deviceId);
    }

    const fullName = await this.getFullName(user.id, user.role);
    const tokens = await this.issueTokens(user.id, user.role);
    await recordAudit(this.db, { userId: user.id, action: 'LOGIN', entityType: 'user', entityId: user.id });

    return {
      status: 'authenticated',
      tokens,
      user: { id: user.id, role: user.role, fullName, phoneNumber: user.phone_number },
    };
  }

  /** Polled by the NEW device with the request id it got back from login() — this endpoint needs
   *  no auth (the new device has no token yet), so the request id itself (an unguessable UUID) is
   *  the only thing gating it, same pattern as this codebase's invitation-accept links. Tokens are
   *  only ever minted here, at the moment of a successful poll after approval — never stored on
   *  the request row itself — and the row is immediately marked 'consumed' so a repeated poll
   *  (or a leaked request id) can't mint a second set of tokens for the same approval. */
  async pollDeviceRequest(requestId: string): Promise<
    | { status: 'pending' | 'denied' | 'expired' }
    | { status: 'authenticated'; tokens: AuthTokens; user: SessionUser }
  > {
    const request = await this.repo.findDeviceLoginRequestById(requestId);
    if (!request) throw AppError.notFound('درخواست ورود یافت نشد.');

    if (request.status === 'pending' && Date.now() - new Date(request.created_at).getTime() > DEVICE_REQUEST_TTL_MS) {
      await this.repo.setDeviceLoginRequestStatus(request.id, 'expired');
      return { status: 'expired' };
    }
    if (request.status === 'pending') return { status: 'pending' };
    if (request.status === 'denied' || request.status === 'expired') return { status: request.status };
    if (request.status === 'consumed') return { status: 'expired' };

    // status === 'approved'
    const user = await this.repo.findUserById(request.user_id);
    if (!user) throw AppError.notFound('کاربر یافت نشد.');
    const fullName = await this.getFullName(user.id, user.role);
    const tokens = await this.issueTokens(user.id, user.role);
    await this.repo.setDeviceLoginRequestStatus(request.id, 'consumed');
    await recordAudit(this.db, { userId: user.id, action: 'LOGIN', entityType: 'user', entityId: user.id });

    return {
      status: 'authenticated',
      tokens,
      user: { id: user.id, role: user.role, fullName, phoneNumber: user.phone_number },
    };
  }

  /** Polled by the CURRENTLY TRUSTED device (normal access-token auth) to discover a pending
   *  approval request against its own account. */
  async listPendingDeviceRequests(userId: string): Promise<DeviceLoginRequestRow[]> {
    return this.repo.listPendingDeviceLoginRequests(userId);
  }

  async approveDeviceRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.repo.findDeviceLoginRequestById(requestId);
    if (!request || request.user_id !== userId) throw AppError.notFound('درخواست ورود یافت نشد.');
    if (request.status !== 'pending') throw AppError.conflict('این درخواست دیگر در انتظار تأیید نیست.');

    await this.repo.setDeviceLoginRequestStatus(request.id, 'approved');
    // Trust transfers to the new device — the old device would itself need approval to log back
    // in later, exactly the same as any other "different device" attempt.
    await this.repo.setTrustedDevice(userId, request.device_id);
    await recordAudit(this.db, { userId, action: 'LOGIN_DEVICE_APPROVED', entityType: 'device_login_request', entityId: request.id });
  }

  async denyDeviceRequest(userId: string, requestId: string): Promise<void> {
    const request = await this.repo.findDeviceLoginRequestById(requestId);
    if (!request || request.user_id !== userId) throw AppError.notFound('درخواست ورود یافت نشد.');
    if (request.status !== 'pending') throw AppError.conflict('این درخواست دیگر در انتظار تأیید نیست.');

    await this.repo.setDeviceLoginRequestStatus(request.id, 'denied');
    await recordAudit(this.db, { userId, action: 'LOGIN_DEVICE_DENIED', entityType: 'device_login_request', entityId: request.id });
  }

  /** Implements refresh WITH rotation (Phase 3 §12): the old refresh token is revoked and a new
   *  one issued on every use — if a stolen refresh token is ever replayed after the legitimate
   *  client has already rotated it, the stolen one is now revoked and the reuse fails, which is
   *  itself a signal (a production system would alert on this; noted for a later phase). */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const result = verifyJwt(refreshToken, this.config.jwtRefreshSecret);
    if (!result.valid) throw AppError.unauthorized('توکن تازه‌سازی نامعتبر یا منقضی است.');

    const tokenHash = hashToken(refreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);
    if (!stored || stored.revoked_at) {
      throw AppError.unauthorized('توکن تازه‌سازی دیگر معتبر نیست.');
    }

    const user = await this.repo.findUserById(stored.user_id);
    if (!user || !user.is_active) throw AppError.unauthorized('حساب کاربری در دسترس نیست.');

    const newTokens = await this.issueTokens(user.id, user.role);
    const newRefreshHash = hashToken(newTokens.refreshToken);
    // issueTokens already stored the new token row; look it up to link rotation.
    const newStored = await this.repo.findRefreshTokenByHash(newRefreshHash);
    if (newStored) await this.repo.rotateRefreshToken(stored.id, newStored.id);

    return newTokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);
    if (stored) {
      await this.repo.revokeAllRefreshTokensForUser(stored.user_id);
      await recordAudit(this.db, { userId: stored.user_id, action: 'LOGOUT', entityType: 'user', entityId: stored.user_id });
    }
  }

  async getCurrentUser(userId: string): Promise<SessionUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw AppError.notFound('کاربر یافت نشد.');
    const fullName = await this.getFullName(user.id, user.role);
    return { id: user.id, role: user.role, fullName, phoneNumber: user.phone_number };
  }

  private async getFullName(userId: string, role: 'owner' | 'driver'): Promise<string> {
    if (role === 'owner') {
      const owner = await this.repo.findOwnerByUserId(userId);
      return owner?.full_name ?? '';
    }
    const driver = await this.repo.findDriverByUserId(userId);
    return driver?.full_name ?? '';
  }

  private async issueTokens(userId: string, role: 'owner' | 'driver'): Promise<AuthTokens> {
    const accessToken = signJwt({ sub: userId, role }, this.config.jwtSecret, this.config.accessTokenTtlSeconds);
    const refreshToken = signJwt({ sub: userId, role }, this.config.jwtRefreshSecret, this.config.refreshTokenTtlSeconds);

    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlSeconds * 1000).toISOString();
    await this.repo.storeRefreshToken(userId, hashToken(refreshToken), expiresAt);

    return { accessToken, refreshToken };
  }
}
