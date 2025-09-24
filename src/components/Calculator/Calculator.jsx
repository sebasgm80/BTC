import { useCallback, useEffect, useMemo, useState } from "react";
import "./Calculator.css";
import { createProfileId } from "../../lib/id";
import { calculateWithdrawPlan, getPeriodsUntilDate } from "../../lib/plan";
import {
  STRATEGY_DEFINITIONS,
  GLOBAL_STRATEGY_DEFAULTS,
  ensureStrategyId,
  sanitizeStrategyConfig,
  sanitizeGlobalStrategy,
  mergeStrategyConfigs,
  parseNullableNumber,
} from "../../lib/strategyCatalog";
import {
  STORAGE_KEYS,
  VARIATION_MIN,
  VARIATION_MAX,

  readProfiles,
  writeProfiles,
  dispatchPlanUpdate,
  createProfileId,
} from "../../lib/calculatorStorage";


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

const {
  walletValue: WALLET_STORAGE_KEY,
  btcIntocableValue: INTOCABLE_STORAGE_KEY,
  selectedDate: SELECTED_DATE_STORAGE_KEY,
  frequency: FREQUENCY_STORAGE_KEY,
  strategy: STRATEGY_STORAGE_KEY,
  strategyConfig: STRATEGY_CONFIG_STORAGE_KEY,
  globalStrategy: GLOBAL_STRATEGY_STORAGE_KEY,
  priceVariation: VARIATION_STORAGE_KEY,
  monthlyTarget: MONTHLY_TARGET_STORAGE_KEY,
} = STORAGE_KEYS;


const SCHEDULE_PREVIEW_LIMIT = 12;

const positiveOrNull = (value) =>
  Number.isFinite(value) && value > 0 ? value : null;





