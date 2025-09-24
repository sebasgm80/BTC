import { useEffect, useMemo, useState } from "react";
import { differenceInMonths, differenceInWeeks } from "date-fns";
import "./Calculator.css";

const sourceLabels = {
  coindesk: "CoinDesk",
  coingecko: "CoinGecko",
  binance: "Binance",
};

const btcFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 6,
  maximumFractionDigits: 6,
});

const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const PROFILE_STORAGE_KEY = "btc-profiles";
const VARIATION_STORAGE_KEY = "btc-price-variation";
const VARIATION_MIN = -50;
const VARIATION_MAX = 60;
const SCHEDULE_PREVIEW_LIMIT = 12;

const createProfileId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readProfiles = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((profile) => typeof profile?.name === "string")
      .map((profile) => ({
        id: typeof profile?.id === "string" ? profile.id : createProfileId(),
        name: profile.name,
        walletValue: Number(profile?.walletValue) || 0,
        btcIntocableValue: Number(profile?.btcIntocableValue) || 0,
        selectedDate: typeof profile?.selectedDate === "string" ? profile.selectedDate : "",
        frequency: profile?.frequency === "weekly" ? "weekly" : "monthly",
      }));
  } catch (error) {
    return [];
  }
};

export function Calculator({ price, source, loading, error, lastUpdated, onRefresh }) {
  const readNumberFromStorage = (key) => {
    if (typeof window === "undefined") return 0;
    const storedValue = window.localStorage.getItem(key);
    const parsedValue = Number(storedValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  };

  const readStringFromStorage = (key) => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(key) ?? "";
  };

  const [walletValue, setWalletValue] = useState(() => readNumberFromStorage("walletValue"));
  const [btcIntocableValue, setBtcIntocableValue] = useState(() =>
    readNumberFromStorage("btcIntocableValue")
  );
  const [selectedDate, setSelectedDate] = useState(() => readStringFromStorage("selectedDate"));
  const [frequency, setFrequency] = useState(() => {
    if (typeof window === "undefined") return "monthly";
    return window.localStorage.getItem("frequency") ?? "monthly";
  });
  const [profiles, setProfiles] = useState(() => readProfiles());
  const [profileName, setProfileName] = useState("");
  const [priceVariation, setPriceVariation] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.localStorage.getItem(VARIATION_STORAGE_KEY);
    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, VARIATION_MIN), VARIATION_MAX);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("walletValue", String(walletValue));
  }, [walletValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("btcIntocableValue", String(btcIntocableValue));
  }, [btcIntocableValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("selectedDate", selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("frequency", frequency);
  }, [frequency]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VARIATION_STORAGE_KEY, String(priceVariation));
  }, [priceVariation]);

  const handleWalletChange = (event) => {
    const value = Number(event.target.value);
    setWalletValue(Number.isNaN(value) ? 0 : value);
  };

  const handleBtcIntocableChange = (event) => {
    const value = Number(event.target.value);
    setBtcIntocableValue(Number.isNaN(value) ? 0 : value);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const handleFrequencyChange = (event) => {
    setFrequency(event.target.value);
  };

  const calculatePeriodsDifference = () => {
    if (!selectedDate) return 0;
    const currentDate = new Date();
    const parsedSelectedDate = new Date(selectedDate);
    if (Number.isNaN(parsedSelectedDate.getTime())) return 0;
    if (parsedSelectedDate <= currentDate) return 0;

    if (frequency === "weekly") {
      const diff = differenceInWeeks(parsedSelectedDate, currentDate);
      return diff === 0 ? 1 : diff;
    }

    const diff = differenceInMonths(parsedSelectedDate, currentDate);
    return diff === 0 ? 1 : diff;
  };

  const periodsDifference = calculatePeriodsDifference();
  const validDate = Boolean(selectedDate) && periodsDifference > 0;
  const periodLabel = frequency === "weekly" ? "semanal" : "mensual";

  const walletError = walletValue < 0 ? "El valor debe ser positivo" : "";
  const btcError =
    btcIntocableValue < 0
      ? "El valor debe ser positivo"
      : btcIntocableValue > walletValue
      ? "No puede superar el total"
      : "";
  const dateError =
    selectedDate === ""
      ? "Selecciona una fecha"
      : !validDate
      ? "La fecha debe ser futura"
      : "";
  const frequencyError = selectedDate && !validDate ? "La fecha debe ser futura" : "";

  const calculateTotalBTCValue = () => {
    if (!validDate) return 0;
    const withdrawable = walletValue - btcIntocableValue;
    if (withdrawable <= 0) return 0;
    return withdrawable / periodsDifference;
  };
  const totalBTCValue = calculateTotalBTCValue();
  const totalEURValue = price ? totalBTCValue * price : 0;
  const safeWalletValue = walletValue > 0 ? walletValue : 0;
  const safeProtectedValue = Math.max(btcIntocableValue, 0);
  const withdrawable = Math.max(safeWalletValue - safeProtectedValue, 0);
  const preserved = Math.min(safeProtectedValue, safeWalletValue);
  const withdrawablePercent = safeWalletValue > 0 ? (withdrawable / safeWalletValue) * 100 : 0;
  const preservedPercent = safeWalletValue > 0 ? (preserved / safeWalletValue) * 100 : 0;
  const withdrawablePercentLabel = Math.round(withdrawablePercent);
  const preservedPercentLabel = Math.round(preservedPercent);

  const projectedPrice = price ? price * (1 + priceVariation / 100) : null;
  const projectedEURValue = projectedPrice ? totalBTCValue * projectedPrice : 0;
  const eurDifference = projectedEURValue - totalEURValue;
  const eurDifferenceLabel =
    eurDifference === 0
      ? "Sin variación"
      : `${eurDifference > 0 ? "+" : "-"}${eurFormatter.format(Math.abs(eurDifference))}`;
  const scenarioLabel =
    priceVariation === 0
      ? "Escenario neutro"
      : priceVariation > 0
      ? "Escenario optimista"
      : "Escenario conservador";

  const aggregateErrors = useMemo(() => {
    const unique = new Set(
      [walletError, btcError, dateError, frequencyError].filter((message) => Boolean(message))
    );
    return Array.from(unique);
  }, [walletError, btcError, dateError, frequencyError]);

  const schedule = useMemo(() => {
    if (!validDate || totalBTCValue <= 0 || periodsDifference <= 0 || withdrawable <= 0) {
      return [];
    }

    const items = [];
    const currentDate = new Date();
    const limitDate = new Date(selectedDate);
    const amountPerPeriod = withdrawable / periodsDifference;

    for (let index = 0; index < Math.min(periodsDifference, SCHEDULE_PREVIEW_LIMIT); index += 1) {
      const payoutDate = new Date(currentDate);
      if (frequency === "weekly") {
        payoutDate.setDate(payoutDate.getDate() + 7 * (index + 1));
      } else {
        payoutDate.setMonth(payoutDate.getMonth() + (index + 1));
      }

      if (payoutDate > limitDate) break;

      const remaining = Math.max(withdrawable - amountPerPeriod * (index + 1), 0);
      const formattedDate = payoutDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      items.push({
        id: `${payoutDate.toISOString()}-${index}`,
        label: formattedDate,
        amount: amountPerPeriod,
        amountLabel: btcFormatter.format(amountPerPeriod),
        eurLabel: price ? eurFormatter.format(amountPerPeriod * price) : "—",
        projectedLabel: projectedPrice
          ? eurFormatter.format(amountPerPeriod * projectedPrice)
          : "—",
        remainingLabel: btcFormatter.format(remaining),
        raw: {
          amount: amountPerPeriod,
          eur: price ? amountPerPeriod * price : null,
          projected: projectedPrice ? amountPerPeriod * projectedPrice : null,
          label: formattedDate,
        },
      });
    }

    return items;
  }, [
    frequency,
    periodsDifference,
    price,
    projectedPrice,
    selectedDate,
    totalBTCValue,
    validDate,
    withdrawable,
  ]);

  const scheduleAvailable = schedule.length > 0;

  const strategyTip = useMemo(() => {
    if (!validDate || withdrawable <= 0) {
      return {
        tone: "info",
        title: "Construye tu plan",
        description:
          "Define una fecha futura y reserva una cantidad protegida para visualizar recomendaciones personalizadas.",
      };
    }

    if (withdrawablePercent >= 70) {
      return {
        tone: "warning",
        title: "Ritmo acelerado",
        description:
          "Estás destinando más del 70% de tu cartera a retiros programados. Considera ampliar el plazo o aumentar los BTC protegidos para tener mayor colchón.",
      };
    }

    if (withdrawablePercent <= 30) {
      return {
        tone: "positive",
        title: "Margen disponible",
        description:
          "Tu porcentaje de retiros es moderado. Podrías añadir un escenario alternativo con un ritmo más ambicioso para comparar resultados.",
      };
    }

    return {
      tone: "balanced",
      title: "Estrategia equilibrada",
      description:
        "Tu planificación reparte los retiros de forma estable. Guarda este escenario y ajusta el slider de precio para evaluar posibles movimientos del mercado.",
    };
  }, [validDate, withdrawable, withdrawablePercent]);

  const adviceToneClass = `calculator__advice--${strategyTip.tone}`;

  const handleScheduleExport = () => {
    if (!scheduleAvailable || typeof window === "undefined") return;

    const csvHeader = "Fecha,BTC,Valor EUR actual,Valor EUR escenario\n";
    const csvRows = schedule
      .map(({ raw }) => {
        const amount = raw.amount.toFixed(8);
        const eur = raw.eur !== null ? raw.eur.toFixed(2) : "";
        const projected = raw.projected !== null ? raw.projected.toFixed(2) : "";
        return `${raw.label},${amount},${eur},${projected}`;
      })
      .join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plan-retiro-btc.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleProfileSave = (event) => {
    event.preventDefault();
    if (!profileName.trim()) return;
    const newProfile = {
      id: createProfileId(),
      name: profileName.trim(),
      walletValue,
      btcIntocableValue,
      selectedDate,
      frequency,
    };
    setProfiles((prev) => [newProfile, ...prev].slice(0, 5));
    setProfileName("");
  };

  const handleProfileLoad = (profile) => {
    setWalletValue(profile.walletValue);
    setBtcIntocableValue(profile.btcIntocableValue);
    setSelectedDate(profile.selectedDate);
    setFrequency(profile.frequency ?? "monthly");
  };

  const handleProfileDelete = (id) => {
    setProfiles((prev) => prev.filter((profile) => profile.id !== id));
  };

  return (
    <section className="calculator card" aria-labelledby="calculator-heading">
      <header className="calculator__header">
        <div>
          <h2 id="calculator-heading">Planifica tus retiros</h2>
          <p className="calculator__subtitle">
            Ajusta los valores y guarda escenarios para compararlos después.
          </p>
        </div>
        <button type="button" onClick={() => onRefresh?.()} className="secondary-button">
          Actualizar precio
        </button>
      </header>

      <div className="calculator__price" role="status" aria-live="polite">
        {loading ? (
          <span>Cargando precio en tiempo real…</span>
        ) : error ? (
          <span className="error">{error}</span>
        ) : (
          <>
            <span className="calculator__price-value">
              {price ? eurFormatter.format(price) : "Sin datos"}
            </span>
            <span className="calculator__price-source">
              Fuente: {source ? sourceLabels[source] ?? source : "Desconocida"}
            </span>
            {lastUpdated ? (
              <span className="calculator__price-updated">
                Última actualización: {new Date(lastUpdated).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </>
        )}
      </div>

      {aggregateErrors.length > 0 && (
        <div className="calculator__errors" role="alert">
          <h3>Revisa estos campos:</h3>
          <ul>
            {aggregateErrors.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <form className="calculator__form" onSubmit={(event) => event.preventDefault()}>
        <div className="field">
          <label htmlFor="date">Fecha final</label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            aria-describedby={dateError ? "date-error" : "date-help"}
          />
          {dateError ? (
            <p id="date-error" className="error">
              {dateError}
            </p>
          ) : (
            <p id="date-help" className="help">
              Selecciona la fecha límite para agotar tus BTC retirables.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="frequency">Frecuencia de retiro</label>
          <select
            id="frequency"
            value={frequency}
            onChange={handleFrequencyChange}
            aria-describedby="frequency-help"
          >
            <option value="monthly">Mensual</option>
            <option value="weekly">Semanal</option>
          </select>
          <p id="frequency-help" className="help">
            Calcularemos el monto {periodLabel} que puedes retirar.
          </p>
        </div>

        <div className="field">
          <label htmlFor="wallet">Wallet</label>
          <input
            id="wallet"
            type="number"
            value={walletValue}
            onChange={handleWalletChange}
            aria-describedby={walletError ? "wallet-error" : "wallet-help"}
            min="0"
            step="0.00000001"
          />
          {walletError ? (
            <p id="wallet-error" className="error">
              {walletError}
            </p>
          ) : (
            <p id="wallet-help" className="help">
              Total de BTC disponibles en tu cartera.
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="btc">BTC intocable</label>
          <input
            id="btc"
            type="number"
            value={btcIntocableValue}
            onChange={handleBtcIntocableChange}
            aria-describedby={btcError ? "btc-error" : "btc-help"}
            min="0"
            step="0.00000001"
          />
          {btcError ? (
            <p id="btc-error" className="error">
              {btcError}
            </p>
          ) : (
            <p id="btc-help" className="help">
              Cantidad de BTC que prefieres mantener intacta.
            </p>
          )}
        </div>

        <div className="calculator__result">
          <h3>{`Retiro ${periodLabel}`}</h3>
          <p className="calculator__result-value">{btcFormatter.format(totalBTCValue)} BTC</p>
          <p className="calculator__result-eur">{eurFormatter.format(totalEURValue)}</p>
        </div>

        <div className="calculator__insights">
          <div
            className="calculator__progress"
            role="group"
            aria-label="Distribución actual de tu cartera"
          >
            <div
              className="calculator__progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={withdrawablePercentLabel}
              aria-valuetext={`Puedes retirar ${btcFormatter.format(withdrawable)} BTC, que representan el ${withdrawablePercentLabel}% de tu cartera.`}
            >
              <span
                className="calculator__progress-segment calculator__progress-segment--withdrawable"
                style={{ flexBasis: `${withdrawablePercent}%`, flexGrow: withdrawablePercent }}
              />
              <span
                className="calculator__progress-segment calculator__progress-segment--protected"
                style={{ flexBasis: `${preservedPercent}%`, flexGrow: preservedPercent }}
              />
            </div>
            <div className="calculator__progress-legend">
              <span className="calculator__progress-chip calculator__progress-chip--withdrawable">
                Retirable: {btcFormatter.format(withdrawable)} BTC ({withdrawablePercentLabel}%)
              </span>
              <span className="calculator__progress-chip calculator__progress-chip--protected">
                Resguardo: {btcFormatter.format(preserved)} BTC ({preservedPercentLabel}%)
              </span>
            </div>
          </div>
          <p className="calculator__insights-note">
            {withdrawable > 0
              ? `Tu estrategia libera ${btcFormatter.format(withdrawable)} BTC para retiros escalonados.`
              : 'Ajusta los valores para liberar BTC retirables y visualizar un plan de retiros.'}
          </p>
        </div>

        <section className="calculator__scenario" aria-label="Simulador de precio futuro">
          <header className="calculator__scenario-header">
            <div>
              <h3>{scenarioLabel}</h3>
              <p>
                Ajusta el comportamiento del mercado para estimar el valor de tus retiros.
              </p>
            </div>
            <span className="calculator__scenario-badge">{priceVariation}%</span>
          </header>
          <label htmlFor="price-variation" className="visualmente-oculto">
            Variación hipotética del precio
          </label>
          <input
            id="price-variation"
            type="range"
            min={VARIATION_MIN}
            max={VARIATION_MAX}
            value={priceVariation}
            onChange={(event) => setPriceVariation(Number(event.target.value))}
          />
          <dl className="calculator__scenario-stats">
            <div>
              <dt>Proyección del precio</dt>
              <dd>{projectedPrice ? eurFormatter.format(projectedPrice) : 'Sin datos'}</dd>
            </div>
            <div>
              <dt>Retiro estimado</dt>
              <dd>{projectedPrice ? eurFormatter.format(projectedEURValue) : 'Sin datos'}</dd>
            </div>
            <div>
              <dt>Diferencia vs. actual</dt>
              <dd className={eurDifference >= 0 ? 'calculator__scenario-positive' : 'calculator__scenario-negative'}>
                {eurDifferenceLabel}
              </dd>
            </div>
          </dl>
        </section>

        <section className={`calculator__advice ${adviceToneClass}`} aria-live="polite">
          <h3>{strategyTip.title}</h3>
          <p>{strategyTip.description}</p>
        </section>

        <section className="calculator__schedule" aria-label="Próximos retiros programados">
          <div className="calculator__schedule-header">
            <div>
              <h3>Calendario de retiros</h3>
              <p className="help">
                Visualiza hasta {SCHEDULE_PREVIEW_LIMIT} periodos con el valor proyectado de cada pago.
              </p>
            </div>
            <button
              type="button"
              className="ghost-button"
              disabled={!scheduleAvailable}
              onClick={handleScheduleExport}
            >
              Exportar CSV
            </button>
          </div>
          {scheduleAvailable ? (
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">BTC</th>
                  <th scope="col">Valor actual</th>
                  <th scope="col">Escenario</th>
                  <th scope="col">Saldo restante</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.label}</th>
                    <td>{item.amountLabel}</td>
                    <td>{item.eurLabel}</td>
                    <td>{item.projectedLabel}</td>
                    <td>{item.remainingLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="help">
              Configura una fecha futura y libera BTC retirables para generar el calendario.
            </p>
          )}
        </section>
      </form>

      <section className="calculator__profiles" aria-labelledby="profiles-heading">
        <div className="calculator__profiles-header">
          <h3 id="profiles-heading">Escenarios guardados</h3>
          <p className="help">
            Guarda hasta cinco configuraciones distintas para compararlas más tarde.
          </p>
        </div>
        <form className="calculator__profile-form" onSubmit={handleProfileSave}>
          <label className="visualmente-oculto" htmlFor="profile-name">
            Nombre del escenario
          </label>
          <input
            id="profile-name"
            type="text"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Ej. Estrategia conservadora"
          />
          <button type="submit" className="primary-button">
            Guardar escenario
          </button>
        </form>

        {profiles.length === 0 ? (
          <p className="help">Aún no tienes escenarios guardados.</p>
        ) : (
          <ul className="calculator__profiles-list">
            {profiles.map((profile) => (
              <li key={profile.id} className="calculator__profile-item">
                <div>
                  <h4>{profile.name}</h4>
                  <dl>
                    <div>
                      <dt>Wallet</dt>
                      <dd>{btcFormatter.format(profile.walletValue)} BTC</dd>
                    </div>
                    <div>
                      <dt>Intocable</dt>
                      <dd>{btcFormatter.format(profile.btcIntocableValue)} BTC</dd>
                    </div>
                    <div>
                      <dt>Finaliza</dt>
                      <dd>{profile.selectedDate || "Sin fecha"}</dd>
                    </div>
                    <div>
                      <dt>Frecuencia</dt>
                      <dd>{profile.frequency === "weekly" ? "Semanal" : "Mensual"}</dd>
                    </div>
                  </dl>
                </div>
                <div className="calculator__profile-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleProfileLoad(profile)}
                  >
                    Cargar
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleProfileDelete(profile.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
