import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { createAndLoginAdmin } from './helpers/adminFixtures.ts';

describe('Subscription plans, orders, payments, revenue (Phases 9-13)', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('SUPER_ADMIN can create a plan and it is visible on the public endpoint', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09120000001', 'SUPER_ADMIN');
    const create = await apiCall(app.baseUrl, 'POST', '/admin/subscription-plans', {
      token: accessToken, body: { name: 'Basic', durationDays: 30, price: 100000, description: 'یک ماهه' },
    });
    assert.equal(create.status, 201);
    assert.equal((create.body as any).price, 100000);

    // Phase 10: the User App reads this WITHOUT admin auth — price is never hard-coded client-side.
    const publicList = await apiCall(app.baseUrl, 'GET', '/subscription-plans');
    assert.equal(publicList.status, 200);
    assert.ok((publicList.body as any).plans.some((p: any) => p.name === 'Basic' && p.price === 100000));
  });

  test('an ADMIN (not SUPER_ADMIN) can also edit plans — SUBSCRIPTIONS_EDIT is an ADMIN-role default', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09120000002', 'ADMIN');
    const create = await apiCall(app.baseUrl, 'POST', '/admin/subscription-plans', {
      token: accessToken, body: { name: 'Professional', durationDays: 90, price: 250000 },
    });
    assert.equal(create.status, 201);
    const planId = (create.body as any).id;

    const update = await apiCall(app.baseUrl, 'PUT', `/admin/subscription-plans/${planId}`, {
      token: accessToken, body: { price: 220000 },
    });
    assert.equal(update.status, 200);
    assert.equal((update.body as any).price, 220000);
  });

  test('ACCOUNTANT can view plans/orders/payments/revenue but not edit plans', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09120000003', 'ACCOUNTANT');
    const plans = await apiCall(app.baseUrl, 'GET', '/admin/subscription-plans', { token: accessToken });
    const orders = await apiCall(app.baseUrl, 'GET', '/admin/orders', { token: accessToken });
    const payments = await apiCall(app.baseUrl, 'GET', '/admin/payments', { token: accessToken });
    const revenue = await apiCall(app.baseUrl, 'GET', '/admin/revenue', { token: accessToken });
    assert.equal(plans.status, 200);
    assert.equal(orders.status, 200);
    assert.equal(payments.status, 200);
    assert.equal(revenue.status, 200);

    const editAttempt = await apiCall(app.baseUrl, 'POST', '/admin/subscription-plans', {
      token: accessToken, body: { name: 'Hijack', durationDays: 1, price: 1 },
    });
    assert.equal(editAttempt.status, 403);
  });

  test('SUPPORT cannot view revenue or payments', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09120000004', 'SUPPORT');
    const revenue = await apiCall(app.baseUrl, 'GET', '/admin/revenue', { token: accessToken });
    const payments = await apiCall(app.baseUrl, 'GET', '/admin/payments', { token: accessToken });
    assert.equal(revenue.status, 403);
    assert.equal(payments.status, 403);
  });

  test('revenue dashboard reflects zero when no real payments exist yet (no fake data)', async () => {
    const { accessToken } = await createAndLoginAdmin(app, '09120000005', 'SUPER_ADMIN');
    const revenue = await apiCall(app.baseUrl, 'GET', '/admin/revenue', { token: accessToken });
    assert.equal(revenue.status, 200);
    assert.equal((revenue.body as any).allTime, 0);
  });
});
