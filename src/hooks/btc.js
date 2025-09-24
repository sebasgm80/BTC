import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * @typedef {Object} BTCState
 * @property {number | null} price
 * @property {'coindesk' | 'coingecko' | 'binance' | null} source
 * @property {boolean} loading
 * @property {string | null} error
 * @property {string | null} lastUpdated ISO string when the price was refreshed
 */

/**
 * Hook to obtain the Bitcoin price from multiple providers.
 * @param {number} [refreshMs=3600000]
 * @returns {BTCState & { refresh: () => Promise<void> }}
 */
export function UseBTCPrice(refreshMs = 60 * 60 * 1000) {
  const [state, setState] = useState(
    /** @type {BTCState} */ ({
      price: null,
      source: null,
      loading: true,
      error: null,
      lastUpdated: null,
    })
  );
  const timer = useRef(/** @type {number | null} */ (null));
  const controllerRef = useRef(/** @type {AbortController | null} */ (null));

  const fetchWithFallback = useCallback(async () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    const fetchCoindesk = async () => {
      const res = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Coindesk ${res.status}`);
      const data = await res.json();
      const price = Number(data?.bpi?.EUR?.rate_float);
      if (!Number.isFinite(price)) throw new Error('Coindesk sin EUR válido');
      return { price, source: 'coindesk' };
    };

    const fetchCoingecko = async () => {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur',
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data = await res.json();
      const price = Number(data?.bitcoin?.eur);
      if (!Number.isFinite(price)) throw new Error('CoinGecko sin EUR válido');
      return { price, source: 'coingecko' };
    };

    const fetchBinance = async () => {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCEUR', {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Binance ${res.status}`);
      const data = await res.json();
      const price = Number(data?.price);
      if (!Number.isFinite(price)) throw new Error('Binance sin precio válido');
      return { price, source: 'binance' };
    };

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const r1 = await fetchCoindesk();
      setState({
        price: r1.price,
        source: r1.source,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
      return;
    } catch (error) {
      // continúa
    }

    try {
      const r2 = await fetchCoingecko();
      setState({
        price: r2.price,
        source: r2.source,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
      return;
    } catch (error) {
      // continúa
    }

    try {
      const r3 = await fetchBinance();
      setState({
        price: r3.price,
        source: r3.source,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
      return;
    } catch (error) {
      setState(s => ({
        ...s,
        loading: false,
        error: 'No se pudo obtener el precio (Coindesk/Coingecko/Binance fallaron)',
      }));
    }
  }, []);

  useEffect(() => {
    fetchWithFallback();

    if (refreshMs > 0) {
      timer.current = window.setInterval(fetchWithFallback, refreshMs);
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [fetchWithFallback, refreshMs]);

  return { ...state, refresh: fetchWithFallback };
}
