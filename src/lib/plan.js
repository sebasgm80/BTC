import { differenceInMonths, differenceInWeeks } from 'date-fns';
import { calcularRetiros } from './strategies.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toNumberOrNull = (value) => (Number.isFinite(value) ? value : null);

const buildPriceSeries = (startPrice, endPrice, length) => {
  const safeLength = Math.max(0, Math.floor(length));
  if (safeLength <= 0) return [];
  const start = Number.isFinite(startPrice) ? startPrice : Number.isFinite(endPrice) ? endPrice : 0;
  const end = Number.isFinite(endPrice) ? endPrice : start;
  if (safeLength === 1) {
    return [end];
  }
  const series = new Array(safeLength);
  for (let index = 0; index < safeLength; index += 1) {
    const ratio = safeLength === 1 ? 0 : index / (safeLength - 1);
    series[index] = start + (end - start) * ratio;
  }
  return series;
};

const normalizeSeries = (series, fallback, length) => {
  const safeLength = Math.max(0, Math.floor(length));
  const normalized = Array.isArray(series) ? series.slice(0, safeLength) : [];
  if (normalized.length >= safeLength) {
    return normalized;
  }
  const lastValue = normalized.length > 0 ? normalized[normalized.length - 1] : null;
  const safeFallback = Number.isFinite(fallback)
    ? fallback
    : Number.isFinite(lastValue)
    ? lastValue
    : 0;
  while (normalized.length < safeLength) {
    normalized.push(safeFallback);
  }
  return normalized;
};

const computePayoutDate = (start, frequency, step) => {
  const base = new Date(start.getTime());
  if (frequency === 'weekly') {
    base.setDate(base.getDate() + 7 * step);
  } else {
    const initialDay = base.getDate();
    base.setMonth(base.getMonth() + step);
    if (base.getDate() < initialDay) {
      base.setDate(0);
    }
  }
  return base;
};

const resolveStrategyParams = (strategy, config, context) => {
  const { periods, withdrawable, scenarioPrices, frequency, global } = context;
  const params = {
    N: periods,
    W0: withdrawable,
    precios: scenarioPrices,
  };

  const feePercent = toNumberOrNull(global?.feePercent);
  const minWithdrawal = toNumberOrNull(global?.minWithdrawal);
  const maxWithdrawal = toNumberOrNull(global?.maxWithdrawal);

  if (Number.isFinite(feePercent) && feePercent > 0) {
    params.feePct = clamp(feePercent / 100, 0, 1);
  }
  if (Number.isFinite(minWithdrawal) && minWithdrawal > 0) {
    params.rMin = Math.max(0, minWithdrawal);
  }
  if (Number.isFinite(maxWithdrawal) && maxWithdrawal > 0) {
    params.rMax = Math.max(0, maxWithdrawal);
  }

  switch (strategy) {
    case 'porcentaje_fijo': {
      const annualPercent = toNumberOrNull(config?.annualPercent);
      const periodPercent = toNumberOrNull(config?.periodPercent);
      const periodsPerYear = frequency === 'weekly' ? 52 : 12;
      const basePercent = Number.isFinite(periodPercent)
        ? Math.max(0, periodPercent) / 100
        : Number.isFinite(annualPercent)
        ? Math.max(0, annualPercent) / 100 / periodsPerYear
        : 0.04 / periodsPerYear;
      params.p = basePercent;
      return params;
    }
    case 'creciente': {
      const growth = toNumberOrNull(config?.growthPercent);
      params.g = Number.isFinite(growth) ? growth / 100 : 0.01;
      return params;
    }
    case 'disminucion': {
      const decay = toNumberOrNull(config?.decayPercent);
      params.d = Number.isFinite(decay) ? decay / 100 : 0.01;
      return params;
    }
    case 'volatilidad': {
      const pUp = toNumberOrNull(config?.pUpPercent);
      const pDown = toNumberOrNull(config?.pDownPercent);
      const window = toNumberOrNull(config?.maWindow);
      params.pUp = Number.isFinite(pUp) ? Math.max(0, pUp) / 100 : 0.03;
      params.pDown = Number.isFinite(pDown) ? Math.max(0, pDown) / 100 : 0.005;
      params.window = Number.isFinite(window) ? Math.max(1, Math.floor(window)) : 20;
      return params;
    }
    case 'metas': {
      const milestone = toNumberOrNull(config?.milestonePercent);
      params.m = Number.isFinite(milestone) ? Math.max(0, milestone) / 100 : 0.1;
      const mode = config?.portionMode === 'fixed' ? 'fixed' : 'percent';
      const rawValue = toNumberOrNull(config?.portionValue);
      const defaultValue = mode === 'fixed' ? 0.1 : 10;
      const value = Number.isFinite(rawValue) ? Math.max(0, rawValue) : defaultValue;
      params.pOrFixed = mode === 'percent' ? value / 100 : value;
      return params;
    }
    case 'hibrido': {
      const base = toNumberOrNull(config?.baseBtc);
      const beta = toNumberOrNull(config?.betaFactor);
      params.rBase = Number.isFinite(base) ? Math.max(0, base) : 0;
      params.beta = Number.isFinite(beta) ? Math.max(0, beta) : 0;
      return params;
    }
    case 'uniforme_eur': {
      const objetivo = toNumberOrNull(config?.targetEur);
      params.objetivoEUR = Number.isFinite(objetivo) ? Math.max(0, objetivo) : 0;
      return params;
    }
    default:
      return params;
  }
};

