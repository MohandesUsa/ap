import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';

async function fullySetUp(app: TestApp, suffix: string) {
  const ownerPhone = `0916000001${suffix}`;
  const driverPhone = `0916000002${suffix}`;

  const owner = await apiCall(app.baseUrl, 'POST', '/auth/register', {
    body: { phoneNumber: ownerPhone, password: 'pass1234', fullName: `Owner ${suffix}`, role: 'owner' },
  });
  const ownerToken = (owner.body as any).accessToken;

  const truck = await apiCall(app.baseUrl, 'POST', '/trucks', {
    token: ownerToken, body: { plate: `9${suffix} س ${suffix}00 ایران 9${suffix}`, brand: `Brand${suffix}`, modelYear: '1400' },
  });
  const truckId = (truck.body as any).id;

  const invite = await apiCall(app.baseUrl, 'POST', '/invitations', {
    token: ownerToken, body: { driverPhone, truckId },
  });

  const driver = await apiCall(app.baseUrl, 'POST', '/auth/register', {
    body: { phoneNumber: driverPhone, password: 'pass1234', fullName: `Driver ${suffix}`, role: 'driver' },
  });
  const driverToken = (driver.body as any).accessToken;

  await apiCall(app.baseUrl, 'POST', `/driver/invitations/${(invite.body as any).id}/accept`, { token: driverToken });

  return { ownerToken, driverToken, truckId };
}

describe('Two independent Owner/Driver pairs stay fully isolated (Phase 3 §37)', () => {
  let app: TestApp;
  let pairA: Awaited<ReturnType<typeof fullySetUp>>;
  let pairB: Awaited<ReturnType<typeof fullySetUp>>;

  before(async () => {
    app = await startTestApp();
    pairA = await fullySetUp(app, '1');
    pairB = await fullySetUp(app, '2');
  });
  after(async () => { await app.close(); });

  test("Owner B's truck list never contains Owner A's truck", async () => {
    const res = await apiCall(app.baseUrl, 'GET', '/trucks', { token: pairB.ownerToken });
    const ids = ((res.body as any).trucks as any[]).map((t) => t.id);
    assert.ok(!ids.includes(pairA.truckId));
    assert.equal(ids.length, 1);
    assert.equal(ids[0], pairB.truckId);
  });

  test("Owner B's driver list never contains Driver A", async () => {
    const res = await apiCall(app.baseUrl, 'GET', '/drivers', { token: pairB.ownerToken });
    const truckIds = ((res.body as any).drivers as any[]).map((d) => d.truckId);
    assert.equal(truckIds.length, 1);
    assert.equal(truckIds[0], pairB.truckId);
  });

  test("Driver A's profile never shows Owner B's truck", async () => {
    const res = await apiCall(app.baseUrl, 'GET', '/drivers/me', { token: pairA.driverToken });
    assert.equal((res.body as any).currentTruck.id, pairA.truckId);
    assert.notEqual((res.body as any).currentTruck.id, pairB.truckId);
  });

  test("Owner A's dashboard counts are unaffected by Pair B's data", async () => {
    const res = await apiCall(app.baseUrl, 'GET', '/owner/dashboard', { token: pairA.ownerToken });
    assert.equal((res.body as any).truckCount, 1);
    assert.equal((res.body as any).driverCount, 1);
  });

  test("Driver A's access token cannot read Owner B's truck directly", async () => {
    const res = await apiCall(app.baseUrl, 'GET', `/trucks/${pairB.truckId}`, { token: pairA.driverToken });
    // Driver-role tokens are rejected by the owner-only route entirely (403), independent of
    // the ownership check itself — both are enforced, and either failure mode proves isolation.
    assert.ok(res.status === 403 || res.status === 404);
  });

  test("Owner A's token cannot be used against Owner B's truck update endpoint", async () => {
    const res = await apiCall(app.baseUrl, 'PUT', `/trucks/${pairB.truckId}`, {
      token: pairA.ownerToken, body: { brand: 'hijacked' },
    });
    assert.equal(res.status, 404);
  });
});
