import { differenceInMonths, differenceInWeeks } from 'date-fns';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
  now = new Date(),
}) => {
  const safeWallet = Number.isFinite(walletBtc) ? walletBtc : 0;
  const safeProtected = clamp(Number.isFinite(protectedBtc) ? protectedBtc : 0, 0, Number.MAX_SAFE_INTEGER);
  const withdrawable = Math.max(0, safeWallet - safeProtected);
  const periods = getPeriodsUntilDate(targetDate, frequency, now);
  const perPeriodBtc = periods > 0 && withdrawable > 0 ? withdrawable / periods : 0;
  const perPeriodEur = price && perPeriodBtc > 0 ? perPeriodBtc * price : 0;
  const projectedPerPeriodEur = projectedPrice && perPeriodBtc > 0 ? perPeriodBtc * projectedPrice : 0;

  return {
    withdrawable,
    periods,
    perPeriodBtc,
    perPeriodEur,
    projectedPerPeriodEur,
    isValid: periods > 0 && withdrawable > 0,
  };
};
