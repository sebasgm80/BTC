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

const PLAN_UPDATE_EVENT = 'btc-plan-updated';

const PLAN_STORAGE_KEYS = {
  wallet: 'walletValue',
  protected: 'btcIntocableValue',
  date: 'selectedDate',
  frequency: 'frequency',
  monthlyTarget: 'btc-monthly-target',
  variation: 'btc-price-variation',
};

const readPlanFromStorage = () => {
  if (typeof window === 'undefined') {
    return {
      walletValue: 0,
      protectedValue: 0,
      selectedDate: '',
      frequency: 'monthly',
      monthlyTarget: 0,
      variation: 0,
    };
  }

  const walletValue = Number(window.localStorage.getItem(PLAN_STORAGE_KEYS.wallet)) || 0;
  const protectedValue = Number(window.localStorage.getItem(PLAN_STORAGE_KEYS.protected)) || 0;
  const selectedDate = window.localStorage.getItem(PLAN_STORAGE_KEYS.date) || '';
  const storedFrequency = window.localStorage.getItem(PLAN_STORAGE_KEYS.frequency);
  const frequency = storedFrequency === 'weekly' ? 'weekly' : 'monthly';
  const monthlyTarget = Number(window.localStorage.getItem(PLAN_STORAGE_KEYS.monthlyTarget)) || 0;
  const variation = Number(window.localStorage.getItem(PLAN_STORAGE_KEYS.variation)) || 0;

  return {
    walletValue,
    protectedValue,
    selectedDate,
    frequency,
    monthlyTarget,
    variation,
  };
};

const getPeriodCount = (selectedDate, frequency) => {
  if (!selectedDate) return 0;
  const now = new Date();
  const target = new Date(selectedDate);
  if (Number.isNaN(target.getTime()) || target <= now) return 0;

  if (frequency === 'weekly') {
    const diffMs = target.getTime() - now.getTime();
    return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }

  const yearDiff = target.getFullYear() - now.getFullYear();
  const monthDiff = target.getMonth() - now.getMonth();
  let diff = yearDiff * 12 + monthDiff;

  if (target.getDate() > now.getDate()) {
    diff += 1;
  }

  return Math.max(diff, 1);
};

