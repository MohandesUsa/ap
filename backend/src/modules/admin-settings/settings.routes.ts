import type { Router } from '../../http/router.ts';
import type { DbClient } from '../../db/DbClient.ts';
import type { AppConfig } from '../../config/env.ts';
import { SettingsRepository } from './settings.repository.ts';
import { MeliPayamakProvider } from './providers/SmsProvider.ts';
import { ZarinpalProvider } from './providers/PaymentProvider.ts';
import { maskSecret } from '../../security/secretCrypto.ts';
import { requireAdminAuth, requirePermission } from '../admin-auth/admin.middleware.ts';
import { sendSuccess } from '../../http/respond.ts';
import { requireFields } from '../../http/validate.ts';
import { AppError } from '../../errors/AppError.ts';
import { recordAudit } from '../audit/audit.repository.ts';

const FEATURE_FLAG_KEYS = ['ENABLE_SUBSCRIPTION', 'ENABLE_PAYMENT', 'ENABLE_SMS', 'ENABLE_NEW_DASHBOARD'] as const;

export function registerSettingsRoutes(router: Router, db: DbClient, config: AppConfig): void {
  const settings = new SettingsRepository(db, config.encryptionKey);
  const auth = requireAdminAuth(config.adminJwtSecret);

  async function maskedSetting(key: string) {
    const row = await settings.getRaw(key);
    if (!row || row.value === null) return null;
    return row.is_secret ? maskSecret(await settings.getPlain(key) as string) : row.value;
  }

  // --- SMS settings (Phase 14) ---

  router.get('/admin/settings/sms', async (ctx) => {
    sendSuccess(ctx.res, {
      provider: (await settings.getPlain('sms.provider')) ?? 'MeliPayamak',
      username: await maskedSetting('sms.username'),
      apiKey: await maskedSetting('sms.api_key'),
      sender: await maskedSetting('sms.sender'),
      template: await maskedSetting('sms.template'),
    });
  }, [auth, requirePermission(db, 'SMS_SETTINGS_VIEW')]);

  router.put('/admin/settings/sms', async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    const writes: Array<[string, string, boolean]> = [];
    if (body.username !== undefined) writes.push(['sms.username', String(body.username), true]);
    if (body.password !== undefined) writes.push(['sms.password', String(body.password), true]);
    if (body.apiKey !== undefined) writes.push(['sms.api_key', String(body.apiKey), true]);
    if (body.sender !== undefined) writes.push(['sms.sender', String(body.sender), false]);
    if (body.template !== undefined) writes.push(['sms.template', String(body.template), false]);
    for (const [key, value, isSecret] of writes) await settings.set(key, value, isSecret, ctx.adminId!);

    await recordAudit(db, {
      userId: null, adminId: ctx.adminId!, action: 'ADMIN_UPDATE_SMS_SETTINGS', entityType: 'settings', entityId: 'sms',
      newValue: { keysChanged: writes.map(([k]) => k) },
    });
    sendSuccess(ctx.res, { success: true });
  }, [auth, requirePermission(db, 'SMS_SETTINGS_EDIT')]);

  router.post('/admin/settings/sms/test-connection', async (ctx) => {
    const [username, password, sender] = await Promise.all([
      settings.getPlain('sms.username'), settings.getPlain('sms.password'), settings.getPlain('sms.sender'),
    ]);
    if (!username || !password) {
      sendSuccess(ctx.res, { connected: false, detail: 'اطلاعات ملی‌پیامک هنوز تنظیم نشده است.' });
      return;
    }
    const provider = new MeliPayamakProvider(username, password, sender ?? '');
    sendSuccess(ctx.res, await provider.testConnection());
  }, [auth, requirePermission(db, 'SMS_SETTINGS_VIEW')]);

  router.post('/admin/settings/sms/send-test', async (ctx) => {
    const body = requireFields(ctx.body, ['to']);
    const [username, password, sender] = await Promise.all([
      settings.getPlain('sms.username'), settings.getPlain('sms.password'), settings.getPlain('sms.sender'),
    ]);
    if (!username || !password) throw AppError.badRequest('اطلاعات ملی‌پیامک هنوز تنظیم نشده است.');
    const provider = new MeliPayamakProvider(username, password, sender ?? '');
    const result = await provider.sendSms(String(body.to), 'پیامک آزمایشی از پنل مدیریت TruckAccounting');
    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_SEND_TEST_SMS', entityType: 'settings', entityId: 'sms', newValue: { to: body.to, result } });
    sendSuccess(ctx.res, result);
  }, [auth, requirePermission(db, 'SMS_SETTINGS_EDIT')]);

  // --- Payment settings (Phase 15) ---

  router.get('/admin/settings/payment', async (ctx) => {
    sendSuccess(ctx.res, {
      provider: (await settings.getPlain('payment.provider')) ?? 'ZarinPal',
      merchantId: await maskedSetting('payment.merchant_id'),
      apiKey: await maskedSetting('payment.api_key'),
      sandbox: (await settings.getPlain('payment.sandbox')) === 'true',
    });
  }, [auth, requirePermission(db, 'PAYMENT_SETTINGS_VIEW')]);

  router.put('/admin/settings/payment', async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    const writes: Array<[string, string, boolean]> = [];
    if (body.merchantId !== undefined) writes.push(['payment.merchant_id', String(body.merchantId), true]);
    if (body.apiKey !== undefined) writes.push(['payment.api_key', String(body.apiKey), true]);
    if (body.sandbox !== undefined) writes.push(['payment.sandbox', String(!!body.sandbox), false]);
    for (const [key, value, isSecret] of writes) await settings.set(key, value, isSecret, ctx.adminId!);

    await recordAudit(db, {
      userId: null, adminId: ctx.adminId!, action: 'ADMIN_UPDATE_PAYMENT_SETTINGS', entityType: 'settings', entityId: 'payment',
      newValue: { keysChanged: writes.map(([k]) => k) },
    });
    sendSuccess(ctx.res, { success: true });
  }, [auth, requirePermission(db, 'PAYMENT_SETTINGS_EDIT')]);

  router.post('/admin/settings/payment/test-connection', async (ctx) => {
    const merchantId = await settings.getPlain('payment.merchant_id');
    if (!merchantId) {
      sendSuccess(ctx.res, { connected: false, detail: 'Merchant ID زرین‌پال هنوز تنظیم نشده است.' });
      return;
    }
    const sandbox = (await settings.getPlain('payment.sandbox')) === 'true';
    const provider = new ZarinpalProvider(merchantId, sandbox);
    sendSuccess(ctx.res, await provider.testConnection());
  }, [auth, requirePermission(db, 'PAYMENT_SETTINGS_VIEW')]);

  // --- System settings (Phase 17) ---

  const SYSTEM_KEYS = ['app_name', 'support_phone', 'support_email', 'terms_url', 'privacy_url', 'maintenance_mode', 'min_app_version', 'latest_app_version'];

  router.get('/admin/settings/system', async (ctx) => {
    const values: Record<string, string | null> = {};
    for (const key of SYSTEM_KEYS) values[key] = await settings.getPlain(`system.${key}`);
    sendSuccess(ctx.res, values);
  }, [auth, requirePermission(db, 'SYSTEM_SETTINGS_VIEW')]);

  router.put('/admin/settings/system', async (ctx) => {
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    const changed: string[] = [];
    for (const key of SYSTEM_KEYS) {
      if (body[key] !== undefined) {
        await settings.set(`system.${key}`, String(body[key]), false, ctx.adminId!);
        changed.push(key);
      }
    }
    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_UPDATE_SYSTEM_SETTINGS', entityType: 'settings', entityId: 'system', newValue: { keysChanged: changed } });
    sendSuccess(ctx.res, { success: true });
  }, [auth, requirePermission(db, 'SYSTEM_SETTINGS_EDIT')]);

  // Public — the User App reads these without admin auth (Phase 17: never hard-coded client-side).
  router.get('/system-settings', async (ctx) => {
    const values: Record<string, string | null> = {};
    for (const key of SYSTEM_KEYS) values[key] = await settings.getPlain(`system.${key}`);
    sendSuccess(ctx.res, values);
  });

  // --- Feature flags (Phase 18) ---

  router.get('/admin/settings/feature-flags', async (ctx) => {
    const flags: Record<string, boolean> = {};
    for (const key of FEATURE_FLAG_KEYS) flags[key] = (await settings.getPlain(`feature.${key}`)) === 'true';
    sendSuccess(ctx.res, flags);
  }, [auth, requirePermission(db, 'SYSTEM_SETTINGS_VIEW')]);

  router.put('/admin/settings/feature-flags/:key', async (ctx) => {
    const key = ctx.params.key;
    if (!(FEATURE_FLAG_KEYS as readonly string[]).includes(key)) throw AppError.notFound('Feature flag ناشناخته.');
    const body = (ctx.body ?? {}) as Record<string, unknown>;
    if (typeof body.enabled !== 'boolean') throw AppError.validation('enabled باید true یا false باشد.');
    await settings.set(`feature.${key}`, String(body.enabled), false, ctx.adminId!);
    await recordAudit(db, { userId: null, adminId: ctx.adminId!, action: 'ADMIN_UPDATE_FEATURE_FLAG', entityType: 'feature_flag', entityId: key, newValue: { enabled: body.enabled } });
    sendSuccess(ctx.res, { success: true });
  }, [auth, requirePermission(db, 'SYSTEM_SETTINGS_EDIT')]);

  // Public — the User App checks which features are live.
  router.get('/feature-flags', async (ctx) => {
    const flags: Record<string, boolean> = {};
    for (const key of FEATURE_FLAG_KEYS) flags[key] = (await settings.getPlain(`feature.${key}`)) === 'true';
    sendSuccess(ctx.res, flags);
  });
}
