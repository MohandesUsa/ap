import { AuthRepository } from './auth.repository.ts';
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
    });

    const tokens = await this.issueTokens(user.id, params.role);
    await recordAudit(this.db, { userId: user.id, action: 'REGISTER', entityType: 'user', entityId: user.id });

    return {
      tokens,
      user: { id: user.id, role: params.role, fullName: params.fullName, phoneNumber: params.phoneNumber },
    };
  }

  async login(params: { phoneNumber: string; password: string }): Promise<{ tokens: AuthTokens; user: SessionUser }> {
    const user = await this.repo.findUserByPhone(params.phoneNumber);
    // Deliberately identical error for "no such user" and "wrong password" — distinguishing them
    // would let an attacker enumerate which phone numbers are registered.
    const invalidCredentialsError = AppError.badRequest('شماره موبایل یا رمز عبور اشتباه است.');

    if (!user) throw invalidCredentialsError;
    if (!user.is_active) throw AppError.forbidden('این حساب غیرفعال شده است.');

    const passwordOk = await verifyPassword(params.password, user.password_hash);
    if (!passwordOk) throw invalidCredentialsError;

    const fullName = await this.getFullName(user.id, user.role);
    const tokens = await this.issueTokens(user.id, user.role);
    await recordAudit(this.db, { userId: user.id, action: 'LOGIN', entityType: 'user', entityId: user.id });

    return {
      tokens,
      user: { id: user.id, role: user.role, fullName, phoneNumber: user.phone_number },
    };
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
