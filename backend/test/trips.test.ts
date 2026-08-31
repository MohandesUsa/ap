import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { connectedOwnerAndDriver, registerDriver, registerOwner } from './helpers/fixtures.ts';

describe('Trips (accounting engine)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('a connected driver can log a trip against their assigned truck', async () => {
    const { driver, truckId } = await connectedOwnerAndDriver(app, '09150000001', '09150000002', '22 الف 100 ایران 22');

    const res = await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken,
      body: { origin: 'تهران', destination: 'اصفهان', income: 8500000, tripDate: '1403/06/02', cargoType: 'مصالح' },
    });
    assert.equal(res.status, 201);
    assert.equal((res.body as any).truckId, truckId);
    assert.equal((res.body as any).income, 8500000);
    assert.equal((res.body as any).settled, false);
  });

  test('a driver with no active truck cannot log a trip', async () => {
    const driver = await registerDriver(app, '09150000003');
    const res = await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken,
      body: { origin: 'تهران', destination: 'اصفهان', income: 100, tripDate: '1403/06/02' },
    });
    assert.equal(res.status, 403);
  });

  test('an owner cannot log a trip (role-gated)', async () => {
    const owner = await registerOwner(app, '09150000004');
    const res = await apiCall(app.baseUrl, 'POST', '/trips', {
      token: owner.accessToken,
      body: { origin: 'تهران', destination: 'اصفهان', income: 100, tripDate: '1403/06/02' },
    });
    assert.equal(res.status, 403);
  });

  test('owner sees fleet-wide trips; driver sees only their own', async () => {
    const { owner, driver } = await connectedOwnerAndDriver(app, '09150000005', '09150000006', '22 ب 200 ایران 22');
    await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 1000, tripDate: '1403/06/01' },
    });
    await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'C', destination: 'D', income: 2000, tripDate: '1403/06/02' },
    });

    const ownerTrips = await apiCall(app.baseUrl, 'GET', '/owner/trips', { token: owner.accessToken });
    assert.equal((ownerTrips.body as any).trips.length, 2);

    const driverTrips = await apiCall(app.baseUrl, 'GET', '/driver/trips', { token: driver.accessToken });
    assert.equal((driverTrips.body as any).trips.length, 2);
  });

  test('CRITICAL: Owner B cannot see or settle a trip logged on Owner A\'s truck', async () => {
    const a = await connectedOwnerAndDriver(app, '09150000007', '09150000008', '22 ج 300 ایران 22');
    const b = await connectedOwnerAndDriver(app, '09150000009', '09150000010', '22 د 400 ایران 22');

    const trip = await apiCall(app.baseUrl, 'POST', '/trips', {
      token: a.driver.accessToken, body: { origin: 'A', destination: 'B', income: 5000, tripDate: '1403/06/01' },
    });
    const tripId = (trip.body as any).id;

    const bTrips = await apiCall(app.baseUrl, 'GET', '/owner/trips', { token: b.owner.accessToken });
    assert.ok(!((bTrips.body as any).trips as any[]).some((t) => t.id === tripId));

    const hijack = await apiCall(app.baseUrl, 'PUT', `/trips/${tripId}/settlement`, {
      token: b.owner.accessToken, body: { settled: true, paidTo: 'owner' },
    });
    assert.equal(hijack.status, 404);
  });

  test('owner can set commission and mark a trip settled', async () => {
    const { owner, driver } = await connectedOwnerAndDriver(app, '09150000011', '09150000012', '22 ه 500 ایران 22');
    const trip = await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 10000, tripDate: '1403/06/01' },
    });
    const tripId = (trip.body as any).id;

    const updated = await apiCall(app.baseUrl, 'PUT', `/trips/${tripId}/settlement`, {
      token: owner.accessToken, body: { commission: 500, settled: true, paidTo: 'driver' },
    });
    assert.equal(updated.status, 200);
    assert.equal((updated.body as any).commission, 500);
    assert.equal((updated.body as any).settled, true);
    assert.equal((updated.body as any).paidTo, 'driver');
  });
});
