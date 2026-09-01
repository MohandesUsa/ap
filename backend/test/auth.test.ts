import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';

describe('Auth', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('health check responds', async () => {
    const res = await apiCall(app.baseUrl, 'GET', '/health');
    assert.equal(res.status, 200);
  });

  test('register owner succeeds and returns tokens + role', async () => {
    const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000001', password: 'secret123', fullName: 'صاحب کامیون تست', role: 'owner', deviceId: 'device-09120000001' },
    });
    assert.equal(res.status, 201);
    const body = res.body as any;
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.equal(body.role, 'owner');
    assert.equal(body.subscriptionStatus, 'trial');
  });

  test('register with duplicate phone number is rejected with 409', async () => {
    await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000002', password: 'secret123', fullName: 'Test', role: 'owner', deviceId: 'device-09120000002-a' },
    });
    const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000002', password: 'secret123', fullName: 'Test 2', role: 'owner', deviceId: 'device-09120000002-b' },
    });
    assert.equal(res.status, 409);
    assert.equal((res.body as any).code, 'CONFLICT');
  });

  test('register rejects an invalid phone number format', async () => {
    const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '12345', password: 'secret123', fullName: 'Test', role: 'owner', deviceId: 'device-12345' },
    });
    assert.equal(res.status, 422);
  });

  test('register rejects a role the client tries to invent', async () => {
    const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000003', password: 'secret123', fullName: 'Test', role: 'superadmin', deviceId: 'device-09120000003' },
    });
    assert.equal(res.status, 422);
  });

  test('login with correct credentials succeeds', async () => {
    await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000004', password: 'correct-password', fullName: 'Login Test', role: 'driver', deviceId: 'device-09120000004' },
    });
    const res = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09120000004', password: 'correct-password', deviceId: 'device-09120000004' },
    });
    assert.equal(res.status, 200);
    assert.equal((res.body as any).role, 'driver');
  });

  test('login with wrong password is rejected with 400 and a generic message', async () => {
    await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000005', password: 'correct-password', fullName: 'Test', role: 'owner', deviceId: 'device-09120000005' },
    });
    const res = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09120000005', password: 'WRONG', deviceId: 'device-09120000005' },
    });
    assert.equal(res.status, 400);
  });

  test('login for a nonexistent phone number gets the SAME error as wrong password (no enumeration)', async () => {
    const wrongPassword = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09120000005', password: 'WRONG', deviceId: 'device-09120000005' },
    });
    const noSuchUser = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09129999999', password: 'anything', deviceId: 'device-09129999999' },
    });
    assert.equal(wrongPassword.status, noSuchUser.status);
    assert.equal((wrongPassword.body as any).message, (noSuchUser.body as any).message);
  });

  test('GET /auth/me requires a valid access token', async () => {
    const noToken = await apiCall(app.baseUrl, 'GET', '/auth/me');
    assert.equal(noToken.status, 401);

    const badToken = await apiCall(app.baseUrl, 'GET', '/auth/me', { token: 'not-a-real-token' });
    assert.equal(badToken.status, 401);
  });

  test('GET /auth/me returns the authenticated user with a valid token', async () => {
    const register = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000006', password: 'secret123', fullName: 'Me Test', role: 'owner', deviceId: 'device-09120000006' },
    });
    const { accessToken } = register.body as any;

    const res = await apiCall(app.baseUrl, 'GET', '/auth/me', { token: accessToken });
    assert.equal(res.status, 200);
    assert.equal((res.body as any).fullName, 'Me Test');
  });

  test('refresh token rotation: old refresh token cannot be reused after rotation', async () => {
    const register = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000007', password: 'secret123', fullName: 'Rotate Test', role: 'owner', deviceId: 'device-09120000007' },
    });
    const { refreshToken: firstRefresh } = register.body as any;

    const firstRotate = await apiCall(app.baseUrl, 'POST', '/auth/refresh', { body: { refreshToken: firstRefresh } });
    assert.equal(firstRotate.status, 200);
    const { refreshToken: secondRefresh } = firstRotate.body as any;
    assert.notEqual(secondRefresh, firstRefresh);

    // Reusing the now-rotated-away first refresh token must fail.
    const reuseAttempt = await apiCall(app.baseUrl, 'POST', '/auth/refresh', { body: { refreshToken: firstRefresh } });
    assert.equal(reuseAttempt.status, 401);

    // The new one must still work.
    const secondRotate = await apiCall(app.baseUrl, 'POST', '/auth/refresh', { body: { refreshToken: secondRefresh } });
    assert.equal(secondRotate.status, 200);
  });

  test('logout revokes the refresh token', async () => {
    const register = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09120000008', password: 'secret123', fullName: 'Logout Test', role: 'owner', deviceId: 'device-09120000008' },
    });
    const { refreshToken } = register.body as any;

    const logoutRes = await apiCall(app.baseUrl, 'POST', '/auth/logout', { body: { refreshToken } });
    assert.equal(logoutRes.status, 200);

    const afterLogout = await apiCall(app.baseUrl, 'POST', '/auth/refresh', { body: { refreshToken } });
    assert.equal(afterLogout.status, 401);
  });
});
