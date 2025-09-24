import './AppHeader.css';
import { NavLink } from 'react-router-dom';
import { usePriceData } from '../context/PriceContext';

const SOURCE_LABELS: Record<string, string> = {
  coindesk: 'CoinDesk',
  coingecko: 'CoinGecko',
  binance: 'Binance',
};

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

export function AppHeader() {
  const { price, source, loading, error, lastUpdated, refresh } = usePriceData();
  const formattedPrice = price && Number.isFinite(price) ? priceFormatter.format(price) : 'Sin datos';
  const sourceLabel = source ? SOURCE_LABELS[source] ?? source : 'Proveedor desconocido';
  const updatedLabel = lastUpdated ? formatTime(lastUpdated) : null;
  const statusMessage = error ?? formattedPrice;
  const secondaryMessage = error ? 'Revisa tu conexión' : sourceLabel;

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">
            ₿
          </span>
          <div>
            <span className="app-header__title">Calculadora BTC</span>
            <span className="app-header__subtitle">Planifica tus retiros con control total</span>
          </div>
        </div>
        <nav className="app-header__nav" aria-label="Navegación principal">
          <NavLink to="/" end className="app-header__link">
            Calculadora
          </NavLink>
          <NavLink to="/escenarios" className="app-header__link">
            Escenarios
          </NavLink>
          <NavLink to="/dashboard" className="app-header__link">
            Dashboard
          </NavLink>
          <NavLink to="/metodologia" className="app-header__link">
            Metodología
          </NavLink>
          <NavLink to="/alertas" className="app-header__link">
            Alertas
          </NavLink>
          <NavLink to="/terminos" className="app-header__link">
            Términos
          </NavLink>
        </nav>
        <div className="app-header__actions">
          <div className="app-header__price" role="status" aria-live="polite">
            <span className={`app-header__price-value${error ? ' app-header__price-value--error' : ''}`}>
              {statusMessage}
            </span>
            <span className="app-header__price-meta">
              {secondaryMessage}
              {updatedLabel && !error ? ` · ${updatedLabel}` : ''}
            </span>
          </div>
          <button
            type="button"
            className="secondary-button app-header__refresh"
            onClick={() => refresh()}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar precio'}
          </button>
        </div>
      </div>
    </header>
  );
}
