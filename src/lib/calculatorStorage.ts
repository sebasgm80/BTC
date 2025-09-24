import {
  GLOBAL_STRATEGY_DEFAULTS,
  STRATEGY_DEFINITIONS,
  GlobalStrategyConfig,
  StrategyConfigMap,
  StrategyId,
  StrategyDefinition,
  ensureStrategyId,
  mergeStrategyConfigs,
  sanitizeGlobalStrategy,
  sanitizeStrategyConfig,
  clamp,
} from './strategyCatalog';
import { createProfileId } from './id';



import { createProfileId } from './id';

export { createProfileId } from './id';
export type FrequencyOption = 'weekly' | 'monthly';

export type StoredProfile = {
  id: string;
  name: string;
  walletValue: number;
  btcIntocableValue: number;
  selectedDate: string;
  frequency: FrequencyOption;
  strategy: StrategyId;
  strategyConfig: StrategyConfigMap[StrategyId];
  globalStrategy: GlobalStrategyConfig;
  priceVariation: number;
  monthlyTarget: number;
};

export const STORAGE_KEYS = {
  walletValue: 'walletValue',
  btcIntocableValue: 'btcIntocableValue',
  selectedDate: 'selectedDate',
  frequency: 'frequency',
  profiles: 'btc-profiles',
  strategy: 'btc-withdraw-strategy',
  strategyConfig: 'btc-withdraw-strategy-config',
  globalStrategy: 'btc-withdraw-strategy-global',
  priceVariation: 'btc-price-variation',
  monthlyTarget: 'btc-monthly-target',
} as const;

export const PLAN_UPDATE_EVENT = 'btc-plan-updated';
export const VARIATION_MIN = -50;
export const VARIATION_MAX = 60;
export const MAX_PROFILES = 5;


const canUseCrypto =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';

export const createProfileId = () => {
  if (canUseCrypto) {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};



const sanitizeNumber = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const clampVariation = (value: number) =>
  clamp(value, VARIATION_MIN, VARIATION_MAX);

const normalizeProfiles = (profiles: unknown[]): StoredProfile[] => {
  return profiles
    .filter((profile) => typeof profile === 'object' && profile !== null)
    .map((profile) => profile as Record<string, unknown>)
    .filter((profile) => typeof profile.name === 'string')
    .map((profile) => {
      const strategyId = ensureStrategyId(profile.strategy);
      return {
        id: typeof profile.id === 'string' ? profile.id : createProfileId(),
        name: profile.name as string,
        walletValue: sanitizeNumber(profile.walletValue),
        btcIntocableValue: sanitizeNumber(profile.btcIntocableValue),
        selectedDate: typeof profile.selectedDate === 'string' ? profile.selectedDate : '',
        frequency: profile.frequency === 'weekly' ? 'weekly' : 'monthly',
        strategy: strategyId,
        strategyConfig: sanitizeStrategyConfig(strategyId, profile.strategyConfig),
        globalStrategy: sanitizeGlobalStrategy(profile.globalStrategy),
        priceVariation: clampVariation(sanitizeNumber(profile.priceVariation)),
        monthlyTarget: Math.max(0, sanitizeNumber(profile.monthlyTarget)),
      };
    });
};

export const readProfiles = (): StoredProfile[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.profiles);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeProfiles(parsed);
  } catch (error) {
    return [];
  }
};

export const writeProfiles = (profiles: StoredProfile[]) => {
  if (typeof window === 'undefined') return;
  const trimmed = profiles.slice(0, MAX_PROFILES);
  window.localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(trimmed));
};

export const dispatchPlanUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PLAN_UPDATE_EVENT));
};

export const subscribeToPlanUpdates = (callback: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => callback();
  window.addEventListener(PLAN_UPDATE_EVENT, handler);
  return () => window.removeEventListener(PLAN_UPDATE_EVENT, handler);
};

export const getStrategyConfigsFromStorage = (): Record<string, unknown> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.strategyConfig);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch (error) {
    return {};
  }
};

export const writeStrategyConfigsToStorage = (configs: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.strategyConfig, JSON.stringify(configs));
};

const writeGlobalStrategy = (strategy: unknown) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    STORAGE_KEYS.globalStrategy,
    JSON.stringify(strategy ?? GLOBAL_STRATEGY_DEFAULTS)
  );
};

export const applyProfileToStorage = (profile: StoredProfile) => {
  if (typeof window === 'undefined') return;
  const strategyId = ensureStrategyId(profile.strategy);
  const sanitizedStrategy = sanitizeStrategyConfig(strategyId, profile.strategyConfig);
  const sanitizedGlobal = sanitizeGlobalStrategy(profile.globalStrategy);

  window.localStorage.setItem(STORAGE_KEYS.walletValue, String(profile.walletValue ?? 0));
  window.localStorage.setItem(
    STORAGE_KEYS.btcIntocableValue,
    String(profile.btcIntocableValue ?? 0)
  );
  window.localStorage.setItem(STORAGE_KEYS.selectedDate, profile.selectedDate ?? '');
  window.localStorage.setItem(STORAGE_KEYS.frequency, profile.frequency ?? 'monthly');
  window.localStorage.setItem(STORAGE_KEYS.strategy, strategyId);

  const storedConfigs = mergeStrategyConfigs(getStrategyConfigsFromStorage());
  const nextConfigs: Record<string, unknown> = { ...storedConfigs, [strategyId]: sanitizedStrategy };
  writeStrategyConfigsToStorage(nextConfigs);

  writeGlobalStrategy(sanitizedGlobal);

  window.localStorage.setItem(
    STORAGE_KEYS.priceVariation,
    String(clampVariation(Number(profile.priceVariation) || 0))
  );
  window.localStorage.setItem(
    STORAGE_KEYS.monthlyTarget,
    String(Math.max(0, Number(profile.monthlyTarget) || 0))
  );

  dispatchPlanUpdate();
};

export const upsertProfile = (profile: StoredProfile) => {
  const profiles = readProfiles();
  const filtered = profiles.filter((item) => item.id !== profile.id);
  const nextProfiles = [profile, ...filtered];
  writeProfiles(nextProfiles);
  dispatchPlanUpdate();
  return nextProfiles;
};

export const deleteProfileById = (id: string) => {
  const profiles = readProfiles();
  const nextProfiles = profiles.filter((profile) => profile.id !== id);
  writeProfiles(nextProfiles);
  dispatchPlanUpdate();
  return nextProfiles;
};

export const renameProfile = (id: string, name: string) => {
  const profiles = readProfiles();
  const nextProfiles = profiles.map((profile) =>
    profile.id === id ? { ...profile, name: name.trim() || profile.name } : profile
  );
  writeProfiles(nextProfiles);
  dispatchPlanUpdate();
  return nextProfiles;
};

export const getStrategyDefinitionById = (id: StrategyId): StrategyDefinition | undefined =>
  STRATEGY_DEFINITIONS.find((definition) => definition.id === id);
