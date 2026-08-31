import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';

async function registerOwner(app: TestApp, phone: string) {
  const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
    body: { phoneNumber: phone, password: 'secret123', fullName: `Owner ${phone}`, role: 'owner' },
  });
  return res.body as { accessToken: string; userId: string };
}

async function registerDriver(app: TestApp, phone: string) {
  const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
    body: { phoneNumber: phone, password: 'secret123', fullName: `Driver ${phone}`, role: 'driver' },
  });
  return res.body as { accessToken: string; userId: string };
}

async function createTruck(app: TestApp, ownerToken: string, plate: string) {
  const res = await apiCall(app.baseUrl, 'POST', '/trucks', {
    token: ownerToken, body: { plate, brand: 'ولوو', modelYear: '1401' },
  });
  return (res.body as any).id as string;
}

describe('Invitations', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('full invite -> accept flow connects driver to truck', async () => {
    const owner = await registerOwner(app, '09140000001');
    const truckId = await createTruck(app, owner.accessToken, '22 الف 100 ایران 22');

    const invite = await apiCall(app.baseUrl, 'POST', '/invitations', {
      token: owner.accessToken,
      body: { driverPhone: '09140000002', truckId },
    });
    assert.equal(invite.status, 201);
    const invitationId = (invite.body as any).id;

    const driver = await registerDriver(app, '09140000002');

    const pending = await apiCall(app.baseUrl, 'GET', '/driver/invitations', { token: driver.accessToken });
    assert.equal(pending.status, 200);
    assert.equal((pending.body as any).invitations.length, 1);

    const accept = await apiCall(app.baseUrl, 'POST', `/driver/invitations/${invitationId}/accept`, {
      token: driver.accessToken,
    });
    assert.equal(accept.status, 200);
    assert.ok((accept.body as any).driverTruckId);

    const driverProfile = await apiCall(app.baseUrl, 'GET', '/drivers/me', { token: driver.accessToken });
    assert.equal((driverProfile.body as any).currentTruck.id, truckId);

    const ownerDrivers = await apiCall(app.baseUrl, 'GET', '/drivers', { token: owner.accessToken });
    assert.equal((ownerDrivers.body as any).drivers.length, 1);
    assert.equal((ownerDrivers.body as any).drivers[0].truckId, truckId);
  });

  test('CRITICAL: an accepted invitation cannot be accepted twice', async () => {
    const owner = await registerOwner(app, '09140000003');
    const truckId = await createTruck(app, owner.accessToken, '22 ب 200 ایران 22');
    const invite = await apiCall(app.baseUrl, 'POST', '/invitations', {
      token: owner.accessToken, body: { driverPhone: '09140000004', truckId },
    });
    const invitationId = (invite.body as any).id;
    const driver = await registerDriver(app, '09140000004');

    const firstAccept = await apiCall(app.baseUrl, 'POST', `/driver/invitations/${invitationId}/accept`, {
      token: driver.accessToken,
    });
    assert.equal(firstAccept.status, 200);

    const secondAccept = await apiCall(app.baseUrl, 'POST', `/driver/invitations/${invitationId}/accept`, {
      token: driver.accessToken,
    });
    assert.equal(secondAccept.status, 409);
  });

  test('CRITICAL: Driver B cannot accept an invitation addressed to Driver A', async () => {
    const owner = await registerOwner(app, '09140000005');
    const truckId = await createTruck(app, owner.accessToken, '22 ج 300 ایران 22');
    const invite = await apiCall(app.baseUrl, 'POST', '/invitations', {
      token: owner.accessToken, body: { driverPhone: '09140000006', truckId }, // addressed to driver A's phone
    });
    const invitationId = (invite.body as any).id;

    const driverB = await registerDriver(app, '09140000007'); // different phone entirely

    const hijackAttempt = await apiCall(app.baseUrl, 'POST', `/driver/invitations/${invitationId}/accept`, {
      token: driverB.accessToken,
    });
    assert.equal(hijackAttempt.status, 403);

    // Driver A (the real recipient) can still accept it afterwards — proves it wasn't consumed.
    const driverA = await registerDriver(app, '09140000006');
    const realAccept = await apiCall(app.baseUrl, 'POST', `/driver/invitations/${invitationId}/accept`, {
      token: driverA.accessToken,
    });
    assert.equal(realAccept.status, 200);
  });

  test('accepting a nonexistent invitation returns 404', async () => {
    const driver = await registerDriver(app, '09140000008');
    const res = await apiCall(app.baseUrl, 'POST', '/driver/invitations/does-not-exist/accept', {
      token: driver.accessToken,
    });
    assert.equal(res.status, 404);
  });

  test('an expired invitation cannot be accepted', async () => {
    const shortTtlApp = await startTestApp({ invitationTtlSeconds: 0 });
    try {
      const owner = await registerOwner(shortTtlApp, '09140000009');
      const truckId = await createTruck(shortTtlApp, owner.accessToken, '22 د 400 ایران 22');
      const invite = await apiCall(shortTtlApp.baseUrl, 'POST', '/invitations', {
        token: owner.accessToken, body: { driverPhone: '09140000010', truckId },
      });
      const invitationId = (invite.body as any).id;

      await new Promise((r) => setTimeout(r, 50));

      const driver = await registerDriver(shortTtlApp, '09140000010');
      const attempt = await apiCall(shortTtlApp.baseUrl, 'POST', `/driver/invitations/${invitationId}/accept`, {
        token: driver.accessToken,
      });
      assert.equal(attempt.status, 409);
    } finally {
      await shortTtlApp.close();
    }
  });

  test('owner can disconnect a driver from a truck (soft, keeps history)', async () => {
    const owner = await registerOwner(app, '09140000011');
    const truckId = await createTruck(app, owner.accessToken, '22 ه 500 ایران 22');
    const invite = await apiCall(app.baseUrl, 'POST', '/invitations', {
      token: owner.accessToken, body: { driverPhone: '09140000012', truckId },
    });
    const driver = await registerDriver(app, '09140000012');
    const accept = await apiCall(app.baseUrl, 'POST', `/driver/invitations/${(invite.body as any).id}/accept`, {
      token: driver.accessToken,
    });
    const driverTruckId = (accept.body as any).driverTruckId;

    const disconnect = await apiCall(app.baseUrl, 'DELETE', `/owner/drivers/${driverTruckId}`, {
      token: owner.accessToken,
    });
    assert.equal(disconnect.status, 200);

    const driverProfile = await apiCall(app.baseUrl, 'GET', '/drivers/me', { token: driver.accessToken });
    assert.equal((driverProfile.body as any).currentTruck, null);
  });
});
