export interface PriceSample {
  timestamp: string;
  price: number;
}

const STORAGE_KEY = 'btc-price-history';
const MAX_SAMPLES = 500;

const isBrowser = typeof window !== 'undefined';

const parseSamples = (value: string | null): PriceSample[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const timestamp = typeof item?.timestamp === 'string' ? item.timestamp : null;
        const price = Number(item?.price);
        if (!timestamp || !Number.isFinite(price)) return null;
        return { timestamp, price } as PriceSample;
      })
      .filter((item): item is PriceSample => Boolean(item));
  } catch (error) {
    return [];
  }
};

const getStorage = (): Storage | null => {
  if (!isBrowser) return null;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
};

const persistSamples = (samples: PriceSample[]): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(samples));
  } catch (error) {
    // ignore quota exceeded errors
  }
};

export const loadPriceHistory = (): PriceSample[] => {
  const storage = getStorage();
  if (!storage) return [];
  return parseSamples(storage.getItem(STORAGE_KEY));
};

export const clearPriceHistory = (): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    // ignore
  }
};

export const addPriceSample = (price: number, timestamp: string): PriceSample[] => {
  if (!Number.isFinite(price)) return loadPriceHistory();
  const samples = loadPriceHistory();
  if (samples.length > 0) {
    const lastSample = samples[samples.length - 1];
    if (lastSample.timestamp === timestamp) {
      return samples;
    }
  }
  const nextSamples = [...samples, { timestamp, price }];
  if (nextSamples.length > MAX_SAMPLES) {
    nextSamples.splice(0, nextSamples.length - MAX_SAMPLES);
  }
  persistSamples(nextSamples);
  return nextSamples;
};
