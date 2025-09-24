import { useEffect, useState } from 'react';
import './Header.css';
import { Image } from '../Image/Image';

const SOURCE_LABELS = {
  coindesk: 'CoinDesk',
  coingecko: 'CoinGecko',
  binance: 'Binance',
};

const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const Header = ({ price, source, lastUpdated, loading, error, onRefresh }) => {
  const formattedPrice =
    price && Number.isFinite(price) ? priceFormatter.format(price) : 'Sin datos';
  const sourceLabel = source ? SOURCE_LABELS[source] ?? source : 'Proveedor desconocido';
  const updatedLabel =
    lastUpdated && !loading && !error
      ? new Date(lastUpdated).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : null;
  const hasError = Boolean(error);
  const badgeStatus = hasError ? 'header__badge--error' : loading ? 'header__badge--loading' : '';
  const statusMessage = hasError ? error : loading ? 'Actualizando precio…' : formattedPrice;
  const sublineMessage = hasError ? 'Revisa tu conexión' : sourceLabel;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 960) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className={`header${menuOpen ? ' header--open' : ''}`}>
      <div className="header__inner">
        <div className="header__brand">
          <Image
            src="https://seeklogo.com/images/W/wrapped-bitcoin-wbtc-logo-A3917F45C9-seeklogo.com.png"
            alt="Bitcoin"
          />
          <div className="header__brand-copy">
            <h1>Calculadora de BTC</h1>
            <p>Diseña tu estrategia de retiro con datos en tiempo real.</p>
          </div>
        </div>
        <div className="header__controls">
          <button
            type="button"
            className="header__menu-toggle"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="header-navigation"
          >
            <span className="visualmente-oculto">
              {menuOpen ? 'Cerrar navegación principal' : 'Abrir navegación principal'}
            </span>
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
          <div
            className={`header__meta${menuOpen ? ' header__meta--open' : ''}`}
            id="header-navigation"
          >
            <nav className="header__actions" aria-label="Acciones rápidas">
              <a href="#calculator-heading" onClick={closeMenu}>
                Calculadora
              </a>
              <a href="#dashboard-heading" onClick={closeMenu}>
                Dashboard
              </a>
            </nav>
            <div className="header__status" role="status" aria-live="polite">
              <div className={`header__badge${badgeStatus ? ` ${badgeStatus}` : ''}`}>
                <span className="header__badge-label">{statusMessage}</span>
                <span className="header__badge-source">{sublineMessage}</span>
                {updatedLabel ? (
                  <span className="header__badge-time">Actualizado a las {updatedLabel}</span>
                ) : null}
              </div>
              {typeof onRefresh === 'function' ? (
                <button
                  type="button"
                  className="ghost-button header__refresh"
                  onClick={() => {
                    closeMenu();
                    onRefresh();
                  }}
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? 'Sincronizando…' : 'Actualizar'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
