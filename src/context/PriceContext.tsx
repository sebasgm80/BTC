import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { UseBTCPrice } from '../hooks/btc';
import {
  PriceSample,
  addPriceSample,
  clearPriceHistory,
  loadPriceHistory,
} from '../lib/priceHistory';

const AUTO_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

type PriceContextValue = {
  price: number | null;
  source: 'coindesk' | 'coingecko' | 'binance' | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
  history: PriceSample[];
  chartHistory: { time: string; price: number }[];
  clearHistory: () => void;
  toast: string | null;
  dismissToast: () => void;
  autoRefreshMs: number;
};

const PriceContext = createContext<PriceContextValue | null>(null);

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

export function PriceProvider({ children }: { children: ReactNode }) {
  const { price, source, loading, error, lastUpdated, refresh } = UseBTCPrice(
    AUTO_REFRESH_INTERVAL_MS
  );
  const [history, setHistory] = useState<PriceSample[]>(() => loadPriceHistory());
  const [toast, setToast] = useState<string | null>(null);
  const previousLoading = useRef<boolean>(loading);

  useEffect(() => {
    if (price === null || !lastUpdated) return;
    const updatedHistory = addPriceSample(price, lastUpdated);
    setHistory(updatedHistory);
  }, [price, lastUpdated]);

  useEffect(() => {
    if (!previousLoading.current || loading) {
      previousLoading.current = loading;
      return;
    }

    const message = error
      ? 'No se pudo actualizar el precio. Revisa tu conexión.'
      : lastUpdated
      ? `Precio actualizado a las ${formatTime(lastUpdated)}`
      : 'Precio actualizado';
    setToast(message);
    previousLoading.current = loading;
  }, [loading, error, lastUpdated]);

  useEffect(() => {
    if (!toast) return undefined;
    if (typeof window === 'undefined') return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const clearHistory = useCallback(() => {
    clearPriceHistory();
    setHistory([]);
  }, []);

  const chartHistory = useMemo(
    () =>
      history
        .map((entry) => ({
          time: entry.timestamp
            ? new Date(entry.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
          price: entry.price,
        }))
        .filter((item) => item.time),
    [history]
  );

  const value = useMemo<PriceContextValue>(
    () => ({
      price,
      source: source ?? null,
      loading,
      error: error ?? null,
      lastUpdated: lastUpdated ?? null,
      refresh,
      history,
      chartHistory,
      clearHistory,
      toast,
      dismissToast: () => setToast(null),
      autoRefreshMs: AUTO_REFRESH_INTERVAL_MS,
    }),
    [price, source, loading, error, lastUpdated, refresh, history, chartHistory, clearHistory, toast]
  );

  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
}

export function usePriceData(): PriceContextValue {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePriceData must be used within a PriceProvider');
  }
  return context;
}
