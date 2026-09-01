import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { createAndLoginAdmin } from './helpers/adminFixtures.ts';
import { registerOwner, registerDriver } from './helpers/fixtures.ts';

describe('Notifications (Phase 19)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('a broadcast to "all" resolves every active user as a recipient', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09140000001', 'SUPER_ADMIN');
    await registerOwner(app, '09140000002');
    await registerDriver(app, '09140000003');

    const res = await apiCall(app.baseUrl, 'POST', '/admin/notifications', {
      token: accessToken, body: { title: 'اطلاعیه', message: 'سلام', target: 'all' },
    });
    assert.equal(res.status, 201);
    assert.equal((res.body as any).recipientCount, 2);
  });

  test('a targeted "owners" notification excludes drivers', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09140000004', 'SUPER_ADMIN');
    await registerOwner(app, '09140000005');
    await registerOwner(app, '09140000006');
    await registerDriver(app, '09140000007');

    // Two more owners registered in this test, PLUS whatever earlier tests in this describe block
    // (same shared app/db) already created — count via the admin API itself rather than assuming
    // this test's registrations are the only owners that exist.
    const ownersBefore = await apiCall(app.baseUrl, 'GET', '/admin/owners?limit=100', { token: accessToken });
    const expectedOwnerCount = (ownersBefore.body as any).pagination.total;

    const res = await apiCall(app.baseUrl, 'POST', '/admin/notifications', {
      token: accessToken, body: { title: 'برای صاحبان کامیون', message: 'سلام', target: 'owners' },
    });
    assert.equal(res.status, 201);
    assert.equal((res.body as any).recipientCount, expectedOwnerCount);
  });

  test('specific_user requires targetUserId', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09140000008', 'SUPER_ADMIN');
    const res = await apiCall(app.baseUrl, 'POST', '/admin/notifications', {
      token: accessToken, body: { title: 'x', message: 'y', target: 'specific_user' },
    });
    assert.equal(res.status, 422);
  });

  test('SUPPORT cannot create notifications', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09140000009', 'SUPPORT');
    const res = await apiCall(app.baseUrl, 'POST', '/admin/notifications', {
      token: accessToken, body: { title: 'x', message: 'y', target: 'all' },
    });
    assert.equal(res.status, 403);
  });
});
