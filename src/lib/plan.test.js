import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWithdrawPlan, getPeriodsUntilDate } from './plan.js';

const NOW = new Date('2024-01-01T00:00:00.000Z');

test('getPeriodsUntilDate returns 0 for past dates', () => {
  assert.equal(getPeriodsUntilDate('2023-12-01', 'monthly', NOW), 0);
});

test('getPeriodsUntilDate returns at least 1 for close future dates', () => {
  assert.equal(getPeriodsUntilDate('2024-01-02', 'weekly', NOW), 1);
});

test('calculateWithdrawPlan distributes BTC evenly across periods', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 1.5,
    protectedBtc: 0.5,
    frequency: 'monthly',
    targetDate: '2024-07-01',
    price: 40000,
    projectedPrice: 50000,
    now: NOW,
  });

  assert.equal(plan.withdrawable, 1);
  assert.equal(plan.periods, 6);
  assert.ok(Math.abs(plan.perPeriodBtc - 1 / 6) < 1e-6);
  assert.ok(plan.isValid);
  assert.ok(plan.perPeriodEur > 0);
  assert.ok(plan.projectedPerPeriodEur > plan.perPeriodEur);
});

test('calculateWithdrawPlan handles invalid inputs', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 0.1,
    protectedBtc: 0.5,
    frequency: 'weekly',
    targetDate: 'invalid-date',
    price: null,
    projectedPrice: null,
    now: NOW,
  });

  assert.equal(plan.withdrawable, 0);
  assert.equal(plan.periods, 0);
  assert.equal(plan.perPeriodBtc, 0);
  assert.equal(plan.perPeriodEur, 0);
  assert.equal(plan.projectedPerPeriodEur, 0);
  assert.equal(plan.isValid, false);
});
