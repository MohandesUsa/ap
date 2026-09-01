import { apiCall, type TestApp } from './testApp.ts';

export async function registerOwner(app: TestApp, phone: string) {
  const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
    body: { phoneNumber: phone, password: 'secret123', fullName: `Owner ${phone}`, role: 'owner', deviceId: `device-${phone}` },
  });
  return res.body as { accessToken: string; userId: string };
}

export async function registerDriver(app: TestApp, phone: string) {
  const res = await apiCall(app.baseUrl, 'POST', '/auth/register', {
    body: { phoneNumber: phone, password: 'secret123', fullName: `Driver ${phone}`, role: 'driver', deviceId: `device-${phone}` },
  });
  return res.body as { accessToken: string; userId: string };
}

export async function createTruck(app: TestApp, ownerToken: string, plate: string) {
  const res = await apiCall(app.baseUrl, 'POST', '/trucks', {
    token: ownerToken, body: { plate, brand: 'ولوو', modelYear: '1401' },
  });
  return (res.body as any).id as string;
}

/** Registers an owner + truck + driver, invites the driver onto the truck, and accepts the
 *  invitation — the "already connected" starting point every accounting-engine test needs. */
export async function connectedOwnerAndDriver(app: TestApp, ownerPhone: string, driverPhone: string, plate: string) {
  const owner = await registerOwner(app, ownerPhone);
  const truckId = await createTruck(app, owner.accessToken, plate);

  const invite = await apiCall(app.baseUrl, 'POST', '/invitations', {
    token: owner.accessToken, body: { driverPhone, truckId },
  });

  const driver = await registerDriver(app, driverPhone);
  await apiCall(app.baseUrl, 'POST', `/driver/invitations/${(invite.body as any).id}/accept`, {
    token: driver.accessToken,
  });

  const driverList = await apiCall(app.baseUrl, 'GET', '/drivers', { token: owner.accessToken });
  const driverId = (driverList.body as any).drivers[0].id as string;

  return { owner, driver, truckId, driverId };
}
