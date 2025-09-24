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
  assert.ok(Math.abs(plan.averagePerPeriodBtc - 1 / 6) < 1e-6);
  assert.ok(plan.isValid);
  assert.ok(plan.totals.eur > 0);
  assert.ok(plan.totals.projectedEur > plan.totals.eur);
  assert.equal(plan.rawWithdrawals.length, plan.periods);
  assert.equal(plan.priceSeries.base.length, plan.periods);
  assert.equal(plan.schedule.length, plan.periods);
});

test('calculateWithdrawPlan handles porcentaje fijo strategy', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 2,
    protectedBtc: 0,
    frequency: 'monthly',
    targetDate: '2024-04-01',
    price: 30000,
    projectedPrice: 33000,
    strategy: 'porcentaje_fijo',
    strategyConfig: { annualPercent: 12 },
    now: NOW,
  });

  assert.equal(plan.periods, 3);
  assert.ok(plan.totals.btc > 0);
  assert.ok(plan.schedule.length > 0);
  assert.ok(plan.totals.btc <= plan.withdrawable + 1e-8);
});

test('calculateWithdrawPlan handles creciente strategy', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 1.2,
    protectedBtc: 0,
    frequency: 'monthly',
    targetDate: '2024-05-01',
    price: 30000,
    strategy: 'creciente',
    strategyConfig: { growthPercent: 5 },
    now: NOW,
  });

  assert.equal(plan.periods, 4);
  assert.ok(plan.isValid);
  for (let i = 1; i < plan.rawWithdrawals.length; i += 1) {
    assert.ok(plan.rawWithdrawals[i] >= plan.rawWithdrawals[i - 1] - 1e-8);
  }
});

test('calculateWithdrawPlan handles disminucion strategy', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 1,
    protectedBtc: 0,
    frequency: 'monthly',
    targetDate: '2024-05-01',
    price: 25000,
    strategy: 'disminucion',
    strategyConfig: { decayPercent: 10 },
    now: NOW,
  });

  assert.equal(plan.periods, 4);
  assert.ok(plan.isValid);
  for (let i = 1; i < plan.rawWithdrawals.length; i += 1) {
    assert.ok(plan.rawWithdrawals[i] <= plan.rawWithdrawals[i - 1] + 1e-8);
  }
});

test('calculateWithdrawPlan handles volatilidad strategy with mixed signals', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 2,
    protectedBtc: 0,
    frequency: 'monthly',
    targetDate: '2024-05-01',
    price: 20000,
    strategy: 'volatilidad',
    strategyConfig: { pUpPercent: 40, pDownPercent: 5, maWindow: 2 },
    basePrices: [20000, 19000, 21000, 22000],
    scenarioPrices: [20000, 19000, 21000, 22000],
    now: NOW,
  });

  assert.equal(plan.periods, 4);
  assert.ok(plan.isValid);
  const [first, second, third] = plan.rawWithdrawals;
  assert.ok(third > second);
  assert.ok(first >= 0);
});

test('calculateWithdrawPlan handles metas strategy with milestones', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 1,
    protectedBtc: 0,
    frequency: 'monthly',
    targetDate: '2024-05-01',
    price: 20000,
    strategy: 'metas',
    strategyConfig: { milestonePercent: 5, portionMode: 'percent', portionValue: 50 },
    basePrices: [20000, 20500, 22000, 23000],
    scenarioPrices: [20000, 20500, 22000, 23000],
    now: NOW,
  });

  assert.equal(plan.periods, 4);
  assert.deepEqual(plan.rawWithdrawals.slice(0, 2), [0, 0]);
  assert.ok(plan.rawWithdrawals[2] > 0);
});

test('calculateWithdrawPlan handles hibrido strategy', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 1,
    protectedBtc: 0,
    frequency: 'monthly',
    targetDate: '2024-05-01',
    price: 20000,
    strategy: 'hibrido',
    strategyConfig: { baseBtc: 0.05, betaFactor: 0.5 },
    basePrices: [20000, 21000, 22000, 21000],
    scenarioPrices: [20000, 21000, 22000, 21000],
    now: NOW,
  });

  assert.equal(plan.periods, 4);
  assert.ok(plan.rawWithdrawals[1] > plan.rawWithdrawals[0]);
});

test('calculateWithdrawPlan handles uniforme EUR strategy', () => {
  const plan = calculateWithdrawPlan({
    walletBtc: 0.5,
    protectedBtc: 0,
    frequency: 'monthly',
    targetDate: '2024-05-01',
    price: 25000,
    strategy: 'uniforme_eur',
    strategyConfig: { targetEur: 500 },
    basePrices: [25000, 26000, 24000, 24500],
    scenarioPrices: [25000, 26000, 24000, 24500],
    now: NOW,
  });

  assert.equal(plan.periods, 4);
  const sum = plan.rawWithdrawals.reduce((acc, value) => acc + value, 0);
  assert.ok(sum <= plan.withdrawable + 1e-8);
  assert.ok(plan.rawWithdrawals.every((value) => value >= 0));
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
  assert.equal(plan.totals.btc, 0);
  assert.equal(plan.isValid, false);
  assert.equal(plan.schedule.length, 0);
});
