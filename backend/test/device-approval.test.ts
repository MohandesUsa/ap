import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';

describe('Single-trusted-device login approval', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('same device can log in repeatedly with no approval needed', async () => {
    await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09140000001', password: 'secret123', fullName: 'Test', role: 'owner', deviceId: 'phone-A' },
    });
    const res = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000001', password: 'secret123', deviceId: 'phone-A' },
    });
    assert.equal(res.status, 200);
    assert.equal((res.body as any).status, 'authenticated');
    assert.ok((res.body as any).accessToken);
  });

  test('login from a second device does not get tokens — returns 202 pending_approval', async () => {
    await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09140000002', password: 'secret123', fullName: 'Test', role: 'owner', deviceId: 'phone-A' },
    });
    const res = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000002', password: 'secret123', deviceId: 'phone-B', deviceLabel: 'Chrome on Windows' },
    });
    assert.equal(res.status, 202);
    assert.equal((res.body as any).status, 'pending_approval');
    assert.ok((res.body as any).requestId);
    assert.equal((res.body as any).accessToken, undefined);
  });

  test('the trusted device sees the pending request and can approve it, which then issues tokens to the new device', async () => {
    const register = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09140000003', password: 'secret123', fullName: 'Test', role: 'owner', deviceId: 'phone-A' },
    });
    const trustedToken = (register.body as any).accessToken;

    const loginAttempt = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000003', password: 'secret123', deviceId: 'phone-B', deviceLabel: 'iPhone' },
    });
    const requestId = (loginAttempt.body as any).requestId;

    // New device polls before approval: still pending.
    const pollBefore = await apiCall(app.baseUrl, 'GET', `/auth/device-requests/${requestId}`);
    assert.equal(pollBefore.status, 200);
    assert.equal((pollBefore.body as any).status, 'pending');

    // Trusted device lists its own pending requests.
    const pending = await apiCall(app.baseUrl, 'GET', '/auth/device-requests', { token: trustedToken });
    assert.equal(pending.status, 200);
    assert.equal((pending.body as any).requests.length, 1);
    assert.equal((pending.body as any).requests[0].id, requestId);
    assert.equal((pending.body as any).requests[0].deviceLabel, 'iPhone');

    // Trusted device approves.
    const approve = await apiCall(app.baseUrl, 'POST', `/auth/device-requests/${requestId}/approve`, { token: trustedToken });
    assert.equal(approve.status, 200);

    // New device polls again: now gets tokens.
    const pollAfter = await apiCall(app.baseUrl, 'GET', `/auth/device-requests/${requestId}`);
    assert.equal(pollAfter.status, 200);
    assert.equal((pollAfter.body as any).status, 'authenticated');
    assert.ok((pollAfter.body as any).accessToken);

    // Polling a third time must NOT mint a second set of tokens (one-time consumption).
    const pollThird = await apiCall(app.baseUrl, 'GET', `/auth/device-requests/${requestId}`);
    assert.equal((pollThird.body as any).status, 'expired');

    // Trust has transferred: the OLD device (phone-A) now needs approval to log back in.
    const oldDeviceRelogin = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000003', password: 'secret123', deviceId: 'phone-A' },
    });
    assert.equal(oldDeviceRelogin.status, 202);
  });

  test('the trusted device can deny a pending request, and the new device never gets tokens', async () => {
    const register = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09140000004', password: 'secret123', fullName: 'Test', role: 'owner', deviceId: 'phone-A' },
    });
    const trustedToken = (register.body as any).accessToken;

    const loginAttempt = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000004', password: 'secret123', deviceId: 'phone-B' },
    });
    const requestId = (loginAttempt.body as any).requestId;

    const deny = await apiCall(app.baseUrl, 'POST', `/auth/device-requests/${requestId}/deny`, { token: trustedToken });
    assert.equal(deny.status, 200);

    const poll = await apiCall(app.baseUrl, 'GET', `/auth/device-requests/${requestId}`);
    assert.equal((poll.body as any).status, 'denied');

    // Trust was NOT transferred — phone-A is still trusted and can log in directly.
    const stillTrusted = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000004', password: 'secret123', deviceId: 'phone-A' },
    });
    assert.equal(stillTrusted.status, 200);
  });

  test('a device other than the trusted one cannot approve or deny someone else\'s request', async () => {
    await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09140000005', password: 'secret123', fullName: 'Victim', role: 'owner', deviceId: 'phone-A' },
    });
    const loginAttempt = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000005', password: 'secret123', deviceId: 'phone-B' },
    });
    const requestId = (loginAttempt.body as any).requestId;

    const attacker = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09140000006', password: 'secret123', fullName: 'Attacker', role: 'owner', deviceId: 'attacker-device' },
    });
    const attackerToken = (attacker.body as any).accessToken;

    const approveAttempt = await apiCall(app.baseUrl, 'POST', `/auth/device-requests/${requestId}/approve`, { token: attackerToken });
    assert.equal(approveAttempt.status, 404);
  });

  test('an account created before this feature (no trusted_device_id) accepts its first login from any device', async () => {
    // Simulates a legacy row: register normally (which does set trusted_device_id today), then
    // clear it directly to reproduce the pre-migration state, and confirm login still works
    // rather than being permanently locked out.
    const register = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09140000007', password: 'secret123', fullName: 'Legacy', role: 'owner', deviceId: 'phone-A' },
    });
    const userId = (register.body as any).userId;
    await app.db.query('UPDATE users SET trusted_device_id = NULL WHERE id = $1', [userId]);

    const login = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09140000007', password: 'secret123', deviceId: 'phone-C' },
    });
    assert.equal(login.status, 200);
  });
});
