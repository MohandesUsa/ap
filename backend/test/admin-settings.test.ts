import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { createAndLoginAdmin } from './helpers/adminFixtures.ts';

describe('Settings: SMS/Payment/System/Feature flags (Phases 14-18)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('SMS settings are masked on read and encrypted at rest', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09130000001', 'SUPER_ADMIN');
    await apiCall(app.baseUrl, 'PUT', '/admin/settings/sms', {
      token: accessToken, body: { username: 'meliuser', password: 'melipass', apiKey: 'SECRET1234567890', sender: '3000123' },
    });

    const view = await apiCall(app.baseUrl, 'GET', '/admin/settings/sms', { token: accessToken });
    assert.equal(view.status, 200);
    assert.ok((view.body as any).apiKey.includes('•'), 'apiKey must be masked, not returned raw');
    assert.ok((view.body as any).apiKey.endsWith('7890'), 'mask keeps a recognizable suffix');
    assert.ok(!(view.body as any).apiKey.includes('SECRET'), 'the real secret text must never appear in the response');

    // The raw DB row must be encrypted, not the plaintext we sent.
    const { rows } = await app.db.query<{ value: string }>('SELECT value FROM settings WHERE `key` = $1', ['sms.api_key']);
    assert.ok(!rows[0].value.includes('SECRET1234567890'), 'stored value must be encrypted, never plain text');
  });

  test('sms test-connection reports not-configured honestly (no fake success) when nothing is set', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09130000002', 'SUPER_ADMIN');
    const res = await apiCall(app.baseUrl, 'POST', '/admin/settings/sms/test-connection', { token: accessToken });
    assert.equal(res.status, 200);
    assert.equal((res.body as any).connected, false);
  });

  test('payment test-connection reports not-configured honestly when no merchant id is set', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09130000003', 'SUPER_ADMIN');
    const res = await apiCall(app.baseUrl, 'POST', '/admin/settings/payment/test-connection', { token: accessToken });
    assert.equal(res.status, 200);
    assert.equal((res.body as any).connected, false);
  });

  test('system settings round-trip and are readable publicly without admin auth', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09130000004', 'SUPER_ADMIN');
    await apiCall(app.baseUrl, 'PUT', '/admin/settings/system', {
      token: accessToken, body: { app_name: 'TruckAccounting', support_phone: '02100000000' },
    });
    const publicRead = await apiCall(app.baseUrl, 'GET', '/system-settings');
    assert.equal(publicRead.status, 200);
    assert.equal((publicRead.body as any).app_name, 'TruckAccounting');
  });

  test('feature flags round-trip and are readable publicly', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09130000005', 'SUPER_ADMIN');
    const before = await apiCall(app.baseUrl, 'GET', '/feature-flags');
    assert.equal((before.body as any).ENABLE_SMS, false);

    const set = await apiCall(app.baseUrl, 'PUT', '/admin/settings/feature-flags/ENABLE_SMS', { token: accessToken, body: { enabled: true } });
    assert.equal(set.status, 200);

    const after = await apiCall(app.baseUrl, 'GET', '/feature-flags');
    assert.equal((after.body as any).ENABLE_SMS, true);
  });

  test('an unknown feature flag key is rejected', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09130000006', 'SUPER_ADMIN');
    const res = await apiCall(app.baseUrl, 'PUT', '/admin/settings/feature-flags/NOT_A_REAL_FLAG', { token: accessToken, body: { enabled: true } });
    assert.equal(res.status, 404);
  });
});
