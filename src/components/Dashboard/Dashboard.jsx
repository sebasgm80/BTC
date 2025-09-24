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
              <Tooltip formatter={tooltipFormatter} labelClassName="dashboard__tooltip-label" />
              <Area type="monotone" dataKey="price" stroke="#f7931a" fill="url(#priceGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="dashboard__empty">
            El historial se completará automáticamente cuando obtengamos el precio de BTC.
          </p>
        )}
      </div>

      <footer className="dashboard__footer">
        <button type="button" onClick={onClearHistory} className="secondary-button">
          Limpiar historial
        </button>
      </footer>
    </section>
  );
}
