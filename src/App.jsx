import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header/Header';
import { Calculator } from './components/Calculator/Calculator';
import { Dashboard } from './components/Dashboard/Dashboard';
import { UseBTCPrice } from './hooks/btc';
import { Metodologia } from './components/Metodologia';
import { TerminosPage } from './pages/terminos';
import {
  addPriceSample,
  clearPriceHistory as resetPriceHistory,
  loadPriceHistory,
} from './lib/priceHistory';

const AUTO_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

function App() {
  const { price, source, loading, error, lastUpdated, refresh } = UseBTCPrice(
    AUTO_REFRESH_INTERVAL_MS
  );
  const [history, setHistory] = useState(() => loadPriceHistory());
  const [toastMessage, setToastMessage] = useState(null);
  const previousLoading = useRef(loading);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (price === null || !lastUpdated) return;
    const updatedHistory = addPriceSample(price, lastUpdated);
    setHistory(updatedHistory);
  }, [price, lastUpdated]);

  useEffect(() => {
    if (previousLoading.current && !loading) {
      const message = error
        ? 'No se pudo actualizar el precio. Revisa tu conexión.'
        : lastUpdated
        ? `Precio actualizado a las ${new Date(lastUpdated).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : 'Precio actualizado';
      setToastMessage(message);
    }
    previousLoading.current = loading;
  }, [loading, error, lastUpdated]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    if (typeof window === 'undefined') return undefined;
    const timeout = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!showTerms || typeof window === 'undefined') return undefined;
    const handleKey = event => {
      if (event.key === 'Escape') {
        setShowTerms(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showTerms]);

  const clearHistory = useCallback(() => {
    resetPriceHistory();
    setHistory([]);
  }, []);

  const openTerms = useCallback(() => {
    setShowTerms(true);
  }, []);

  const closeTerms = useCallback(() => {
    setShowTerms(false);
  }, []);

  const chartData = useMemo(
    () =>
      history
        .map(entry => ({
          time: entry.timestamp
            ? new Date(entry.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null,
          price: entry.price,
        }))
        .filter(item => item.time !== null),
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
        <Metodologia />
      </main>
      <footer className="app-footer">
        <p>
          Esta herramienta no constituye asesoramiento financiero. Las criptomonedas implican alto riesgo. Haz tu propia
          investigación.
        </p>
        <button type="button" className="app-footer__link" onClick={openTerms}>
          Ver términos de uso
        </button>
      </footer>
      {toastMessage ? (
        <div
          className="app-toast"
          role="status"
          aria-live="polite"
          onClick={() => setToastMessage(null)}
        >
          {toastMessage}
        </div>
      ) : null}
      {showTerms ? (
        <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="terminos-heading">
          <div className="app-modal__content">
            <button
              type="button"
              className="ghost-button app-modal__close"
              onClick={closeTerms}
              aria-label="Cerrar términos de uso"
            >
              Cerrar
            </button>
            <TerminosPage />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