const createSchedule = ({
  amounts,
  baseSeries,
  scenarioSeries,
  withdrawable,
  frequency,
  now,
  targetDate,
}) => {
  const schedule = [];
  const limitDate = targetDate ? new Date(targetDate) : null;
  let remaining = withdrawable;

  for (let index = 0; index < amounts.length; index += 1) {
    const amount = Math.max(0, amounts[index] ?? 0);
    if (amount <= 0) {
      continue;
    }
    const payoutDate = computePayoutDate(now, frequency, index + 1);
    if (limitDate && payoutDate > limitDate) {
      break;
    }
    const actualPrice = baseSeries[index] ?? 0;
    const scenarioPrice = scenarioSeries[index] ?? actualPrice;
    const amountEur = actualPrice > 0 ? amount * actualPrice : 0;
    const projectedAmountEur = scenarioPrice > 0 ? amount * scenarioPrice : 0;
    remaining = Math.max(0, remaining - amount);
    schedule.push({
      index,
      amountBtc: amount,
      amountEur,
      projectedAmountEur,
      remainingBtc: remaining,
      date: payoutDate,
      label: payoutDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    });
  }

  return schedule;
};

export const getPeriodsUntilDate = (targetDate, frequency, now = new Date()) => {
  if (!targetDate) return 0;
  const parsedTarget = new Date(targetDate);
  if (Number.isNaN(parsedTarget.getTime())) return 0;
  if (parsedTarget <= now) return 0;

  if (frequency === 'weekly') {
    const diff = differenceInWeeks(parsedTarget, now);
    return diff <= 0 ? 1 : diff;
  }

  const diff = differenceInMonths(parsedTarget, now);
  return diff <= 0 ? 1 : diff;
};

export const calculateWithdrawPlan = ({
  walletBtc,
  protectedBtc,
  frequency,
  targetDate,
  price,
  projectedPrice,
  strategy = 'uniforme',
  strategyConfig = {},
  globalConfig = {},
  scenarioPrices,
  basePrices,
  now = new Date(),
}) => {
  const safeWallet = Number.isFinite(walletBtc) ? walletBtc : 0;
  const safeProtected = clamp(Number.isFinite(protectedBtc) ? protectedBtc : 0, 0, Number.MAX_SAFE_INTEGER);
  const withdrawable = Math.max(0, safeWallet - safeProtected);
  const periods = getPeriodsUntilDate(targetDate, frequency, now);

  const safePeriods = Math.max(0, periods);
  const scenarioSeries = normalizeSeries(
    scenarioPrices ?? buildPriceSeries(price, projectedPrice, safePeriods),
    projectedPrice ?? price ?? 0,
    safePeriods
  );
  const baseSeries = normalizeSeries(
    basePrices ?? (Number.isFinite(price) ? new Array(safePeriods).fill(price) : scenarioSeries),
    price ?? projectedPrice ?? 0,
    safePeriods
  );

  if (safePeriods === 0 || withdrawable <= 0) {
    return {
      withdrawable,
      periods: safePeriods,
      schedule: [],
      totals: { btc: 0, eur: 0, projectedEur: 0 },
      averagePerPeriodBtc: 0,
      averagePerPeriodEur: 0,
      monthlyAverageBtc: 0,
      monthlyAverageEur: 0,
      monthlyProjectedEur: 0,
      firstWithdrawal: null,
      priceSeries: { base: baseSeries, scenario: scenarioSeries },
      rawWithdrawals: new Array(safePeriods).fill(0),
      remainingBtc: withdrawable,
      isValid: false,
    };
  }

  const params = resolveStrategyParams(strategy, strategyConfig, {
    periods: safePeriods,
    withdrawable,
    scenarioPrices: scenarioSeries,
    frequency,
    global: globalConfig,
  });

  const withdrawals = calcularRetiros(strategy, params);
  const amounts = withdrawals.length >= safePeriods
    ? withdrawals.slice(0, safePeriods)
    : withdrawals.concat(new Array(safePeriods - withdrawals.length).fill(0));

  let totalBtc = 0;
  let totalEur = 0;
  let totalProjectedEur = 0;

  for (let index = 0; index < safePeriods; index += 1) {
    const amount = Math.max(0, amounts[index] ?? 0);
    totalBtc += amount;
    const actualPrice = baseSeries[index] ?? 0;
    const scenarioPrice = scenarioSeries[index] ?? actualPrice;
    totalEur += actualPrice > 0 ? amount * actualPrice : 0;
    totalProjectedEur += scenarioPrice > 0 ? amount * scenarioPrice : 0;
  }

  const schedule = createSchedule({
    amounts,
    baseSeries,
    scenarioSeries,
    withdrawable,
    frequency,
    now,
    targetDate,
  });

  const averagePerPeriodBtc = safePeriods > 0 ? totalBtc / safePeriods : 0;
  const averagePerPeriodEur = safePeriods > 0 ? totalEur / safePeriods : 0;
  const averagePerPeriodProjectedEur = safePeriods > 0 ? totalProjectedEur / safePeriods : 0;
  const monthlyFactor = frequency === 'weekly' ? 4.345 : 1;

  return {
    withdrawable,
    periods: safePeriods,
    schedule,
    totals: {
      btc: totalBtc,
      eur: totalEur,
      projectedEur: totalProjectedEur,
    },
    averagePerPeriodBtc,
    averagePerPeriodEur,
    monthlyAverageBtc: averagePerPeriodBtc * monthlyFactor,
    monthlyAverageEur: averagePerPeriodEur * monthlyFactor,
    monthlyProjectedEur: averagePerPeriodProjectedEur * monthlyFactor,
    firstWithdrawal: schedule.length > 0 ? schedule[0] : null,
    priceSeries: { base: baseSeries, scenario: scenarioSeries },
    rawWithdrawals: amounts,
    remainingBtc: Math.max(0, withdrawable - totalBtc),
    isValid: safePeriods > 0 && withdrawable > 0 && totalBtc > 0,
  };
};
