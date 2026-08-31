import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, apiCall, type TestApp } from './helpers/testApp.ts';
import { connectedOwnerAndDriver, registerDriver } from './helpers/fixtures.ts';

describe('Expenses', () => {
  let app: TestApp;

  before(async () => { app = await startTestApp(); });
  after(async () => { await app.close(); });

  test('a connected driver can log an expense', async () => {
    const { driver } = await connectedOwnerAndDriver(app, '09160000001', '09160000002', '22 الف 100 ایران 22');
    const res = await apiCall(app.baseUrl, 'POST', '/expenses', {
      token: driver.accessToken, body: { category: 'سوخت', amount: 1200000, expenseDate: '1403/06/03' },
    });
    assert.equal(res.status, 201);
    assert.equal((res.body as any).category, 'سوخت');
    assert.equal((res.body as any).amount, 1200000);
  });

  test('a driver with no active truck cannot log an expense', async () => {
    const driver = await registerDriver(app, '09160000003');
    const res = await apiCall(app.baseUrl, 'POST', '/expenses', {
      token: driver.accessToken, body: { category: 'سوخت', amount: 100, expenseDate: '1403/06/03' },
    });
    assert.equal(res.status, 403);
  });

  test('owner sees fleet-wide expenses, isolated from other owners', async () => {
    const a = await connectedOwnerAndDriver(app, '09160000004', '09160000005', '22 ب 200 ایران 22');
    const b = await connectedOwnerAndDriver(app, '09160000006', '09160000007', '22 ج 300 ایران 22');

    await apiCall(app.baseUrl, 'POST', '/expenses', {
      token: a.driver.accessToken, body: { category: 'عوارض', amount: 50000, expenseDate: '1403/06/01' },
    });

    const ownerAExpenses = await apiCall(app.baseUrl, 'GET', '/owner/expenses', { token: a.owner.accessToken });
    assert.equal((ownerAExpenses.body as any).expenses.length, 1);

    const ownerBExpenses = await apiCall(app.baseUrl, 'GET', '/owner/expenses', { token: b.owner.accessToken });
    assert.equal((ownerBExpenses.body as any).expenses.length, 0);
  });
});
