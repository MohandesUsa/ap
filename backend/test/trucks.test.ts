import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';

async function registerOwner(app: TestApp, phone: string) {
  const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
    body: { phoneNumber: phone, password: 'secret123', fullName: `Owner ${phone}`, role: 'owner', deviceId: `device-${phone}` },
  });
  return res.body as { accessToken: string; userId: string };
}

describe('Trucks', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('owner can create a truck with a valid plate', async () => {
    const owner = await registerOwner(app, '09130000001');
    const res = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: owner.accessToken,
      body: { plate: '22 الف 262 ایران 22', brand: 'ولوو', modelYear: '1401' },
    });
    assert.equal(res.status, 201);
    assert.equal((res.body as any).plate, '22 الف 262 ایران 22');
  });

  test('creating a truck with a malformed plate is rejected', async () => {
    const owner = await registerOwner(app, '09130000002');
    const res = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: owner.accessToken,
      body: { plate: 'not-a-plate', brand: 'ولوو', modelYear: '1401' },
    });
    assert.equal(res.status, 422);
  });

  test('duplicate plate across different owners is rejected with 409', async () => {
    const ownerA = await registerOwner(app, '09130000003');
    const ownerB = await registerOwner(app, '09130000004');
    const plate = '11 ب 100 ایران 11';

    const first = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: ownerA.accessToken, body: { plate, brand: 'X', modelYear: '1400' },
    });
    assert.equal(first.status, 201);

    const second = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: ownerB.accessToken, body: { plate, brand: 'Y', modelYear: '1400' },
    });
    assert.equal(second.status, 409);
  });

  test('a driver cannot create a truck (role-gated)', async () => {
    const driverRes = await apiCall(app.baseUrl, 'POST', '/auth/register', {
      body: { phoneNumber: '09130000005', password: 'secret123', fullName: 'Driver', role: 'driver', deviceId: 'device-09130000005' },
    });
    const { accessToken } = driverRes.body as any;

    const res = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: accessToken, body: { plate: '22 الف 262 ایران 22', brand: 'X', modelYear: '1400' },
    });
    assert.equal(res.status, 403);
  });

  test('unauthenticated request is rejected', async () => {
    const res = await apiCall(app.baseUrl, 'GET', '/trucks');
    assert.equal(res.status, 401);
  });

  test("CRITICAL: Owner A cannot read Owner B's truck by id (Phase 3 §20)", async () => {
    const ownerA = await registerOwner(app, '09130000006');
    const ownerB = await registerOwner(app, '09130000007');

    const created = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: ownerA.accessToken, body: { plate: '33 ج 300 ایران 33', brand: 'A-truck', modelYear: '1400' },
    });
    const truckId = (created.body as any).id;

    const asOwnerA = await apiCall(app.baseUrl, 'GET', `/trucks/${truckId}`, { token: ownerA.accessToken });
    assert.equal(asOwnerA.status, 200);

    const asOwnerB = await apiCall(app.baseUrl, 'GET', `/trucks/${truckId}`, { token: ownerB.accessToken });
    assert.equal(asOwnerB.status, 404); // not 403 — see truck.routes.ts comment on why 404

    const listAsOwnerB = await apiCall(app.baseUrl, 'GET', '/trucks', { token: ownerB.accessToken });
    const idsB = ((listAsOwnerB.body as any).trucks as any[]).map((t) => t.id);
    assert.ok(!idsB.includes(truckId));
  });

  test("CRITICAL: Owner B cannot update or delete Owner A's truck", async () => {
    const ownerA = await registerOwner(app, '09130000008');
    const ownerB = await registerOwner(app, '09130000009');

    const created = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: ownerA.accessToken, body: { plate: '44 د 400 ایران 44', brand: 'A-truck', modelYear: '1400' },
    });
    const truckId = (created.body as any).id;

    const updateAttempt = await apiCall(app.baseUrl, 'PUT', `/trucks/${truckId}`, {
      token: ownerB.accessToken, body: { brand: 'hijacked' },
    });
    assert.equal(updateAttempt.status, 404);

    const deleteAttempt = await apiCall(app.baseUrl, 'DELETE', `/trucks/${truckId}`, { token: ownerB.accessToken });
    assert.equal(deleteAttempt.status, 404);

    // Confirm the truck is untouched.
    const stillThere = await apiCall(app.baseUrl, 'GET', `/trucks/${truckId}`, { token: ownerA.accessToken });
    assert.equal(stillThere.status, 200);
    assert.equal((stillThere.body as any).brand, 'A-truck');
  });

  test('owner can edit and soft-delete their own truck', async () => {
    const owner = await registerOwner(app, '09130000010');
    const created = await apiCall(app.baseUrl, 'POST', '/trucks', {
      token: owner.accessToken, body: { plate: '55 ه 500 ایران 55', brand: 'Old', modelYear: '1400' },
    });
    const truckId = (created.body as any).id;

    const updated = await apiCall(app.baseUrl, 'PUT', `/trucks/${truckId}`, {
      token: owner.accessToken, body: { brand: 'New' },
    });
    assert.equal(updated.status, 200);
    assert.equal((updated.body as any).brand, 'New');

    const deleted = await apiCall(app.baseUrl, 'DELETE', `/trucks/${truckId}`, { token: owner.accessToken });
    assert.equal(deleted.status, 200);

    const afterDelete = await apiCall(app.baseUrl, 'GET', `/trucks/${truckId}`, { token: owner.accessToken });
    assert.equal(afterDelete.status, 404); // soft-deleted trucks are not returned

    const list = await apiCall(app.baseUrl, 'GET', '/trucks', { token: owner.accessToken });
    const ids = ((list.body as any).trucks as any[]).map((t) => t.id);
    assert.ok(!ids.includes(truckId));
  });
});
