import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';

describe('End-to-end scenario (Phase 3 §36)', () => {
  let app: TestApp;
  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('full 12-step Owner + Driver + Truck + Invitation + re-login flow', async () => {
    // 1. Create Owner
    const register = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09150000001', password: 'owner-pass', fullName: 'صاحب کامیون تست', role: 'owner', deviceId: 'device-09150000001' },
    });
    assert.equal(register.status, 201);

    // 2. Login Owner
    const login = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09150000001', password: 'owner-pass', deviceId: 'device-09150000001' },
    });
    assert.equal(login.status, 200);
    const ownerAccessToken = (login.body as any).accessToken;
    const ownerRefreshToken = (login.body as any).refreshToken;

    // 3. Create Truck
    const truckRes = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: ownerAccessToken,
      body: { plate: '22 الف 262 ایران 22', brand: 'ولوو', modelYear: '1401' },
    });
    assert.equal(truckRes.status, 201);
    const truckId = (truckRes.body as any).id;

    // 4. Create/Invite Driver
    const inviteRes = await apiCall(app.baseUrl, 'POST', '/invitations', {
      token: ownerAccessToken,
      body: { driverPhone: '09150000002', truckId },
    });
    assert.equal(inviteRes.status, 201);
    const invitationId = (inviteRes.body as any).id;

    // 5. Create Driver Account
    const driverRegister = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09150000002', password: 'driver-pass', fullName: 'راننده تست', role: 'driver', deviceId: 'device-09150000002' },
    });
    assert.equal(driverRegister.status, 201);
    const driverAccessToken = (driverRegister.body as any).accessToken;

    // 6. Driver receives Invitation
    const invitations = await apiCall(app.baseUrl, 'GET', '/driver/invitations', { token: driverAccessToken });
    assert.equal(invitations.status, 200);
    assert.equal((invitations.body as any).invitations.length, 1);
    assert.equal((invitations.body as any).invitations[0].id, invitationId);

    // 7. Driver accepts Invitation
    const accept = await apiCall(app.baseUrl, 'POST', `/driver/invitations/${invitationId}/accept`, {
      token: driverAccessToken,
    });
    assert.equal(accept.status, 200);

    // 8. Driver sees Truck
    const driverProfile = await apiCall(app.baseUrl, 'GET', '/drivers/me', { token: driverAccessToken });
    assert.equal(driverProfile.status, 200);
    assert.equal((driverProfile.body as any).currentTruck.plate, '22 الف 262 ایران 22');

    const driverDashboard = await apiCall(app.baseUrl, 'GET', '/driver/dashboard', { token: driverAccessToken });
    assert.equal(driverDashboard.status, 200);
    assert.equal((driverDashboard.body as any).currentTruck.id, truckId);

    // 9. Owner sees Driver
    const ownerDrivers = await apiCall(app.baseUrl, 'GET', '/drivers', { token: ownerAccessToken });
    assert.equal(ownerDrivers.status, 200);
    assert.equal((ownerDrivers.body as any).drivers.length, 1);

    const ownerDashboard = await apiCall(app.baseUrl, 'GET', '/owner/dashboard', { token: ownerAccessToken });
    assert.equal(ownerDashboard.status, 200);
    assert.equal((ownerDashboard.body as any).truckCount, 1);
    assert.equal((ownerDashboard.body as any).driverCount, 1);

    // 10. Logout
    const logout = await apiCall(app.baseUrl, 'POST', '/auth/logout', { body: { refreshToken: ownerRefreshToken } });
    assert.equal(logout.status, 200);

    const deadRefresh = await apiCall(app.baseUrl, 'POST', '/auth/refresh', { body: { refreshToken: ownerRefreshToken } });
    assert.equal(deadRefresh.status, 401);

    // 11. Login again
    const reLogin = await apiCall(app.baseUrl, 'POST', '/auth/login', {
      body: { phoneNumber: '09150000001', password: 'owner-pass', deviceId: 'device-09150000001' },
    });
    assert.equal(reLogin.status, 200);
    const newAccessToken = (reLogin.body as any).accessToken;

    // 12. Session restored — the owner sees exactly the same data as before logout.
    const restoredDashboard = await apiCall(app.baseUrl, 'GET', '/owner/dashboard', { token: newAccessToken });
    assert.equal(restoredDashboard.status, 200);
    assert.equal((restoredDashboard.body as any).truckCount, 1);
    assert.equal((restoredDashboard.body as any).driverCount, 1);

    const restoredTrucks = await apiCall(app.baseUrl, 'GET', '/trucks', { token: newAccessToken });
    assert.equal((restoredTrucks.body as any).trucks[0].id, truckId);
  });
});
