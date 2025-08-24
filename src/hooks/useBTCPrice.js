import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook to fetch current Bitcoin price.
 * @param {('USD'|'EUR')} currency - Currency code.
 * @param {number} [refreshMs=60000] - Refresh interval in milliseconds. Set to 0 to disable auto refresh.
 * @returns {{price: number|null, loading: boolean, error: string|null, refetch: () => Promise<void>}}
 */
export default function useBTCPrice(currency = 'USD', refreshMs = 60000) {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchPrice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency.toLowerCase()}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const value = data?.bitcoin?.[currency.toLowerCase()];
      if (!Number.isFinite(value)) throw new Error('Precio no disponible');
      setPrice(value);
    } catch (err) {
      setError(err.message || 'Error desconocido');
      setPrice(null);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchPrice();
    if (refreshMs > 0) {
      intervalRef.current = setInterval(fetchPrice, refreshMs);
      return () => clearInterval(intervalRef.current);
    }
    return undefined;
  }, [fetchPrice, refreshMs]);

  return { price, loading, error, refetch: fetchPrice };
}

