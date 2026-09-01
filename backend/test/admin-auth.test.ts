import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { createAndLoginAdmin } from './helpers/adminFixtures.ts';
import { registerOwner, registerDriver } from './helpers/fixtures.ts';

describe('Admin auth + RBAC (Phase 22/29)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('admin can log in and gets an admin-scoped access token', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09100000001', 'SUPER_ADMIN');
    assert.ok(accessToken);
    const me = await apiCall(app.baseUrl, 'GET', '/admin/auth/me', { token: accessToken });
    assert.equal(me.status, 200);
    assert.equal((me.body as any).role, 'SUPER_ADMIN');
  });

  test('wrong admin password is rejected with the same error as a nonexistent phone (no enumeration)', async () => {
    await createAndLoginAdmin(app, '09100000002', 'ADMIN');
    const wrongPw = await apiCall(app.baseUrl, 'POST', '/admin/auth/login', { body: { phoneNumber: '09100000002', password: 'nope' } });
    const noSuchPhone = await apiCall(app.baseUrl, 'POST', '/admin/auth/login', { body: { phoneNumber: '09100099999', password: 'nope' } });
    assert.equal(wrongPw.status, 400);
    assert.equal(noSuchPhone.status, 400);
    assert.equal((wrongPw.body as any).message, (noSuchPhone.body as any).message);
  });

  test('a disabled admin cannot log in', async () => {
    const { admin, accessToken: superToken } = await createAndLoginAdmin(app, '09100000003', 'SUPER_ADMIN');
    const { admin: target } = await createAndLoginAdmin(app, '09100000004', 'ADMIN');
    await apiCall(app.baseUrl, 'PUT', `/admin/admins/${target.id}`, { token: superToken, body: { isActive: false } });

    const attempt = await apiCall(app.baseUrl, 'POST', '/admin/auth/login', { body: { phoneNumber: '09100000004', password: 'adminpass123' } });
    assert.equal(attempt.status, 403);
  });

  test("CRITICAL: a normal User App access token cannot be used against any /admin/* route", async () => {
    const owner = await registerOwner(app, '09100000005');
    const attempt = await apiCall(app.baseUrl, 'GET', '/admin/dashboard', { token: owner.accessToken });
    assert.equal(attempt.status, 401); // signature verification fails outright — different secret entirely

    const driver = await registerDriver(app, '09100000006');
    const attempt2 = await apiCall(app.baseUrl, 'GET', '/admin/users', { token: driver.accessToken });
    assert.equal(attempt2.status, 401);
  });

  test('CRITICAL: an admin access token cannot be used against a normal User App route', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09100000007', 'SUPER_ADMIN');
    const attempt = await apiCall(app.baseUrl, 'GET', '/trucks', { token: accessToken });
    assert.equal(attempt.status, 401);
  });

  test('CRITICAL: SUPPORT cannot view or edit Payment Settings', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09100000008', 'SUPPORT');
    const view = await apiCall(app.baseUrl, 'GET', '/admin/settings/payment', { token: accessToken });
    assert.equal(view.status, 403);
    const edit = await apiCall(app.baseUrl, 'PUT', '/admin/settings/payment', { token: accessToken, body: { merchantId: 'x' } });
    assert.equal(edit.status, 403);
  });

  test('CRITICAL: SUPPORT cannot access Admin Management', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09100000009', 'SUPPORT');
    const attempt = await apiCall(app.baseUrl, 'GET', '/admin/admins', { token: accessToken });
    assert.equal(attempt.status, 403);
  });

  test('CRITICAL: ACCOUNTANT cannot modify the SMS secret', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09100000010', 'ACCOUNTANT');
    const attempt = await apiCall(app.baseUrl, 'PUT', '/admin/settings/sms', { token: accessToken, body: { apiKey: 'hijacked' } });
    assert.equal(attempt.status, 403);
  });

  test('CRITICAL: ADMIN cannot perform Super-Admin-only actions (Admin Management)', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09100000011', 'ADMIN');
    const attempt = await apiCall(app.baseUrl, 'POST', '/admin/admins', {
      token: accessToken, body: { phoneNumber: '09100000099', password: 'x', fullName: 'x', role: 'SUPPORT' },
    });
    assert.equal(attempt.status, 403);
  });

  test('SUPER_ADMIN can perform every gated action (positive control for the negative tests above)', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09100000012', 'SUPER_ADMIN');
    const smsView = await apiCall(app.baseUrl, 'GET', '/admin/settings/sms', { token: accessToken });
    const paymentView = await apiCall(app.baseUrl, 'GET', '/admin/settings/payment', { token: accessToken });
    const adminList = await apiCall(app.baseUrl, 'GET', '/admin/admins', { token: accessToken });
    assert.equal(smsView.status, 200);
    assert.equal(paymentView.status, 200);
    assert.equal(adminList.status, 200);
  });

  test('a SUPER_ADMIN can grant a lower role a custom extra permission', async () => {
    const { accessToken: superToken } = await createAndLoginAdmin(app, '09100000013', 'SUPER_ADMIN');
    const { admin: support, accessToken: supportToken } = await createAndLoginAdmin(app, '09100000014', 'SUPPORT');

    const before = await apiCall(app.baseUrl, 'GET', '/admin/settings/payment', { token: supportToken });
    assert.equal(before.status, 403);

    const grant = await apiCall(app.baseUrl, 'POST', `/admin/admins/${support.id}/permissions`, {
      token: superToken, body: { permission: 'PAYMENT_SETTINGS_VIEW' },
    });
    assert.equal(grant.status, 200);

    const after = await apiCall(app.baseUrl, 'GET', '/admin/settings/payment', { token: supportToken });
    assert.equal(after.status, 200);
  });

  test('a SUPER_ADMIN cannot disable their own account', async () => {
    const { admin, accessToken } = await createAndLoginAdmin(app, '09100000015', 'SUPER_ADMIN');
    const attempt = await apiCall(app.baseUrl, 'PUT', `/admin/admins/${admin.id}`, { token: accessToken, body: { isActive: false } });
    assert.equal(attempt.status, 400);
  });
});
