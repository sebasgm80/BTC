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

  const aggregateErrors = useMemo(() => {
    const unique = new Set(
      [walletError, btcError, dateError, frequencyError].filter((message) => Boolean(message))
    );
    return Array.from(unique);
  }, [walletError, btcError, dateError, frequencyError]);

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
