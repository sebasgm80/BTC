import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import Header from './components/Header/Header';
import { Calculator } from './components/Calculator/Calculator';
import { Dashboard } from './components/Dashboard/Dashboard';
import { UseBTCPrice } from './hooks/btc';

const HISTORY_STORAGE_KEY = 'btc-history';
const MAX_HISTORY_POINTS = 30;
const AUTO_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const safeParseHistory = value => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => ({
        time: typeof item?.time === 'string' ? item.time : null,
        price: Number(item?.price),
      }))
      .filter(item => item.time && Number.isFinite(item.price));
  } catch (error) {
    return [];
  }
};

function App() {
  const { price, source, loading, error, lastUpdated, refresh } = UseBTCPrice(
    AUTO_REFRESH_INTERVAL_MS
  );
  const [history, setHistory] = useState(() => {
    if (typeof window === 'undefined') return [];
    return safeParseHistory(window.localStorage.getItem(HISTORY_STORAGE_KEY));
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (price === null || !lastUpdated) return;
    setHistory(prevHistory => {
      const lastEntry = prevHistory.at(-1);
      if (lastEntry && lastEntry.time === lastUpdated) {
        return prevHistory;
      }

      const nextHistory = [...prevHistory, { time: lastUpdated, price }];
      if (nextHistory.length > MAX_HISTORY_POINTS) {
        return nextHistory.slice(nextHistory.length - MAX_HISTORY_POINTS);
      }
      return nextHistory;
    });
  }, [price, lastUpdated]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const chartData = useMemo(
    () =>
      history.map(entry => ({
        time: new Date(entry.time).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        price: entry.price,
      })),
    [history]
  );

  return (
    <div className="app-shell">
      <Header
        price={price}
        source={source}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
      />
      <main className="content-grid">
        <Calculator
          price={price}
          source={source}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
        />
        <Dashboard
          username="Ada Lovelace"
          avatarUrl="https://i.pravatar.cc/100?img=5"
          history={chartData}
          rawHistory={history}
          price={price}
          source={source}
          lastUpdated={lastUpdated}
          onClearHistory={clearHistory}
          autoRefreshMs={AUTO_REFRESH_INTERVAL_MS}
        />
      </main>
    </div>
  );
}

export default App;
