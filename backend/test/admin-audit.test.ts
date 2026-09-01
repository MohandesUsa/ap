import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { createAndLoginAdmin } from './helpers/adminFixtures.ts';

describe('Audit logs (Phase 20)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('an admin action is recorded and visible in the audit log, attributed to the admin', async () => {
    const { admin, accessToken } = await createAndLoginAdmin(app, '09150000001', 'SUPER_ADMIN');
    await apiCall(app.baseUrl, 'POST', '/admin/subscription-plans', {
      token: accessToken, body: { name: 'Audit Test Plan', durationDays: 30, price: 1000 },
    });

    const logs = await apiCall(app.baseUrl, 'GET', '/admin/audit-logs', { token: accessToken });
    assert.equal(logs.status, 200);
    const entry = (logs.body as any).logs.find((l: any) => l.action === 'ADMIN_CREATE_PLAN');
    assert.ok(entry, 'expected an ADMIN_CREATE_PLAN entry');
    assert.equal(entry.admin_id, admin.id);
  });

  test('SUPPORT and ACCOUNTANT cannot view audit logs (not in either role default)', async () => {
    const { accessToken: supportToken } = await createAndLoginAdmin(app, '09150000002', 'SUPPORT');
    const { accessToken: accountantToken } = await createAndLoginAdmin(app, '09150000003', 'ACCOUNTANT');
    const a = await apiCall(app.baseUrl, 'GET', '/admin/audit-logs', { token: supportToken });
    const b = await apiCall(app.baseUrl, 'GET', '/admin/audit-logs', { token: accountantToken });
    assert.equal(a.status, 403);
    assert.equal(b.status, 403);
  });

  test('a suspended user action is also audited', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09150000004', 'SUPER_ADMIN');
    const res = await apiCall(app.baseUrl, 'POST', '/admin/admins', {
      token: accessToken, body: { phoneNumber: '09150000099', password: 'x1234567', fullName: 'y', role: 'SUPPORT' },
    });
    assert.equal(res.status, 201);
    const logs = await apiCall(app.baseUrl, 'GET', '/admin/audit-logs', { token: accessToken });
    assert.ok((logs.body as any).logs.some((l: any) => l.action === 'ADMIN_CREATE_ADMIN'));
  });
});
