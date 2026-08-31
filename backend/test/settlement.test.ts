import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { connectedOwnerAndDriver } from './helpers/fixtures.ts';

describe('Settlement (driver pay + payments)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('owner can set a driver to percent-based pay and the summary reflects it', async () => {
    const { owner, driver, driverId } = await connectedOwnerAndDriver(app, '09170000001', '09170000002', '22 الف 100 ایران 22');

    const payUpdate = await apiCall(app.baseUrl, 'PUT', `/drivers/${driverId}/pay`, {
      token: owner.accessToken, body: { payType: 'percent', payValue: 20 },
    });
    assert.equal(payUpdate.status, 200);
    assert.equal((payUpdate.body as any).payValue, 20);

    // income 10000, commission 1000 -> net 9000 -> 20% = 1800
    const trip = await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 10000, tripDate: '1403/06/01' },
    });
    await apiCall(app.baseUrl, 'PUT', `/trips/${(trip.body as any).id}/settlement`, {
      token: owner.accessToken, body: { commission: 1000 },
    });

    const summary = await apiCall(app.baseUrl, 'GET', `/owner/settlement/summary?driverId=${driverId}`, {
      token: owner.accessToken,
    });
    assert.equal(summary.status, 200);
    assert.equal((summary.body as any).driverEntitlement, 1800);
    assert.equal((summary.body as any).remaining, 1800);
  });

  test('a salaried driver is owed the flat salary regardless of trip count', async () => {
    const { owner, driver, driverId } = await connectedOwnerAndDriver(app, '09170000003', '09170000004', '22 ب 200 ایران 22');
    await apiCall(app.baseUrl, 'PUT', `/drivers/${driverId}/pay`, {
      token: owner.accessToken, body: { payType: 'salary', payValue: 45000000 },
    });
    await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 999999, tripDate: '1403/06/01' },
    });

    const summary = await apiCall(app.baseUrl, 'GET', `/owner/settlement/summary?driverId=${driverId}`, {
      token: owner.accessToken,
    });
    assert.equal((summary.body as any).driverEntitlement, 45000000);
  });

  test('recording a manual payment reduces the remaining balance', async () => {
    const { owner, driver, driverId } = await connectedOwnerAndDriver(app, '09170000005', '09170000006', '22 ج 300 ایران 22');
    await apiCall(app.baseUrl, 'PUT', `/drivers/${driverId}/pay`, {
      token: owner.accessToken, body: { payType: 'percent', payValue: 50 },
    });
    await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 10000, tripDate: '1403/06/01' },
    });
    // entitlement = 50% of 10000 = 5000

    const payment = await apiCall(app.baseUrl, 'POST', '/owner/settlement/payments', {
      token: owner.accessToken, body: { driverId, amount: 2000 },
    });
    assert.equal(payment.status, 201);
    assert.equal((payment.body as any).remaining, 3000);

    const summary = await apiCall(app.baseUrl, 'GET', `/owner/settlement/summary?driverId=${driverId}`, {
      token: owner.accessToken,
    });
    assert.equal((summary.body as any).remaining, 3000);
    assert.equal((summary.body as any).manualPaid, 2000);
  });

  test('a payment larger than the remaining balance is rejected', async () => {
    const { owner, driver, driverId } = await connectedOwnerAndDriver(app, '09170000007', '09170000008', '22 د 400 ایران 22');
    await apiCall(app.baseUrl, 'PUT', `/drivers/${driverId}/pay`, {
      token: owner.accessToken, body: { payType: 'percent', payValue: 20 },
    });
    await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 1000, tripDate: '1403/06/01' },
    });
    // entitlement = 20% of 1000 = 200

    const overpay = await apiCall(app.baseUrl, 'POST', '/owner/settlement/payments', {
      token: owner.accessToken, body: { driverId, amount: 999999 },
    });
    assert.equal(overpay.status, 422);
  });

  test('a trip settled and paid directly to the driver counts against what they are still owed', async () => {
    const { owner, driver, driverId } = await connectedOwnerAndDriver(app, '09170000009', '09170000010', '22 ه 500 ایران 22');
    await apiCall(app.baseUrl, 'PUT', `/drivers/${driverId}/pay`, {
      token: owner.accessToken, body: { payType: 'percent', payValue: 100 },
    });
    const trip = await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 5000, tripDate: '1403/06/01' },
    });
    await apiCall(app.baseUrl, 'PUT', `/trips/${(trip.body as any).id}/settlement`, {
      token: owner.accessToken, body: { settled: true, paidTo: 'driver' },
    });

    const summary = await apiCall(app.baseUrl, 'GET', `/owner/settlement/summary?driverId=${driverId}`, {
      token: owner.accessToken,
    });
    assert.equal((summary.body as any).driverEntitlement, 5000);
    assert.equal((summary.body as any).paidDirect, 5000);
    assert.equal((summary.body as any).remaining, 0);
  });

  test('the driver can read their own settlement summary', async () => {
    const { owner, driver, driverId } = await connectedOwnerAndDriver(app, '09170000011', '09170000012', '22 و 600 ایران 22');
    await apiCall(app.baseUrl, 'PUT', `/drivers/${driverId}/pay`, {
      token: owner.accessToken, body: { payType: 'percent', payValue: 30 },
    });
    await apiCall(app.baseUrl, 'POST', '/trips', {
      token: driver.accessToken, body: { origin: 'A', destination: 'B', income: 1000, tripDate: '1403/06/01' },
    });

    const summary = await apiCall(app.baseUrl, 'GET', '/driver/settlement/summary', { token: driver.accessToken });
    assert.equal(summary.status, 200);
    assert.equal((summary.body as any).driverEntitlement, 300);
  });

  test("CRITICAL: Owner B cannot change Owner A's driver's pay or read their settlement", async () => {
    const a = await connectedOwnerAndDriver(app, '09170000013', '09170000014', '22 ز 700 ایران 22');
    const b = await connectedOwnerAndDriver(app, '09170000015', '09170000016', '22 ح 800 ایران 22');

    const hijackPay = await apiCall(app.baseUrl, 'PUT', `/drivers/${a.driverId}/pay`, {
      token: b.owner.accessToken, body: { payType: 'salary', payValue: 1 },
    });
    assert.equal(hijackPay.status, 404);

    const hijackSummary = await apiCall(app.baseUrl, 'GET', `/owner/settlement/summary?driverId=${a.driverId}`, {
      token: b.owner.accessToken,
    });
    assert.equal(hijackSummary.status, 404);

    const hijackPayment = await apiCall(app.baseUrl, 'POST', '/owner/settlement/payments', {
      token: b.owner.accessToken, body: { driverId: a.driverId, amount: 1 },
    });
    assert.equal(hijackPayment.status, 404);
  });
});
