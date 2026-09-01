import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { createAndLoginAdmin } from './helpers/adminFixtures.ts';
import { connectedOwnerAndDriver } from './helpers/fixtures.ts';

describe('Admin directory: users/owners/drivers/trucks (Phases 5-8)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('admin sees a connected owner+driver+truck across all directory endpoints', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09110000001', 'SUPER_ADMIN');
    const { owner, driver } = await connectedOwnerAndDriver(app, '09110000002', '09110000003', '22 الف 100 ایران 22');

    const users = await apiCall(app.baseUrl, 'GET', '/admin/users', { token: accessToken });
    assert.equal(users.status, 200);
    assert.ok((users.body as any).users.length >= 2);

    const owners = await apiCall(app.baseUrl, 'GET', '/admin/owners', { token: accessToken });
    assert.equal(owners.status, 200);
    const ownerRow = (owners.body as any).owners.find((o: any) => o.phone_number === '09110000002');
    assert.equal(Number(ownerRow.truck_count), 1);
    assert.equal(Number(ownerRow.driver_count), 1);

    const drivers = await apiCall(app.baseUrl, 'GET', '/admin/drivers', { token: accessToken });
    assert.equal(drivers.status, 200);
    const driverRow = (drivers.body as any).drivers.find((d: any) => d.phone_number === '09110000003');
    assert.equal(driverRow.truck_plate, '22 الف 100 ایران 22');

    const trucks = await apiCall(app.baseUrl, 'GET', '/admin/trucks', { token: accessToken });
    assert.equal(trucks.status, 200);
    const truckRow = (trucks.body as any).trucks.find((t: any) => t.plate === '22 الف 100 ایران 22');
    assert.equal(truckRow.driver_name, 'Driver 09110000003');
  });

  test('user search filters by phone', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09110000004', 'SUPER_ADMIN');
    await connectedOwnerAndDriver(app, '09110000005', '09110000006', '22 ب 200 ایران 22');

    const res = await apiCall(app.baseUrl, 'GET', '/admin/users?search=09110000005', { token: accessToken });
    assert.equal(res.status, 200);
    assert.equal((res.body as any).users.length, 1);
    assert.equal((res.body as any).users[0].phone_number, '09110000005');
  });

  test('admin can suspend and reactivate a user', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09110000007', 'SUPER_ADMIN');
    const { owner } = await connectedOwnerAndDriver(app, '09110000008', '09110000009', '22 ج 300 ایران 22');
    const userId = owner.userId;

    const suspend = await apiCall(app.baseUrl, 'PUT', `/admin/users/${userId}/status`, { token: accessToken, body: { isActive: false } });
    assert.equal(suspend.status, 200);

    const loginAttempt = await apiCall(app.baseUrl, 'POST', '/auth/login', { body: { phoneNumber: '09110000008', password: 'secret123', deviceId: 'device-09110000008' } });
    assert.equal(loginAttempt.status, 403);

    const reactivate = await apiCall(app.baseUrl, 'PUT', `/admin/users/${userId}/status`, { token: accessToken, body: { isActive: true } });
    assert.equal(reactivate.status, 200);
    const loginAgain = await apiCall(app.baseUrl, 'POST', '/auth/login', { body: { phoneNumber: '09110000008', password: 'secret123', deviceId: 'device-09110000008' } });
    assert.equal(loginAgain.status, 200);
  });

  test('SUPPORT can view users but cannot edit their status', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09110000010', 'SUPPORT');
    const { owner } = await connectedOwnerAndDriver(app, '09110000011', '09110000012', '22 د 400 ایران 22');

    const view = await apiCall(app.baseUrl, 'GET', '/admin/users', { token: accessToken });
    assert.equal(view.status, 200);

    const edit = await apiCall(app.baseUrl, 'PUT', `/admin/users/${owner.userId}/status`, { token: accessToken, body: { isActive: false } });
    assert.equal(edit.status, 403);
  });

  test('owner detail shows their trucks, drivers, and totals', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09110000013', 'SUPER_ADMIN');
    const { owner } = await connectedOwnerAndDriver(app, '09110000014', '09110000015', '22 ه 500 ایران 22');
    const ownerRes = await apiCall(app.baseUrl, 'GET', '/admin/owners', { token: accessToken });
    const ownerRow = (ownerRes.body as any).owners.find((o: any) => o.phone_number === '09110000014');

    const detail = await apiCall(app.baseUrl, 'GET', `/admin/owners/${ownerRow.id}`, { token: accessToken });
    assert.equal(detail.status, 200);
    assert.equal((detail.body as any).trucks.length, 1);
    assert.equal((detail.body as any).drivers.length, 1);
  });
});
