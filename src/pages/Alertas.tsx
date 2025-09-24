import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { usePriceData } from '../context/PriceContext';

const ALERTS_STORAGE_KEY = 'btc-alerts';

type AlertDirection = 'above' | 'below';

type PriceAlert = {
  id: string;
  direction: AlertDirection;
  target: number;
  note: string;
  active: boolean;
  createdAt: string;
  triggeredAt: string | null;
};

const eurFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const formatTimestamp = (value: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const createAlertId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const loadAlerts = (): PriceAlert[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => item as Record<string, unknown>)
      .map<PriceAlert>((item) => ({
        id: typeof item.id === 'string' ? item.id : createAlertId(),
        direction: item.direction === 'below' ? 'below' : 'above',
        target: Number.isFinite(Number(item.target)) ? Number(item.target) : 0,
        note: typeof item.note === 'string' ? item.note : '',
        active: item.active !== false,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        triggeredAt: typeof item.triggeredAt === 'string' ? item.triggeredAt : null,
      }))
      .filter((alert) => alert.target > 0);
  } catch (error) {
    return [];
  }
};

const saveAlerts = (alerts: PriceAlert[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
};

export default function Alertas() {
  const { price, lastUpdated } = usePriceData();
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => loadAlerts());
  const [direction, setDirection] = useState<AlertDirection>('above');
  const [target, setTarget] = useState<string>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  useEffect(() => {
    if (!notification) return undefined;
    if (typeof window === 'undefined') return undefined;
    const timeout = window.setTimeout(() => setNotification(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  useEffect(() => {
    if (price === null || !Number.isFinite(price)) return;
    setAlerts((prev) => {
      let changed = false;
      const triggered: PriceAlert[] = [];
      const updated = prev.map((alert) => {
        if (!alert.active || alert.triggeredAt !== null) {
          return alert;
        }
        const shouldTrigger =
          (alert.direction === 'above' && price >= alert.target) ||
          (alert.direction === 'below' && price <= alert.target);
        if (!shouldTrigger) return alert;
        changed = true;
        const nextAlert = {
          ...alert,
          active: false,
          triggeredAt: new Date().toISOString(),
        };
        triggered.push(nextAlert);
        return nextAlert;
      });

      if (changed) {
        const message = triggered
          .map((alert) =>
            `${alert.direction === 'above' ? '≥' : '≤'} ${eurFormatter.format(alert.target)}`
          )
          .join(', ');
        setNotification(
          triggered.length > 1
            ? `Se activaron ${triggered.length} alertas (${message}).`
            : `Se activó una alerta (${message}).`
        );
        return updated;
      }

      return prev;
    });
  }, [price, lastUpdated]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsedTarget = Number(target);
      if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
        setError('Introduce un precio objetivo válido.');
        return;
      }

      const alert: PriceAlert = {
        id: createAlertId(),
        direction,
        target: parsedTarget,
        note: note.trim(),
        active: true,
        createdAt: new Date().toISOString(),
        triggeredAt: null,
      };

      setAlerts((prev) => [alert, ...prev]);
      setTarget('');
      setNote('');
      setError(null);
    },
    [direction, note, target]
  );

  const handleDelete = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              active: !alert.active,
            }
          : alert
      )
    );
  }, []);

  const handleReset = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              active: true,
              triggeredAt: null,
            }
          : alert
      )
    );
  }, []);

  const activeAlerts = useMemo(() => alerts.filter((alert) => alert.active).length, [alerts]);
  const triggeredAlerts = useMemo(
    () => alerts.filter((alert) => alert.triggeredAt !== null).length,
    [alerts]
  );

  return (
    <div className="content-grid">
      <section className="card" aria-labelledby="alertas-heading">
        <header className="calculator__header">
          <div>
            <h2 id="alertas-heading">Alertas de precio</h2>
            <p className="calculator__subtitle">
              Define objetivos y recibe avisos cuando el mercado alcance tus condiciones. Puedes activar,
              pausar o reiniciar cada alerta en cualquier momento.
            </p>
          </div>
          <dl>
            <div>
              <dt>Activas</dt>
              <dd>{activeAlerts}</dd>
            </div>
            <div>
              <dt>Disparadas</dt>
              <dd>{triggeredAlerts}</dd>
            </div>
          </dl>
        </header>

        <form className="calculator__profile-form" onSubmit={handleSubmit} aria-label="Crear nueva alerta">
          <div className="field">
            <label htmlFor="alert-direction">Condición</label>
            <select
              id="alert-direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value === 'below' ? 'below' : 'above')}
            >
              <option value="above">Cuando el precio sea mayor o igual que</option>
              <option value="below">Cuando el precio sea menor o igual que</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="alert-target">Precio objetivo (EUR)</label>
            <input
              id="alert-target"
              type="number"
              min="0"
              step="50"
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                if (error) setError(null);
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="alert-note">Nota (opcional)</label>
            <input
              id="alert-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej. Vender para gasto mensual"
            />
          </div>
          <button type="submit" className="primary-button">
            Guardar alerta
          </button>
        </form>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="calculator__price" role="status" aria-live="polite">
          <span className="calculator__price-value">
            Precio actual:{' '}
            {price !== null && Number.isFinite(price) ? eurFormatter.format(price) : 'Sin datos'}
          </span>
          {lastUpdated ? (
            <span className="calculator__price-updated">
              Última actualización: {formatTimestamp(lastUpdated)}
            </span>
          ) : null}
        </div>

        {notification ? (
          <div className="calculator__goal-status calculator__goal-status--info" role="status" aria-live="polite">
            <h4>Alerta activada</h4>
            <p>{notification}</p>
          </div>
        ) : null}

        {alerts.length === 0 ? (
          <p className="help">No tienes alertas guardadas. Empieza añadiendo tu primer objetivo.</p>
        ) : (
          <div className="calculator__schedule-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Condición</th>
                  <th scope="col">Nota</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último disparo</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <th scope="row">
                      {alert.direction === 'above' ? '≥' : '≤'} {eurFormatter.format(alert.target)}
                    </th>
                    <td>{alert.note || '—'}</td>
                    <td>{alert.active ? 'Activa' : alert.triggeredAt ? 'Disparada' : 'Pausada'}</td>
                    <td>{formatTimestamp(alert.triggeredAt)}</td>
                    <td>
                      <div className="calculator__profile-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleToggle(alert.id)}
                        >
                          {alert.active ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleReset(alert.id)}
                          disabled={alert.triggeredAt === null}
                        >
                          Reiniciar
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleDelete(alert.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
