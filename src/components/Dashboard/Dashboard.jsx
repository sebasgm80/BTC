import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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

const percentageFormatter = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 2,
});

const tooltipFormatter = value => currencyFormatter.format(value);

const TARGETS_STORAGE_KEY = 'btc-targets';

const createTargetId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `target-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const safeParseTargets = value => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(target => {
        const numericValue = Number(target?.value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
        const label =
          typeof target?.label === 'string' && target.label.trim()
            ? target.label.trim()
            : 'Objetivo sin nombre';
        const type = target?.type === 'below' ? 'below' : 'above';
        return {
          id: typeof target?.id === 'string' ? target.id : createTargetId(),
          label,
          value: numericValue,
          type,
        };
      })
      .filter(Boolean);
  } catch (error) {
    return [];
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatIntervalLabel = seconds => {
  if (!seconds) return 'sin programación';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  if (minutes) parts.push(`${minutes} min`);
  if (!hours && !minutes && secs) parts.push(`${secs} s`);
  return parts.join(' ') || `${secs} s`;
};

const formatNextRefreshLabel = seconds => {
  if (seconds === null) return 'Sin datos';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
};

const formatElapsedLabel = seconds => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      secs
    ).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const useSecondsSince = lastUpdated => {
  const [seconds, setSeconds] = useState(null);

  useEffect(() => {
    if (!lastUpdated || typeof window === 'undefined') {
      setSeconds(null);
      return undefined;
    }

    const lastUpdatedMs = new Date(lastUpdated).getTime();

    const updateCounter = () => {
      const diff = Math.max(0, Math.floor((Date.now() - lastUpdatedMs) / 1000));
      setSeconds(diff);
    };

    updateCounter();
    const interval = window.setInterval(updateCounter, 1000);
    return () => window.clearInterval(interval);
  }, [lastUpdated]);

  return seconds;
};

const ElapsedTimeTicker = memo(({ lastUpdated }) => {
  const seconds = useSecondsSince(lastUpdated);

  if (!lastUpdated || seconds === null) {
    return <span>Sin datos</span>;
  }

  return <span>{formatElapsedLabel(seconds)}</span>;
});

ElapsedTimeTicker.displayName = 'ElapsedTimeTicker';

const AutoRefreshStatus = memo(({ lastUpdated, refreshIntervalSeconds }) => {
  const secondsSinceUpdate = useSecondsSince(lastUpdated);

  const timeToNextRefresh = useMemo(() => {
    if (
      !lastUpdated ||
      !refreshIntervalSeconds ||
      secondsSinceUpdate === null ||
      secondsSinceUpdate === undefined
    ) {
      return null;
    }
    const modulo = secondsSinceUpdate % refreshIntervalSeconds;
    return modulo === 0 ? refreshIntervalSeconds : refreshIntervalSeconds - modulo;
  }, [lastUpdated, refreshIntervalSeconds, secondsSinceUpdate]);

  const refreshProgress = useMemo(() => {
    if (!lastUpdated || !refreshIntervalSeconds || timeToNextRefresh === null) return 0;
    return ((refreshIntervalSeconds - timeToNextRefresh) / refreshIntervalSeconds) * 100;
  }, [lastUpdated, refreshIntervalSeconds, timeToNextRefresh]);

  const nextRefreshLabel = useMemo(() => {
    if (!lastUpdated || timeToNextRefresh === null) return 'Sin datos';
    return formatNextRefreshLabel(timeToNextRefresh);
  }, [lastUpdated, timeToNextRefresh]);

  const refreshIntervalLabel = useMemo(
    () => formatIntervalLabel(refreshIntervalSeconds),
    [refreshIntervalSeconds]
  );

  return (
    <section className="dashboard__refresh" aria-label="Próxima actualización automática">
      <div className="dashboard__refresh-header">
        <h3>Sincronización automática</h3>
        <span className="dashboard__refresh-time">{nextRefreshLabel}</span>
      </div>
      <div
        className="dashboard__refresh-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(refreshProgress)}
      >
        <span style={{ width: `${refreshProgress}%` }} />
      </div>
      <p className="help">
        Este panel se actualiza cada {refreshIntervalLabel}. Usa el botón de refresco del encabezado
        para forzar una nueva lectura.
      </p>
    </section>
  );
});

AutoRefreshStatus.displayName = 'AutoRefreshStatus';

export function Dashboard({
  username = 'Guest',
  avatarUrl = 'https://i.pravatar.cc/100',
  history,
  rawHistory = [],
  price,
  source,
  lastUpdated,
  onClearHistory,
  autoRefreshMs = 0,
}) {
  const safeHistory = useMemo(() => (Array.isArray(history) ? history : []), [history]);
  const safeRawHistory = useMemo(() => (Array.isArray(rawHistory) ? rawHistory : []), [rawHistory]);
  const hasHistory = safeHistory.length > 0;
  const latestEntry = hasHistory ? safeRawHistory.at(-1) : null;
  const firstEntry = hasHistory ? safeRawHistory[0] : null;
  const variation =
    hasHistory && safeRawHistory.length > 1 && firstEntry?.price && latestEntry?.price
      ? ((latestEntry.price - firstEntry.price) / firstEntry.price) * 100
      : 0;

  const formattedVariation = `${variation >= 0 ? '+' : ''}${numberFormatter.format(variation)}%`;
  const recentHistory = hasHistory ? [...safeRawHistory].slice(-4).reverse() : [];
  const refreshIntervalSeconds = useMemo(
    () => (autoRefreshMs > 0 ? Math.round(autoRefreshMs / 1000) : 0),
    [autoRefreshMs]
  );
  const [targets, setTargets] = useState(() => {
    if (typeof window === 'undefined') return [];
    return safeParseTargets(window.localStorage.getItem(TARGETS_STORAGE_KEY));
  });
  const [targetLabel, setTargetLabel] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetType, setTargetType] = useState('above');
  const [targetError, setTargetError] = useState('');
  const [marketPulse, setMarketPulse] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchGlobalData = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/global', {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Global ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const raw = json?.data;
        const marketCapEur = Number(raw?.total_market_cap?.eur);
        const volumeEur = Number(raw?.total_volume?.eur);
        const btcDominance = Number(raw?.market_cap_percentage?.btc);
        const marketChange = Number(raw?.market_cap_change_percentage_24h_usd);
        const updatedAt = raw?.updated_at ? new Date(raw.updated_at * 1000).toISOString() : null;

        setMarketPulse({
          loading: false,
          error: null,
          data: {
            marketCapEur: Number.isFinite(marketCapEur) ? marketCapEur : null,
            volumeEur: Number.isFinite(volumeEur) ? volumeEur : null,
            btcDominance: Number.isFinite(btcDominance) ? btcDominance : null,
            marketChange: Number.isFinite(marketChange) ? marketChange : null,
            updatedAt,
          },
        });
      } catch (error) {
        if (cancelled) return;
        setMarketPulse({ loading: false, error: 'Datos globales no disponibles', data: null });
      }
    };

    fetchGlobalData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

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

  const volatility = useMemo(() => {
    if (!hasHistory || safeRawHistory.length < 2) return null;
    const mean =
      safeRawHistory.reduce((total, entry) => total + entry.price, 0) / safeRawHistory.length;
    if (!Number.isFinite(mean) || mean === 0) return null;
    const variance =
      safeRawHistory.reduce((total, entry) => total + Math.pow(entry.price - mean, 2), 0) /
      (safeRawHistory.length - 1);
    if (!Number.isFinite(variance)) return null;
    const stdDev = Math.sqrt(variance);
    if (!Number.isFinite(stdDev)) return null;
    return {
      stdDev,
      percent: (stdDev / mean) * 100,
    };
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
      {
        label: 'Volatilidad histórica',
        value: volatility
          ? `${numberFormatter.format(volatility.percent)}% σ`
          : 'Sin historial',
      },
    ],
    [averagePrice, hasHistory, highestPrice, lowestPrice, safeRawHistory.length, volatility]
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
      {
        title: 'Calcula tu coste medio',
        description: 'Herramientas para seguir tus compras acumuladas por precio.',
        href: 'https://www.coingecko.com/es/calculadora-de-coste-medio',
      },
    ],
    []
  );

  const marketPulseItems = useMemo(() => {
    if (!marketPulse.data) return [];
    const items = [];
    if (marketPulse.data.marketCapEur) {
      items.push({
        label: 'Capitalización global',
        value: currencyFormatter.format(marketPulse.data.marketCapEur),
      });
    }
    if (marketPulse.data.volumeEur) {
      items.push({
        label: 'Volumen 24h',
        value: currencyFormatter.format(marketPulse.data.volumeEur),
      });
    }
    if (marketPulse.data.btcDominance !== null) {
      items.push({
        label: 'Dominancia BTC',
        value: `${percentageFormatter.format(marketPulse.data.btcDominance)}%`,
      });
    }
    if (marketPulse.data.marketChange !== null) {
      const formatted = `${
        marketPulse.data.marketChange >= 0 ? '+' : ''
      }${percentageFormatter.format(marketPulse.data.marketChange)}%`;
      items.push({
        label: 'Variación mercado 24h',
        value: formatted,
        intent:
          marketPulse.data.marketChange >= 0 ? 'dashboard__positive' : 'dashboard__negative',
      });
    }
    return items;
  }, [marketPulse]);

  const marketPulseUpdatedLabel = useMemo(() => {
    if (!marketPulse.data?.updatedAt) return null;
    return new Date(marketPulse.data.updatedAt).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [marketPulse]);

  const enhancedTargets = useMemo(() => {
    if (!Array.isArray(targets)) return [];
    const currentPrice = typeof price === 'number' && Number.isFinite(price) ? price : null;
    return targets.map(target => {
      const safeValue = target.value;
      const reached =
        currentPrice === null
          ? false
          : target.type === 'above'
          ? currentPrice >= safeValue
          : currentPrice <= safeValue;
      const rawDifference =
        currentPrice === null
          ? null
          : target.type === 'above'
          ? currentPrice - safeValue
          : safeValue - currentPrice;
      let differenceLabel = 'Sin precio';
      if (rawDifference !== null) {
        if (rawDifference === 0) {
          differenceLabel = 'En objetivo';
        } else {
          const prefix = rawDifference > 0 ? '+' : '-';
          differenceLabel = `${prefix}${currencyFormatter.format(Math.abs(rawDifference))}`;
        }
      }
      let progress = 0;
      if (currentPrice && safeValue > 0) {
        if (target.type === 'above') {
          progress = clamp((currentPrice / safeValue) * 100, 0, 100);
        } else {
          progress = currentPrice <= safeValue ? 100 : clamp((safeValue / currentPrice) * 100, 0, 100);
        }
      } else if (currentPrice === 0 && safeValue > 0 && target.type === 'below') {
        progress = 100;
      }
      const statusLabel =
        currentPrice === null
          ? 'Esperando precio actual'
          : reached
          ? target.type === 'above'
            ? 'Objetivo de venta listo'
            : 'Objetivo de compra listo'
          : target.type === 'above'
          ? 'Todavía por debajo del objetivo'
          : 'Todavía por encima del objetivo';
      return {
        ...target,
        reached,
        differenceLabel,
        progress,
        statusLabel,
      };
    });
  }, [targets, price]);

  const handleAddTarget = useCallback(
    event => {
      event.preventDefault();
      const parsedValue = Number(targetValue);
      const cleanLabel = targetLabel.trim();
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        setTargetError('Introduce un importe válido en euros.');
        return;
      }
      if (!cleanLabel) {
        setTargetError('Añade un nombre descriptivo para el objetivo.');
        return;
      }
      const type = targetType === 'below' ? 'below' : 'above';
      setTargets(prev => [
        ...prev,
        { id: createTargetId(), label: cleanLabel, value: parsedValue, type },
      ]);
      setTargetLabel('');
      setTargetValue('');
      setTargetType('above');
      setTargetError('');
    },
    [targetLabel, targetValue, targetType]
  );

  const handleRemoveTarget = useCallback(id => {
    setTargets(prev => prev.filter(target => target.id !== id));
  }, []);

  const handleExportHistory = useCallback(() => {
    if (!hasHistory || typeof window === 'undefined') return;
    const header = 'time,price\n';
    const rows = safeRawHistory.map(entry => `${entry.time},${entry.price}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const formattedDate = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `btc-history-${formattedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [hasHistory, safeRawHistory]);

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
          <dd>
            <ElapsedTimeTicker lastUpdated={lastUpdated} />
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
            <AreaChart data={safeHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

      <AutoRefreshStatus
        lastUpdated={lastUpdated}
        refreshIntervalSeconds={refreshIntervalSeconds}
      />

      <section className="dashboard__insights" aria-label="Resumen del historial">
        {insights.map(item => (
          <article key={item.label}>
            <h3>{item.label}</h3>
            <p>{item.value}</p>
          </article>
        ))}
      </section>

      <section className="dashboard__pulse" aria-label="Pulso global del mercado">
        <div className="dashboard__pulse-header">
          <h3>Radar de mercado</h3>
          <p className="help">Contexto externo cortesía de CoinGecko para tus decisiones.</p>
        </div>
        {marketPulse.loading ? (
          <p className="dashboard__pulse-status">Cargando mercado…</p>
        ) : marketPulse.error ? (
          <p className="dashboard__pulse-status dashboard__pulse-status--error">
            {marketPulse.error}
          </p>
        ) : (
          <>
            <ul className="dashboard__pulse-grid">
              {marketPulseItems.map(item => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong className={item.intent}>{item.value}</strong>
                </li>
              ))}
            </ul>
            {marketPulseUpdatedLabel ? (
              <p className="dashboard__pulse-updated">Actualizado a las {marketPulseUpdatedLabel}</p>
            ) : null}
          </>
        )}
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
                  <span className="dashboard__recent-value">
                    {currencyFormatter.format(entry.price)}
                  </span>
                  <span className={`dashboard__chip ${diffClass}`}>{chipContent}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="dashboard__targets" aria-label="Alertas personales de precio">
        <div className="dashboard__targets-header">
          <h3>Alertas personalizadas</h3>
          <p className="help">Define niveles clave para reaccionar rápido ante el mercado.</p>
        </div>
        <form className="dashboard__target-form" onSubmit={handleAddTarget}>
          <label className="visualmente-oculto" htmlFor="target-label">
            Nombre del objetivo
          </label>
          <input
            id="target-label"
            name="target-label"
            type="text"
            placeholder="Etiqueta (ej. Venta parcial)"
            value={targetLabel}
            onChange={event => setTargetLabel(event.target.value)}
            required
          />
          <label className="visualmente-oculto" htmlFor="target-value">
            Precio objetivo en euros
          </label>
          <input
            id="target-value"
            name="target-value"
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio objetivo en EUR"
            value={targetValue}
            onChange={event => setTargetValue(event.target.value)}
            required
          />
          <label className="visualmente-oculto" htmlFor="target-type">
            Tipo de objetivo
          </label>
          <select
            id="target-type"
            name="target-type"
            value={targetType}
            onChange={event => setTargetType(event.target.value)}
          >
            <option value="above">Vender cuando supere</option>
            <option value="below">Comprar cuando baje a</option>
          </select>
          <button type="submit" className="primary-button dashboard__target-submit">
            Guardar objetivo
          </button>
        </form>
        {targetError ? <p className="dashboard__target-error">{targetError}</p> : null}
        <ul className="dashboard__target-list">
          {enhancedTargets.length > 0 ? (
            enhancedTargets.map(target => (
              <li
                key={target.id}
                className={`dashboard__target-item${target.reached ? ' dashboard__target-item--ready' : ''}`}
              >
                <div className="dashboard__target-heading">
                  <div>
                    <h4>{target.label}</h4>
                    <p>
                      {target.type === 'above' ? 'Superar' : 'Descender hasta'}{' '}
                      {currencyFormatter.format(target.value)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button dashboard__target-remove"
                    onClick={() => handleRemoveTarget(target.id)}
                  >
                    Quitar
                  </button>
                </div>
                <div className="dashboard__target-meta">
                  <span
                    className={`dashboard__target-status${
                      target.reached ? ' dashboard__target-status--ready' : ''
                    }`}
                  >
                    {target.statusLabel}
                  </span>
                  <span className="dashboard__target-diff">{target.differenceLabel}</span>
                  <span className="dashboard__target-progress-label">
                    Progreso {Math.round(target.progress)}%
                  </span>
                </div>
                <div
                  className="dashboard__target-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(target.progress)}
                >
                  <span style={{ width: `${target.progress}%` }} />
                </div>
              </li>
            ))
          ) : (
            <li className="dashboard__target-empty">Aún no has definido objetivos de precio.</li>
          )}
        </ul>
      </section>

      <footer className="dashboard__footer">
        <button
          type="button"
          onClick={handleExportHistory}
          className="ghost-button"
          disabled={!hasHistory}
        >
          Exportar historial
        </button>
        <button type="button" onClick={onClearHistory} className="secondary-button">
          Limpiar historial
        </button>
      </footer>

      <section className="dashboard__resources" aria-label="Recursos recomendados">
        <h3>Inspiración para tu estrategia</h3>
        <ul>
          {resources.map(resource => (
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