const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

  const [walletValue, setWalletValue] = useState(() => readNumberFromStorage(WALLET_STORAGE_KEY));
  const [btcIntocableValue, setBtcIntocableValue] = useState(() =>
    readNumberFromStorage(INTOCABLE_STORAGE_KEY)
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    readStringFromStorage(SELECTED_DATE_STORAGE_KEY)
  );
  const [frequency, setFrequency] = useState(() => {
    if (typeof window === "undefined") return "monthly";
    return window.localStorage.getItem(FREQUENCY_STORAGE_KEY) ?? "monthly";
  });
  const [profiles, setProfiles] = useState(() => readProfiles());
  const [strategy, setStrategy] = useState(() => {
    if (typeof window === "undefined") return "uniforme";
    const stored = window.localStorage.getItem(STRATEGY_STORAGE_KEY);
    return ensureStrategyId(stored);
  });
  const [strategyConfigs, setStrategyConfigs] = useState(() => {
    if (typeof window === "undefined") return mergeStrategyConfigs();
    try {
      const raw = window.localStorage.getItem(STRATEGY_CONFIG_STORAGE_KEY);
      return mergeStrategyConfigs(raw ? JSON.parse(raw) : {});
    } catch (error) {
      return mergeStrategyConfigs();
    }
  });
  const [globalStrategy, setGlobalStrategy] = useState(() => {
    if (typeof window === "undefined") return { ...GLOBAL_STRATEGY_DEFAULTS };
    try {
      const raw = window.localStorage.getItem(GLOBAL_STRATEGY_STORAGE_KEY);
      return sanitizeGlobalStrategy(raw ? JSON.parse(raw) : {});
    } catch (error) {
      return { ...GLOBAL_STRATEGY_DEFAULTS };
    }
  });
  const [profileName, setProfileName] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState(() =>
    readNumberFromStorage(MONTHLY_TARGET_STORAGE_KEY)
  );
  const [priceVariation, setPriceVariation] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.localStorage.getItem(VARIATION_STORAGE_KEY);
    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, VARIATION_MIN), VARIATION_MAX);
  });

  const notifyPlanUpdate = useCallback(() => {
    dispatchPlanUpdate();
  }, [dispatchPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WALLET_STORAGE_KEY, String(walletValue));
    notifyPlanUpdate();
  }, [walletValue, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INTOCABLE_STORAGE_KEY, String(btcIntocableValue));
    notifyPlanUpdate();
  }, [btcIntocableValue, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SELECTED_DATE_STORAGE_KEY, selectedDate);
    notifyPlanUpdate();
  }, [selectedDate, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FREQUENCY_STORAGE_KEY, frequency);
    notifyPlanUpdate();
  }, [frequency, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STRATEGY_STORAGE_KEY, strategy);
    notifyPlanUpdate();
  }, [strategy, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STRATEGY_CONFIG_STORAGE_KEY,
      JSON.stringify(strategyConfigs)
    );
    notifyPlanUpdate();
  }, [strategyConfigs, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      GLOBAL_STRATEGY_STORAGE_KEY,
      JSON.stringify(globalStrategy)
    );
    notifyPlanUpdate();
  }, [globalStrategy, notifyPlanUpdate]);

  useEffect(() => {
    writeProfiles(profiles);
    notifyPlanUpdate();
  }, [profiles, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VARIATION_STORAGE_KEY, String(priceVariation));
    notifyPlanUpdate();
  }, [priceVariation, notifyPlanUpdate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MONTHLY_TARGET_STORAGE_KEY, String(monthlyTarget));
    notifyPlanUpdate();
  }, [monthlyTarget, notifyPlanUpdate]);

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
  const handleStrategyChange = (event) => {
    setStrategy(ensureStrategyId(event.target.value));
  };
  const handleFeeChange = (event) => {
    const value = parseNullableNumber(event.target.value);
    setGlobalStrategy((prev) => ({
      ...prev,
      feePercent: value !== null ? clamp(value, 0, 100) : 0,
    }));
  };
  const handleMinChange = (event) => {
    setGlobalStrategy((prev) => ({
      ...prev,
      minWithdrawal: parseNullableNumber(event.target.value),
    }));
  };
  const handleMaxChange = (event) => {
    setGlobalStrategy((prev) => ({
      ...prev,
      maxWithdrawal: parseNullableNumber(event.target.value),
    }));
  };

  const periodsDifference = useMemo(
    () => getPeriodsUntilDate(selectedDate, frequency),
    [selectedDate, frequency]
  );
  const currentStrategyConfig = useMemo(
    () => sanitizeStrategyConfig(strategy, strategyConfigs[strategy]),
    [strategy, strategyConfigs]
  );
  const preparedGlobalStrategy = useMemo(
    () => sanitizeGlobalStrategy(globalStrategy),
    [globalStrategy]
  );
  const activeStrategyDefinition = useMemo(
    () => STRATEGY_DEFINITIONS.find((definition) => definition.id === strategy),
    [strategy]
  );
  const setStrategyConfigValue = useCallback(
    (key, value) => {
      setStrategyConfigs((prev) => ({
        ...prev,
        [strategy]: {
          ...prev[strategy],
          [key]: value,
        },
      }));
    },
    [strategy]
  );
  const periodLabel = frequency === "weekly" ? "semanal" : "mensual";
  const strategySpecificFields = useMemo(() => {
    switch (strategy) {
      case "porcentaje_fijo": {
        return (
          <>
            <div className="field">
              <label htmlFor="strategy-annual-percent">Porcentaje anual (%)</label>
              <input
                id="strategy-annual-percent"
                type="number"
                min="0"
                step="0.1"
                value={
                  currentStrategyConfig.annualPercent !== null &&
                  currentStrategyConfig.annualPercent !== undefined
                    ? currentStrategyConfig.annualPercent
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("annualPercent", parseNullableNumber(event.target.value))
                }
              />
              <p className="help">
                Divide automáticamente el porcentaje entre los periodos {periodLabel}es.
              </p>
            </div>
            <div className="field">
              <label htmlFor="strategy-period-percent">Por periodo (%) (opcional)</label>
              <input
                id="strategy-period-percent"
                type="number"
                min="0"
                step="0.01"
                placeholder="Calculado a partir del porcentaje anual"
                value={
                  currentStrategyConfig.periodPercent !== null &&
                  currentStrategyConfig.periodPercent !== undefined
                    ? currentStrategyConfig.periodPercent
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("periodPercent", parseNullableNumber(event.target.value))
                }
              />
              <p className="help">Déjalo vacío para usar el porcentaje anual.</p>
            </div>
          </>
        );
      }
      case "creciente": {
        return (
          <div className="field">
            <label htmlFor="strategy-growth">Crecimiento por periodo (%)</label>
            <input
              id="strategy-growth"
              type="number"
              min="0"
              step="0.1"
              value={
                currentStrategyConfig.growthPercent !== null &&
                currentStrategyConfig.growthPercent !== undefined
                  ? currentStrategyConfig.growthPercent
                  : ""
              }
              onChange={(event) =>
                setStrategyConfigValue("growthPercent", parseNullableNumber(event.target.value))
              }
            />
            <p className="help">Simula una renta que crece cada periodo (ej. inflación o mayores gastos).</p>
          </div>
        );
      }
      case "disminucion": {
        return (
          <div className="field">
            <label htmlFor="strategy-decay">Reducción por periodo (%)</label>
            <input
              id="strategy-decay"
              type="number"
              min="0"
              step="0.1"
              value={
                currentStrategyConfig.decayPercent !== null &&
                currentStrategyConfig.decayPercent !== undefined
                  ? currentStrategyConfig.decayPercent
                  : ""
              }
              onChange={(event) =>
                setStrategyConfigValue("decayPercent", parseNullableNumber(event.target.value))
              }
            />
            <p className="help">Empieza con retiros altos y ve reduciéndolos con el tiempo.</p>
          </div>
        );
      }
      case "volatilidad": {
        return (
          <>
            <div className="field">
              <label htmlFor="strategy-up">% sobre saldo si el precio supera la media</label>
              <input
                id="strategy-up"
                type="number"
                min="0"
                step="0.1"
                value={
                  currentStrategyConfig.pUpPercent !== null &&
                  currentStrategyConfig.pUpPercent !== undefined
                    ? currentStrategyConfig.pUpPercent
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("pUpPercent", parseNullableNumber(event.target.value))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="strategy-down">% sobre saldo en escenarios bajistas</label>
              <input
                id="strategy-down"
                type="number"
                min="0"
                step="0.05"
                value={
                  currentStrategyConfig.pDownPercent !== null &&
                  currentStrategyConfig.pDownPercent !== undefined
                    ? currentStrategyConfig.pDownPercent
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("pDownPercent", parseNullableNumber(event.target.value))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="strategy-window">Ventana media móvil (periodos)</label>
              <input
                id="strategy-window"
                type="number"
                min="1"
                step="1"
                value={currentStrategyConfig.maWindow ?? 20}
                onChange={(event) =>
                  setStrategyConfigValue("maWindow", parseNullableNumber(event.target.value))
                }
              />
            </div>
          </>
        );
      }
      case "metas": {
        return (
          <>
            <div className="field">
              <label htmlFor="strategy-milestone">Hito sobre el último precio (%)</label>
              <input
                id="strategy-milestone"
                type="number"
                min="0"
                step="0.5"
                value={
                  currentStrategyConfig.milestonePercent !== null &&
                  currentStrategyConfig.milestonePercent !== undefined
                    ? currentStrategyConfig.milestonePercent
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("milestonePercent", parseNullableNumber(event.target.value))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="strategy-portion-mode">Modo de retiro</label>
              <select
                id="strategy-portion-mode"
                value={currentStrategyConfig.portionMode ?? "percent"}
                onChange={(event) =>
                  setStrategyConfigValue(
                    "portionMode",
                    event.target.value === "fixed" ? "fixed" : "percent"
                  )
                }
              >
                <option value="percent">Porcentaje del saldo disponible</option>
                <option value="fixed">Cantidad fija en BTC</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="strategy-portion-value">
                {currentStrategyConfig.portionMode === "fixed"
                  ? "BTC a retirar cuando se cumpla el hito"
                  : "% del saldo a retirar cuando se cumpla el hito"}
              </label>
              <input
                id="strategy-portion-value"
                type="number"
                min="0"
                step={currentStrategyConfig.portionMode === "fixed" ? "0.00000001" : "0.5"}
                value={
                  currentStrategyConfig.portionValue !== null &&
                  currentStrategyConfig.portionValue !== undefined
                    ? currentStrategyConfig.portionValue
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("portionValue", parseNullableNumber(event.target.value))
                }
              />
            </div>
          </>
        );
      }
      case "hibrido": {
        return (
          <>
            <div className="field">
              <label htmlFor="strategy-base">Retiro mínimo en BTC</label>
              <input
                id="strategy-base"
                type="number"
                min="0"
                step="0.00000001"
                value={
                  currentStrategyConfig.baseBtc !== null &&
                  currentStrategyConfig.baseBtc !== undefined
                    ? currentStrategyConfig.baseBtc
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("baseBtc", parseNullableNumber(event.target.value))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="strategy-beta">Factor beta</label>
              <input
                id="strategy-beta"
                type="number"
                min="0"
                step="0.1"
                value={
                  currentStrategyConfig.betaFactor !== null &&
                  currentStrategyConfig.betaFactor !== undefined
                    ? currentStrategyConfig.betaFactor
                    : ""
                }
                onChange={(event) =>
                  setStrategyConfigValue("betaFactor", parseNullableNumber(event.target.value))
                }
              />
              <p className="help">Controla cuánto aumenta el retiro cuando el precio sube.</p>
            </div>
          </>
        );
      }
      case "uniforme_eur": {
        return (
          <div className="field">
            <label htmlFor="strategy-eur">Objetivo por periodo (EUR)</label>
            <input
              id="strategy-eur"
              type="number"
              min="0"
              step="50"
              value={
                currentStrategyConfig.targetEur !== null &&
                currentStrategyConfig.targetEur !== undefined
                  ? currentStrategyConfig.targetEur
                  : ""
              }
              onChange={(event) =>
                setStrategyConfigValue("targetEur", parseNullableNumber(event.target.value))
              }
            />
          </div>
        );
      }
      default:
        return null;
    }
  }, [strategy, currentStrategyConfig, periodLabel, setStrategyConfigValue]);
  const hasDate = Boolean(selectedDate);
  const parsedSelectedDate = hasDate ? new Date(selectedDate) : null;
  const invalidSelectedDate = hasDate && (!parsedSelectedDate || Number.isNaN(parsedSelectedDate.getTime()));
  const validDate = hasDate && !invalidSelectedDate && periodsDifference > 0;

  const walletError = walletValue < 0 ? "El valor debe ser positivo" : "";
  const btcError =
    btcIntocableValue < 0
      ? "El valor debe ser positivo"
      : btcIntocableValue > walletValue
      ? "No puede superar el total"
      : "";
  const dateError =
    !selectedDate
      ? "Selecciona una fecha"
      : invalidSelectedDate
      ? "La fecha no es válida"
      : !validDate
      ? "La fecha debe ser futura"
      : "";
  const frequencyError =
    selectedDate && !invalidSelectedDate && !validDate ? "La fecha debe ser futura" : "";

  const safeWalletValue = walletValue > 0 ? walletValue : 0;
  const safeProtectedValue = Math.max(Math.min(btcIntocableValue, safeWalletValue), 0);
  const withdrawable = Math.max(safeWalletValue - safeProtectedValue, 0);
  const projectedPrice = price ? price * (1 + priceVariation / 100) : null;

  const plan = useMemo(
    () =>
      calculateWithdrawPlan({
        walletBtc: safeWalletValue,
        protectedBtc: safeProtectedValue,
        frequency,
        targetDate: selectedDate,
        price: price ?? undefined,
        projectedPrice: projectedPrice ?? undefined,
        strategy,
        strategyConfig: currentStrategyConfig,
        globalConfig: preparedGlobalStrategy,
      }),
    [
      frequency,
      price,
      projectedPrice,
      safeProtectedValue,
      safeWalletValue,
      selectedDate,
      strategy,
      currentStrategyConfig,
      preparedGlobalStrategy,
    ]
  );

  const nextWithdrawal = plan.firstWithdrawal;
  const nextWithdrawalBTC = nextWithdrawal ? nextWithdrawal.amountBtc : 0;
  const nextWithdrawalEUR = nextWithdrawal ? positiveOrNull(nextWithdrawal.amountEur) : null;
  const nextWithdrawalProjectedEUR = nextWithdrawal
    ? positiveOrNull(nextWithdrawal.projectedAmountEur)
    : null;
  const averageWithdrawalBTC = plan.isValid ? plan.averagePerPeriodBtc : 0;
  const averageWithdrawalEUR = plan.isValid ? positiveOrNull(plan.averagePerPeriodEur) : null;
  const preserved = Math.min(safeProtectedValue, safeWalletValue);
  const withdrawablePercent = safeWalletValue > 0 ? (withdrawable / safeWalletValue) * 100 : 0;
  const preservedPercent = safeWalletValue > 0 ? (preserved / safeWalletValue) * 100 : 0;
  const withdrawablePercentLabel = Math.round(withdrawablePercent);
  const preservedPercentLabel = Math.round(preservedPercent);
  const planUsagePercent = withdrawable > 0 ? (plan.totals.btc / withdrawable) * 100 : 0;

  const monthlyPayoutBTC = plan.isValid ? plan.monthlyAverageBtc : 0;
  const monthlyPayoutEUR =
    plan.isValid && Number.isFinite(plan.monthlyAverageEur) ? plan.monthlyAverageEur : null;
  const projectedMonthlyPayoutEUR =
    plan.isValid && Number.isFinite(plan.monthlyProjectedEur) ? plan.monthlyProjectedEur : null;
  const safeMonthlyTarget = Math.max(monthlyTarget, 0);
  const eurDifference =
    monthlyPayoutEUR !== null && projectedMonthlyPayoutEUR !== null
      ? projectedMonthlyPayoutEUR - monthlyPayoutEUR
      : null;
  const eurDifferenceLabel =
    eurDifference === null
      ? "Sin datos"
      : eurDifference === 0
      ? "Sin variación"
      : `${eurDifference > 0 ? "+" : "-"}${eurFormatter.format(Math.abs(eurDifference))}`;
  const differenceToneClass =
    eurDifference === null
      ? ""
      : eurDifference >= 0
      ? "calculator__scenario-positive"
      : "calculator__scenario-negative";
  const scenarioEurLabel =
    projectedMonthlyPayoutEUR !== null
      ? eurFormatter.format(projectedMonthlyPayoutEUR)
      : monthlyPayoutEUR !== null
      ? eurFormatter.format(monthlyPayoutEUR)
      : plan.isValid
      ? "Sin precio disponible"
      : "Configura tu plan";
  const scenarioLabel =
    priceVariation === 0
      ? "Escenario neutro"
      : priceVariation > 0
      ? "Escenario optimista"
      : "Escenario conservador";
  const targetCoveragePercent =
    safeMonthlyTarget > 0 && monthlyPayoutEUR !== null
      ? clamp((monthlyPayoutEUR / safeMonthlyTarget) * 100, 0, 200)
      : monthlyPayoutEUR && monthlyPayoutEUR > 0
      ? 100
      : 0;
  const targetCoverageLabel = Math.round(targetCoveragePercent);
  const targetGap =
    safeMonthlyTarget > 0 && monthlyPayoutEUR !== null ? monthlyPayoutEUR - safeMonthlyTarget : null;

  const targetStatus = useMemo(() => {
    if (!plan.isValid || withdrawable <= 0) {
      return {
        tone: "info",
        title: "Activa tu plan",
        description:
          "Selecciona una fecha futura y libera BTC retirables para estimar tu renta mensual objetivo.",
      };
    }

    if (!safeMonthlyTarget) {
      return {
        tone: "balanced",
        title: "Añade tu objetivo",
        description:
          "Define la renta mensual que necesitas para medir la cobertura de tu estrategia de retiros.",
      };
    }

    if (targetGap !== null && targetGap >= 0) {
      return {
        tone: targetGap > 0 ? "positive" : "balanced",
        title: targetGap > 0 ? "Objetivo cubierto" : "Objetivo alcanzado",
        description:
          targetGap > 0
            ? `Tu plan genera ${eurFormatter.format(targetGap)} adicionales al mes sobre la meta.`
            : "Tu renta mensual coincide con el objetivo fijado.",
      };
    }

    return {
      tone: "warning",
      title: "Ritmo insuficiente",
      description:
        targetGap !== null
          ? `Faltan ${eurFormatter.format(Math.abs(targetGap))} al mes. Ajusta la fecha o reduce los BTC protegidos.`
          : "Aumenta la cantidad disponible para retiro o extiende el plazo para acercarte a tu meta.",
    };
  }, [plan.isValid, safeMonthlyTarget, targetGap, withdrawable]);

  const planSteps = useMemo(
    () => [
      { label: "1. Selecciona la fecha final", done: validDate },
      { label: "2. Reserva BTC intocable", done: withdrawable > 0 },
      { label: "3. Ajusta el objetivo mensual", done: safeMonthlyTarget > 0 },
    ],
    [safeMonthlyTarget, validDate, withdrawable]
  );

  const targetSliderMax = useMemo(() => {
    const base = monthlyPayoutEUR && monthlyPayoutEUR > 0 ? monthlyPayoutEUR * 2.5 : 3000;
    const withTarget = safeMonthlyTarget > 0 ? safeMonthlyTarget * 1.5 : 0;
    const candidate = Math.max(base ?? 0, withTarget ?? 0);
    return Math.max(600, Math.ceil(candidate / 100) * 100);
  }, [monthlyPayoutEUR, safeMonthlyTarget]);

  const goalStatusClass = `calculator__goal-status calculator__goal-status--${targetStatus.tone}`;

  const aggregateErrors = useMemo(() => {
    const unique = new Set(
      [walletError, btcError, dateError, frequencyError].filter((message) => Boolean(message))
    );
    return Array.from(unique);
  }, [walletError, btcError, dateError, frequencyError]);

  const schedule = useMemo(() => {
    if (!plan.isValid) {
      return [];
    }

    return plan.schedule.slice(0, SCHEDULE_PREVIEW_LIMIT).map((event) => ({
      id: `${event.index}-${event.label}`,
      label: event.label,
      amount: event.amountBtc,
      amountLabel: btcFormatter.format(event.amountBtc),
      eurLabel:
        positiveOrNull(event.amountEur) !== null ? eurFormatter.format(event.amountEur) : "—",
      projectedLabel:
        positiveOrNull(event.projectedAmountEur) !== null
          ? eurFormatter.format(event.projectedAmountEur)
          : "—",
      remainingLabel: btcFormatter.format(event.remainingBtc),
      raw: {
        amount: event.amountBtc,
        eur: event.amountEur,
        projected: event.projectedAmountEur,
        label: event.label,
      },
    }));
  }, [plan]);

  const scheduleAvailable = schedule.length > 0;

  const strategyTip = useMemo(() => {
    if (!plan.isValid || withdrawable <= 0) {
      return {
        tone: "info",
        title: "Construye tu plan",
        description:
          "Define una fecha futura y reserva una cantidad protegida para visualizar recomendaciones personalizadas.",
      };
    }

    if (planUsagePercent >= 95) {
      return {
        tone: "warning",
        title: "Plan muy agresivo",
        description:
          "Tu estrategia consume prácticamente todo el saldo disponible. Ajusta los parámetros o reserva más BTC para mantener un margen de seguridad.",
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

    if (planUsagePercent <= 60) {
      return {
        tone: "positive",
        title: "Ritmo sostenible",
        description: `Retiras aproximadamente el ${Math.round(
          planUsagePercent
        )}% del saldo disponible. ${
          activeStrategyDefinition?.label ?? "Esta estrategia"
        } deja margen para probar escenarios alternativos.`,
      };
    }

    return {
      tone: "balanced",
      title: "Estrategia en curso",
      description: `${
        activeStrategyDefinition?.label ?? "La estrategia seleccionada"
      } reparte los retiros de forma constante. Guarda este escenario y compara otros ajustes de parámetros.`,
    };
  }, [
    plan.isValid,
    withdrawable,
    planUsagePercent,
    withdrawablePercent,
    activeStrategyDefinition,
  ]);

  const adviceToneClass = `calculator__advice--${strategyTip.tone}`;

  const handleScheduleExport = () => {
    if (!scheduleAvailable || typeof window === "undefined") return;

    const csvHeader = "Fecha,BTC,Valor EUR actual,Valor EUR escenario\n";
    const csvRows = plan.schedule
      .map((event) => {
        const amount = event.amountBtc.toFixed(8);
        const eur = positiveOrNull(event.amountEur) !== null ? event.amountEur.toFixed(2) : "";
        const projected =
          positiveOrNull(event.projectedAmountEur) !== null
            ? event.projectedAmountEur.toFixed(2)
            : "";
        return `${event.label},${amount},${eur},${projected}`;
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
      strategy,
      strategyConfig: currentStrategyConfig,
      globalStrategy: preparedGlobalStrategy,
      priceVariation,
      monthlyTarget: safeMonthlyTarget,
    };
    setProfiles((prev) => [newProfile, ...prev].slice(0, 5));
    setProfileName("");
  };

  const handleProfileLoad = (profile) => {
    setWalletValue(profile.walletValue);
    setBtcIntocableValue(profile.btcIntocableValue);
    setSelectedDate(profile.selectedDate);
    setFrequency(profile.frequency ?? "monthly");
    const nextStrategy = ensureStrategyId(profile.strategy);
    setStrategy(nextStrategy);
    setStrategyConfigs((prev) => ({
      ...prev,
      [nextStrategy]: sanitizeStrategyConfig(nextStrategy, profile.strategyConfig),
    }));
    setGlobalStrategy(sanitizeGlobalStrategy(profile.globalStrategy));
    const variation = clamp(Number(profile.priceVariation) || 0, VARIATION_MIN, VARIATION_MAX);
    setPriceVariation(variation);
    setMonthlyTarget(Number(profile.monthlyTarget) || 0);
  };

  const handleProfileDelete = (id) => {
    setProfiles((prev) => prev.filter((profile) => profile.id !== id));
  };

  const handleTargetSliderChange = (event) => {
    const value = Number(event.target.value);
    setMonthlyTarget(Number.isNaN(value) ? 0 : value);
  };

  const handleTargetInputChange = (event) => {
    const value = Number(event.target.value);
    if (Number.isNaN(value) || value < 0) {
      setMonthlyTarget(0);
      return;
    }
    setMonthlyTarget(value);
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
        <button
          type="button"
          onClick={() => onRefresh?.()}
          className="secondary-button"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Actualizando…" : "Actualizar precio"}
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

      <section className="calculator__goal" aria-label="Objetivo de renta mensual">
        <div className="calculator__goal-top">
          <div>
            <h3>Renta mensual deseada</h3>
            <p className="help">Define tu meta y verifica si el plan de retiros la cubre.</p>
          </div>
          <div className="calculator__goal-stats">
            <article>
              <span>Ingreso actual estimado</span>
              <strong>
                {monthlyPayoutEUR !== null && monthlyPayoutEUR > 0
                  ? eurFormatter.format(monthlyPayoutEUR)
                  : "—"}
              </strong>
              <small>
                {monthlyPayoutBTC > 0
                  ? `${btcFormatter.format(monthlyPayoutBTC)} BTC/mes`
                  : "Configura tu plan"}
              </small>
            </article>
            <article>
              <span>{scenarioLabel}</span>
              <strong>
                {projectedMonthlyPayoutEUR !== null && projectedMonthlyPayoutEUR > 0
                  ? eurFormatter.format(projectedMonthlyPayoutEUR)
                  : "—"}
              </strong>
              <small>
                {priceVariation === 0
                  ? "Sin variación prevista"
                  : `Ajuste ${priceVariation > 0 ? "+" : ""}${priceVariation}%`}
              </small>
            </article>
          </div>
        </div>
        <div className={goalStatusClass} role="status">
          <h4>{targetStatus.title}</h4>
          <p>{targetStatus.description}</p>
        </div>
        <div className="calculator__goal-controls">
          <label htmlFor="monthly-target">Objetivo mensual (EUR)</label>
          <div className="calculator__goal-inputs">
            <input
              id="monthly-target"
              type="range"
              min="0"
              max={targetSliderMax}
              step="50"
              value={safeMonthlyTarget}
              onChange={handleTargetSliderChange}
            />
            <input
              type="number"
              min="0"
              step="10"
              value={safeMonthlyTarget}
              onChange={handleTargetInputChange}
            />
          </div>
        </div>
        <div
          className="calculator__goal-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={200}
          aria-valuenow={targetCoverageLabel}
          aria-valuetext={`Cobertura del ${targetCoverageLabel}% del objetivo mensual.`}
        >
          <span style={{ width: `${Math.min(targetCoveragePercent, 100)}%` }} />
        </div>
        <div className="calculator__goal-legend">
          <span>
            Objetivo: {safeMonthlyTarget ? eurFormatter.format(safeMonthlyTarget) : "Sin definir"}
          </span>
          <span>
            {monthlyPayoutEUR !== null && monthlyPayoutEUR > 0
              ? `Cobertura ${targetCoverageLabel}%`
              : "Pendiente de cálculo"}
          </span>
        </div>
        <ul className="calculator__steps">
          {planSteps.map((step) => (
            <li
              key={step.label}
              className={step.done ? "calculator__steps-item--done" : undefined}
            >
              <span aria-hidden="true">{step.done ? "✔" : "•"}</span>
              {step.label}
            </li>
          ))}
        </ul>
      </section>

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
            aria-describedby={frequencyError ? "frequency-error" : "frequency-help"}
          >
            <option value="monthly">Mensual</option>
            <option value="weekly">Semanal</option>
          </select>
          {frequencyError ? (
            <p id="frequency-error" className="error">{frequencyError}</p>
          ) : (
            <p id="frequency-help" className="help">
              Calcularemos el monto {periodLabel} que puedes retirar.
            </p>
          )}
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

        <section className="calculator__strategy" aria-labelledby="strategy-heading">
          <div className="field">
            <label htmlFor="strategy-select">Estrategia de retiros</label>
            <select id="strategy-select" value={strategy} onChange={handleStrategyChange}>
              {STRATEGY_DEFINITIONS.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.label}
                </option>
              ))}
            </select>
            <p className="help">{activeStrategyDefinition?.description}</p>
          </div>

          {strategySpecificFields ? (
            <div className="calculator__strategy-fields">{strategySpecificFields}</div>
          ) : null}

          <div className="calculator__strategy-global" aria-labelledby="strategy-global-heading">
            <h4 id="strategy-global-heading">Parámetros globales</h4>
            <div className="calculator__strategy-global-grid">
              <div className="field">
                <label htmlFor="strategy-fee">Comisión (%)</label>
                <input
                  id="strategy-fee"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalStrategy.feePercent ?? 0}
                  onChange={handleFeeChange}
                />
                <p className="help">Aplicada después de cada retiro.</p>
              </div>
              <div className="field">
                <label htmlFor="strategy-min-withdrawal">Mínimo por periodo (BTC)</label>
                <input
                  id="strategy-min-withdrawal"
                  type="number"
                  min="0"
                  step="0.00000001"
                  value={globalStrategy.minWithdrawal ?? ""}
                  onChange={handleMinChange}
                />
              </div>
              <div className="field">
                <label htmlFor="strategy-max-withdrawal">Máximo por periodo (BTC)</label>
                <input
                  id="strategy-max-withdrawal"
                  type="number"
                  min="0"
                  step="0.00000001"
                  value={globalStrategy.maxWithdrawal ?? ""}
                  onChange={handleMaxChange}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="calculator__result">
          <h3>Próximo retiro</h3>
          <p className="calculator__result-value">
            {plan.isValid && nextWithdrawalBTC > 0
              ? `${btcFormatter.format(nextWithdrawalBTC)} BTC`
              : plan.isValid
              ? "Sin retiros programados"
              : "Configura tu plan"}
          </p>
          <p className="calculator__result-eur">
            {nextWithdrawalEUR !== null
              ? eurFormatter.format(nextWithdrawalEUR)
              : nextWithdrawalBTC > 0
              ? "Sin precio disponible"
              : "Añade precio o espera actualización"}
          </p>
          {nextWithdrawalProjectedEUR !== null ? (
            <p className="calculator__result-projected">
              Escenario: {eurFormatter.format(nextWithdrawalProjectedEUR)}
            </p>
          ) : null}
          <div className="calculator__result-average">
            <h4>Retiro medio</h4>
            <p>
              {plan.isValid && averageWithdrawalBTC > 0
                ? `${btcFormatter.format(averageWithdrawalBTC)} BTC`
                : "Sin datos"}
            </p>
            <p>
              {averageWithdrawalEUR !== null
                ? eurFormatter.format(averageWithdrawalEUR)
                : "Añade precio o espera actualización"}
            </p>
          </div>
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
              : "Ajusta los valores para liberar BTC retirables y visualizar un plan de retiros."}
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
              <dd>{scenarioEurLabel}</dd>
            </div>
            <div>
              <dt>Diferencia vs. actual</dt>
              <dd className={differenceToneClass || undefined}>
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
              aria-disabled={!scheduleAvailable}
              title={
                scheduleAvailable
                  ? "Descargar el calendario de retiros en CSV"
                  : "Configura el plan para activar la exportación"
              }
              onClick={handleScheduleExport}
            >
              Exportar CSV
            </button>
          </div>
          {scheduleAvailable ? (
            <div className="calculator__schedule-table">
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
            </div>
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
