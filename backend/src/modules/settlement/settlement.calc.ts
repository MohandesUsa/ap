import type { TripRow } from '../trips/trip.repository.ts';

export interface DriverPay {
  pay_type: 'percent' | 'salary';
  pay_value: number;
}

/** Mirrors the web prototype's driverNetShare(): a trip's net (income minus commission) is
 *  either the driver's percentage of it, or the whole net if the driver is salaried — used for
 *  display per-trip and for computing how much the driver has already directly received. */
export function tripDriverShare(trip: Pick<TripRow, 'income' | 'commission'>, driver: DriverPay): number {
  const net = trip.income - trip.commission;
  return driver.pay_type === 'percent' ? Math.round((net * driver.pay_value) / 100) : net;
}

/** Mirrors driverEntitlement(): a salaried driver is owed the flat monthly amount regardless of
 *  how many trips they logged; a percentage driver is owed the sum of their share across every
 *  trip on record (the prototype has no period filter either). */
export function driverEntitlement(trips: TripRow[], driver: DriverPay): number {
  if (driver.pay_type === 'salary') return driver.pay_value;
  return trips.reduce((sum, t) => sum + tripDriverShare(t, driver), 0);
}

/** Mirrors amountAlreadyWithDriver(): trips the owner has already marked settled AND paid
 *  directly to the driver (rather than to the owner) reduce what's still owed through manual
 *  payments. */
export function amountAlreadyWithDriver(trips: TripRow[], driver: DriverPay): number {
  return trips
    .filter((t) => t.settled === 1 && t.paid_to === 'driver')
    .reduce((sum, t) => sum + tripDriverShare(t, driver), 0);
}

export function settlementSummary(trips: TripRow[], expenses: { amount: number }[], driver: DriverPay, manualPaid: number) {
  const totalIncome = trips.reduce((sum, t) => sum + t.income, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const entitlement = driverEntitlement(trips, driver);
  const paidDirect = amountAlreadyWithDriver(trips, driver);
  const remaining = Math.max(entitlement - paidDirect - manualPaid, 0);
  return { totalIncome, totalExpense, entitlement, paidDirect, manualPaid, remaining };
}
