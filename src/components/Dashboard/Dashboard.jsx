import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const SOURCE_LABELS = {
  coindesk: 'CoinDesk',
  coingecko: 'CoinGecko',
  binance: 'Binance',
};

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
});

const tooltipFormatter = value => currencyFormatter.format(value);

const REFRESH_INTERVAL_SECONDS = 60;

export function Dashboard({
  username = 'Guest',
  avatarUrl = 'https://i.pravatar.cc/100',
  history,
  rawHistory = [],
  price,
  source,
  lastUpdated,
  onClearHistory,
}) {
  const hasHistory = Array.isArray(history) && history.length > 0;
  const safeRawHistory = Array.isArray(rawHistory) ? rawHistory : [];
  const latestEntry = hasHistory ? safeRawHistory.at(-1) : null;
  const firstEntry = hasHistory ? safeRawHistory[0] : null;
  const variation =
    hasHistory && safeRawHistory.length > 1 && firstEntry?.price && latestEntry?.price
      ? ((latestEntry.price - firstEntry.price) / firstEntry.price) * 100
      : 0;

  const formattedVariation = `${variation >= 0 ? '+' : ''}${numberFormatter.format(
    variation
  )}%`;
  const recentHistory = hasHistory ? [...safeRawHistory].slice(-4).reverse() : [];
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);

  useEffect(() => {
    if (!lastUpdated) {
      setSecondsSinceUpdate(0);
      return undefined;
    }

    const updateCounter = () => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000)
      );
      setSecondsSinceUpdate(diff);
    };

    updateCounter();
    const interval = window.setInterval(updateCounter, 1000);
    return () => window.clearInterval(interval);
  }, [lastUpdated]);

  const timeToNextRefresh = useMemo(() => {
    if (!lastUpdated) return null;
    const modulo = secondsSinceUpdate % REFRESH_INTERVAL_SECONDS;
    return modulo === 0 ? REFRESH_INTERVAL_SECONDS : REFRESH_INTERVAL_SECONDS - modulo;
  }, [secondsSinceUpdate, lastUpdated]);

  const refreshProgress = useMemo(() => {
    if (!lastUpdated || timeToNextRefresh === null) return 0;
    return ((REFRESH_INTERVAL_SECONDS - timeToNextRefresh) / REFRESH_INTERVAL_SECONDS) * 100;
  }, [lastUpdated, timeToNextRefresh]);

  const elapsedLabel = useMemo(() => {
    if (!lastUpdated) return 'Sin datos';
    const minutes = Math.floor(secondsSinceUpdate / 60);
    const seconds = secondsSinceUpdate % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [lastUpdated, secondsSinceUpdate]);

  const nextRefreshLabel = useMemo(() => {
    if (!timeToNextRefresh) return 'Sin datos';
    return `${timeToNextRefresh}s`;
  }, [timeToNextRefresh]);

  const highestPrice = useMemo(() => {
    if (!hasHistory) return null;
    return safeRawHistory.reduce((max, entry) => (entry.price > max ? entry.price : max), 0);
  }, [hasHistory, safeRawHistory]);

  const lowestPrice = useMemo(() => {
    if (!hasHistory || safeRawHistory.length === 0) return null;
    return safeRawHistory.reduce((min, entry) => (entry.price < min ? entry.price : min), Infinity);
  }, [hasHistory, safeRawHistory]);

  const averagePrice = useMemo(() => {
    if (!hasHistory || safeRawHistory.length === 0) return null;
    const sum = safeRawHistory.reduce((total, entry) => total + entry.price, 0);
    return sum / safeRawHistory.length;
  }, [hasHistory, safeRawHistory]);

  const insights = useMemo(
    () => [
      {
        label: 'Precio medio capturado',
        value: averagePrice ? currencyFormatter.format(averagePrice) : 'Sin historial',
      },
      {
        label: 'Pico registrado',
        value: highestPrice ? currencyFormatter.format(highestPrice) : 'Sin historial',
      },
      {
        label: 'Mínimo registrado',
        value:
          lowestPrice && lowestPrice !== Infinity
            ? currencyFormatter.format(lowestPrice)
            : 'Sin historial',
      },
      {
        label: 'Capturas guardadas',
        value: hasHistory ? `${safeRawHistory.length}` : '0',
      },
    ],
    [averagePrice, hasHistory, highestPrice, lowestPrice, safeRawHistory.length]
  );

  const resources = useMemo(
    () => [
      {
        title: 'Guía DCA de Binance Academy',
        description: 'Buenas prácticas para automatizar compras y ventas periódicas.',
        href: 'https://academy.binance.com/es/articles/dollar-cost-averaging',
      },
      {
        title: 'Gestión de riesgo por Coinbase',
        description: 'Recomendaciones para equilibrar carteras cripto-volátiles.',
        href: 'https://www.coinbase.com/learn/crypto-basics/what-is-portfolio-rebalancing',
      },
      {
        title: 'Índice de miedo y codicia',
        description: 'Consulta el pulso del mercado para complementar tus escenarios.',
        href: 'https://alternative.me/crypto/fear-and-greed-index/',
      },
    ],
    []
  );

  return (
    <section className="dashboard card" aria-labelledby="dashboard-heading">
      <header className="dashboard__header">
        <img
          src={avatarUrl}
          alt={`${username} avatar`}
          width="56"
          height="56"
          className="dashboard__avatar"
        />
        <div>
          <h2 id="dashboard-heading">Hola, {username}</h2>
          <p className="dashboard__subtitle">
            Sigue la evolución del precio y tus escenarios guardados.
          </p>
        </div>
      </header>

      <dl className="dashboard__metrics">
        <div>
          <dt>Precio actual</dt>
          <dd>{price ? currencyFormatter.format(price) : 'Sin datos'}</dd>
        </div>
        <div>
          <dt>Proveedor</dt>
          <dd>{source ? SOURCE_LABELS[source] ?? source : 'Sin datos'}</dd>
        </div>
        <div>
          <dt>Actualizado</dt>
          <dd>
            {lastUpdated
              ? new Date(lastUpdated).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Sin datos'}
          </dd>
        </div>
        <div>
          <dt>Tiempo transcurrido</dt>
          <dd>{elapsedLabel}</dd>
        </div>
        <div>
          <dt>Tendencia</dt>
          <dd
            className={
              hasHistory && safeRawHistory.length > 1
                ? variation >= 0
                  ? 'dashboard__positive'
                  : 'dashboard__negative'
                : undefined
            }
          >
            {hasHistory && safeRawHistory.length > 1 ? formattedVariation : 'Sin historial'}
          </dd>
        </div>
      </dl>

      <div className="dashboard__chart" role="img" aria-label="Histórico del precio en euros">
        {hasHistory ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f7931a" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f7931a" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={value => currencyFormatter.format(value)}
                width={90}
              />
              <Tooltip
                formatter={tooltipFormatter}
                labelClassName="dashboard__tooltip-label"
                contentStyle={{
                  background: 'rgba(9, 12, 24, 0.85)',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 18px 28px rgba(0, 0, 0, 0.35)',
                  color: '#f5f5f5',
                }}
              />
              <Area type="monotone" dataKey="price" stroke="#f7931a" fill="url(#priceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="dashboard__empty">
            El historial se completará automáticamente cuando obtengamos el precio de BTC.
          </p>
        )}
      </div>

      <section className="dashboard__refresh" aria-label="Próxima actualización automática">
        <div className="dashboard__refresh-header">
          <h3>Sincronización automática</h3>
          <span className="dashboard__refresh-time">{nextRefreshLabel}</span>
        </div>
        <div className="dashboard__refresh-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(refreshProgress)}>
          <span style={{ width: `${refreshProgress}%` }} />
        </div>
        <p className="help">
          Este panel se actualiza cada {REFRESH_INTERVAL_SECONDS} segundos. Usa el botón de refresco del encabezado para forzar una nueva lectura.
        </p>
      </section>

      <section className="dashboard__insights" aria-label="Resumen del historial">
        {insights.map((item) => (
          <article key={item.label}>
            <h3>{item.label}</h3>
            <p>{item.value}</p>
          </article>
        ))}
      </section>

      {recentHistory.length > 0 ? (
        <section className="dashboard__recent" aria-label="Últimas capturas del precio">
          <h3>Últimos movimientos</h3>
          <ul className="dashboard__recent-list">
            {recentHistory.map((entry, index) => {
              const previous = recentHistory[index + 1];
              const diff = previous?.price ? entry.price - previous.price : 0;
              const diffFormatted = numberFormatter.format(Math.abs(diff));
              const diffLabel = `${diff >= 0 ? '+' : '-'}${diffFormatted}`;
              const diffClass =
                diff === 0 ? '' : diff > 0 ? 'dashboard__chip--positive' : 'dashboard__chip--negative';
              const chipContent = previous
                ? diff === 0
                  ? 'Sin cambio'
                  : `${diffLabel} EUR`
                : 'Dato inicial';

              return (
                <li key={entry.time} className="dashboard__recent-item">
                  <span className="dashboard__recent-time">
                    {new Date(entry.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="dashboard__recent-value">{currencyFormatter.format(entry.price)}</span>
                  <span className={`dashboard__chip ${diffClass}`}>{chipContent}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <footer className="dashboard__footer">
        <button type="button" onClick={onClearHistory} className="secondary-button">
          Limpiar historial
        </button>
      </footer>

      <section className="dashboard__resources" aria-label="Recursos recomendados">
        <h3>Inspiración para tu estrategia</h3>
        <ul>
          {resources.map((resource) => (
            <li key={resource.href}>
              <a href={resource.href} target="_blank" rel="noreferrer">
                <span>{resource.title}</span>
                <p>{resource.description}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