const computePlanSummary = (plan, price) => {
  const safeWallet = Math.max(plan.walletValue ?? 0, 0);
  const safeProtected = clamp(Math.max(plan.protectedValue ?? 0, 0), 0, safeWallet);
  const withdrawable = Math.max(safeWallet - safeProtected, 0);
  const periodCount = getPeriodCount(plan.selectedDate, plan.frequency);
  const hasPlan = withdrawable > 0 && periodCount > 0;
  const perPeriodBtc = hasPlan ? withdrawable / periodCount : 0;
  const perPeriodEur = price ? perPeriodBtc * price : null;
  const monthlyBtc = plan.frequency === 'weekly' ? perPeriodBtc * 4.345 : perPeriodBtc;
  const monthlyEur = price ? monthlyBtc * price : null;
  const monthlyTarget = Math.max(plan.monthlyTarget ?? 0, 0);
  const coveragePercent =
    monthlyTarget > 0 && monthlyEur !== null
      ? clamp((monthlyEur / monthlyTarget) * 100, 0, 200)
      : monthlyEur !== null
      ? clamp(monthlyEur > 0 ? 100 : 0, 0, 200)
      : 0;
  const projectedPrice = price ? price * (1 + (plan.variation ?? 0) / 100) : null;
  const projectedMonthlyEur = projectedPrice ? monthlyBtc * projectedPrice : null;
  const gap = monthlyEur !== null ? monthlyEur - monthlyTarget : null;
  const selectedDateLabel = plan.selectedDate
    ? new Date(plan.selectedDate).toLocaleDateString('es-ES', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  let status;
  if (!hasPlan) {
    status = {
      tone: 'info',
      title: 'Completa tu plan',
      description:
        'Ajusta la fecha final y la reserva de BTC en el planificador para estimar una renta mensual personalizada.',
    };
  } else if (!monthlyTarget) {
    status = {
      tone: 'balanced',
      title: 'Define un objetivo',
      description:
        'Añade un objetivo de renta mensual para visualizar si tu ritmo de retiros cumple con tus necesidades.',
    };
  } else if (gap !== null && gap >= 0) {
    status = {
      tone: gap > 0 ? 'positive' : 'balanced',
      title: gap > 0 ? 'Objetivo cubierto' : 'Objetivo alcanzado',
      description:
        gap > 0
          ? `Tu estrategia actual genera un extra de ${currencyFormatter.format(gap)} al mes sobre tu objetivo.`
          : 'Tu estrategia actual coincide con la renta objetivo planificada.',
    };
  } else {
    status = {
      tone: 'warning',
      title: 'Ajusta tu ritmo',
      description:
        gap !== null
          ? `Necesitas ${currencyFormatter.format(Math.abs(gap))} adicionales al mes para cubrir tu objetivo.`
          : 'Define más BTC retirables o amplía el plazo para acercarte a tu objetivo.',
    };
  }

  return {
    hasPlan,
    withdrawable,
    perPeriodBtc,
    perPeriodEur,
    monthlyBtc,
    monthlyEur,
    monthlyTarget,
    coveragePercent,
    projectedMonthlyEur,
    gap,
    status,
    periodCount,
    frequency: plan.frequency,
    selectedDateLabel,
    variation: plan.variation,
  };
};

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
  const [planStorage, setPlanStorage] = useState(() => readPlanFromStorage());
  const [activePanel, setActivePanel] = useState('overview');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePlanUpdate = () => {
      setPlanStorage(readPlanFromStorage());
    };

    window.addEventListener(PLAN_UPDATE_EVENT, handlePlanUpdate);
    window.addEventListener('storage', handlePlanUpdate);

    handlePlanUpdate();

    return () => {
      window.removeEventListener(PLAN_UPDATE_EVENT, handlePlanUpdate);
      window.removeEventListener('storage', handlePlanUpdate);
    };
  }, []);

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

  const planSummary = useMemo(() => computePlanSummary(planStorage, price), [planStorage, price]);

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

  const priceForecast = useMemo(() => {
    if (!price || price <= 0) return null;
    const drift = volatility?.percent ? clamp(volatility.percent / 100, 0.03, 0.28) : 0.12;
    const conservative = price * (1 - drift * 0.9);
    const baseline = price * (1 + drift * 0.15);
    const optimistic = price * (1 + drift * 1.2);
    return {
      conservative,
      baseline,
      optimistic,
      driftPercent: drift * 100,
    };
  }, [price, volatility]);

  const marketNews = useMemo(() => {
    const items = [];

    if (priceForecast) {
      items.push({
        title: 'Precio objetivo asequible',
        description: `Si BTC corrige hacia ${currencyFormatter.format(
          priceForecast.conservative
        )}, prepara compras escalonadas para promediar a la baja.`,
      });
      items.push({
        title: 'Escenario base a 30 días',
        description: `Siguiendo la deriva actual, BTC podría rondar ${currencyFormatter.format(
          priceForecast.baseline
        )} en un mes. Ajusta tus retiros si dependes de ingresos en euros.`,
      });
      items.push({
        title: 'Potencial alcista',
        description: `Un impulso equivalente a la volatilidad reciente situaría el precio cerca de ${currencyFormatter.format(
          priceForecast.optimistic
        )}. Define alertas de venta para aprovecharlo.`,
      });
    }

    if (planSummary.hasPlan && planSummary.projectedMonthlyEur !== null) {
      items.push({
        title: 'Renta bajo escenario proyectado',
        description:
          planSummary.variation && planSummary.variation !== 0
            ? `Con una variación del ${numberFormatter.format(
                planSummary.variation
              )}% obtendrías ${currencyFormatter.format(
                planSummary.projectedMonthlyEur
              )} al mes.`
            : `Tus retiros generarían ${currencyFormatter.format(
                planSummary.projectedMonthlyEur
              )} al mes en el escenario guardado.`,
      });
    }

    return items;
  }, [planSummary, priceForecast]);

  const planSteps = useMemo(
    () => [
      {
        label: 'Define una fecha de finalización',
        done: Boolean(planStorage.selectedDate && planSummary.periodCount > 0),
      },
      {
        label: 'Reserva BTC intocables',
        done: planSummary.withdrawable > 0,
      },
      {
        label: 'Fija tu renta mensual objetivo',
        done: planSummary.monthlyTarget > 0,
      },
    ],
    [planStorage.selectedDate, planSummary.monthlyTarget, planSummary.periodCount, planSummary.withdrawable]
  );

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

  const overviewMetrics = (
    <>
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

      <section className="dashboard__plan" aria-label="Seguimiento de renta mensual">
        <header className="dashboard__plan-header">
          <div>
            <h3>Renta mensual objetivo</h3>
            <p className="help">
              Revisa si tu planificación actual cubre el ingreso mensual que necesitas.
            </p>
          </div>
          <div className="dashboard__plan-target">
            <span>Objetivo</span>
            <strong>
              {planSummary.monthlyTarget
                ? currencyFormatter.format(planSummary.monthlyTarget)
                : 'Sin objetivo'}
            </strong>
          </div>
        </header>
        <div
          className={`dashboard__plan-status dashboard__plan-status--${planSummary.status.tone}`}
          role="status"
        >
          <h4>{planSummary.status.title}</h4>
          <p>{planSummary.status.description}</p>
        </div>
        <div className="dashboard__plan-cards">
          <article>
            <h4>Ingresos estimados</h4>
            <p>
              {planSummary.monthlyEur !== null
                ? currencyFormatter.format(planSummary.monthlyEur)
                : 'Completa el plan'}
            </p>
            <span className="help">
              {planSummary.monthlyBtc ? `${numberFormatter.format(planSummary.monthlyBtc)} BTC / mes` : '—'}
            </span>
          </article>
          <article>
            <h4>Escenario proyectado</h4>
            <p>
              {planSummary.projectedMonthlyEur !== null
                ? currencyFormatter.format(planSummary.projectedMonthlyEur)
                : 'Ajusta el escenario'}
            </p>
            <span className="help">
              {planSummary.selectedDateLabel
                ? `Plan hasta ${planSummary.selectedDateLabel}`
                : 'Define una fecha final'}
            </span>
          </article>
        </div>
        <div
          className="dashboard__plan-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={200}
          aria-valuenow={Math.round(planSummary.coveragePercent)}
          aria-valuetext={`Cobertura del ${Math.round(planSummary.coveragePercent)}% del objetivo mensual.`}
        >
          <span style={{ width: `${Math.min(planSummary.coveragePercent, 100)}%` }} />
        </div>
        <ul className="dashboard__plan-steps">
          {planSteps.map(step => (
            <li key={step.label} className={step.done ? 'dashboard__plan-step--done' : undefined}>
              <span aria-hidden="true">{step.done ? '✔︎' : '•'}</span>
              {step.label}
            </li>
          ))}
        </ul>
      </section>

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
    </>
  );

  const activityPanel = (
    <>
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
      ) : (
        <p className="help">Aún no hay movimientos recientes. Vuelve cuando tengas historial.</p>
      )}

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
    </>
  );

  const marketPanel = (
    <>
      <section className="dashboard__pulse" aria-label="Pulso global del mercado">
        <div className="dashboard__pulse-header">
          <div>
            <h3>Radar de mercado</h3>
            <p className="help">Contexto externo cortesía de CoinGecko para tus decisiones.</p>
          </div>
          {priceForecast ? (
            <span className="dashboard__pulse-drift">
              Volatilidad reciente: {percentageFormatter.format(priceForecast.driftPercent)}%
            </span>
          ) : null}
        </div>
        {marketPulse.loading ? (
          <p className="dashboard__pulse-status">Cargando mercado…</p>
        ) : marketPulse.error ? (
          <p className="dashboard__pulse-status dashboard__pulse-status--error">{marketPulse.error}</p>
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

      {priceForecast ? (
        <section className="dashboard__forecast" aria-label="Escenarios de precio a 30 días">
          <h3>Escenarios a 30 días</h3>
          <div className="dashboard__forecast-grid">
            <article>
              <h4>Oportunidad de compra</h4>
              <p>{currencyFormatter.format(priceForecast.conservative)}</p>
              <span className="help">Configura alertas de compra por debajo de este nivel.</span>
            </article>
            <article>
              <h4>Escenario base</h4>
              <p>{currencyFormatter.format(priceForecast.baseline)}</p>
              <span className="help">Mantén tu plan si dependes de una renta estable.</span>
            </article>
            <article>
              <h4>Impulso alcista</h4>
              <p>{currencyFormatter.format(priceForecast.optimistic)}</p>
              <span className="help">Considera ventas parciales si alcanzamos este objetivo.</span>
            </article>
          </div>
        </section>
      ) : null}

      {marketNews.length > 0 ? (
        <section className="dashboard__news" aria-label="Ideas rápidas">
          <h3>Ideas para tu estrategia</h3>
          <ul>
            {marketNews.map(item => (
              <li key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
    </>
  );

  const panels = [
    { id: 'overview', label: 'Resumen', content: overviewMetrics },
    { id: 'activity', label: 'Actividad', content: activityPanel },
    { id: 'market', label: 'Mercado', content: marketPanel },
  ];

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
            Sigue la evolución del precio, tu plan de renta y tus alertas en secciones separadas.
          </p>
        </div>
      </header>

      <nav className="dashboard__nav" aria-label="Secciones del panel">
        <div role="tablist" aria-orientation="horizontal">
          {panels.map(panel => (
            <button
              key={panel.id}
              type="button"
              role="tab"
              id={`dashboard-tab-${panel.id}`}
              aria-controls={`dashboard-panel-${panel.id}`}
              aria-selected={activePanel === panel.id}
              className={`dashboard__nav-button${
                activePanel === panel.id ? ' dashboard__nav-button--active' : ''
              }`}
              onClick={() => setActivePanel(panel.id)}
            >
              {panel.label}
            </button>
          ))}
        </div>
      </nav>

      {panels.map(panel => (
        <div
          key={panel.id}
          id={`dashboard-panel-${panel.id}`}
          role="tabpanel"
          aria-labelledby={`dashboard-tab-${panel.id}`}
          hidden={activePanel !== panel.id}
          className="dashboard__panel"
        >
          {panel.content}
        </div>
      ))}
    </section>
  );
}
