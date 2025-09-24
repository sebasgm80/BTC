export type StrategyId =
  | 'uniforme'
  | 'porcentaje_fijo'
  | 'creciente'
  | 'disminucion'
  | 'volatilidad'
  | 'metas'
  | 'hibrido'
  | 'uniforme_eur';

export type StrategyDefinition = {
  id: StrategyId;
  label: string;
  description: string;
};

export const STRATEGY_DEFINITIONS: StrategyDefinition[] = [
  {
    id: 'uniforme',
    label: 'Uniforme en BTC',
    description: 'Divide W0 en partes iguales a lo largo de todos los periodos.',
  },
  {
    id: 'porcentaje_fijo',
    label: '% fijo sobre saldo',
    description: 'Retira un porcentaje del saldo restante en cada periodo.',
  },
  {
    id: 'creciente',
    label: 'Creciente progresivo',
    description: 'Incrementa el retiro en BTC siguiendo una tasa de crecimiento g.',
  },
  {
    id: 'disminucion',
    label: 'Disminución progresiva',
    description: 'Disminuye el retiro en BTC cada periodo según un factor de reducción.',
  },
  {
    id: 'volatilidad',
    label: 'Según tendencia del precio',
    description: 'Aumenta o reduce el retiro dependiendo de si el precio supera su media móvil.',
  },
  {
    id: 'metas',
    label: 'Por hitos de precio',
    description: 'Solo vende cuando el precio supera un umbral respecto al último retiro.',
  },
  {
    id: 'hibrido',
    label: 'Mínimo + variable',
    description: 'Garantiza un mínimo fijo y suma una parte ligada al rendimiento reciente.',
  },
  {
    id: 'uniforme_eur',
    label: 'Uniforme en EUR',
    description: 'Busca un objetivo estable en euros y calcula el BTC equivalente cada periodo.',
  },
];

export type PercentConfig = {
  annualPercent: number | null;
  periodPercent: number | null;
};

export type CrecienteConfig = {
  growthPercent: number | null;
};

export type DisminucionConfig = {
  decayPercent: number | null;
};

export type VolatilidadConfig = {
  pUpPercent: number | null;
  pDownPercent: number | null;
  maWindow: number | null;
};

export type MetasConfig = {
  milestonePercent: number | null;
  portionMode: 'percent' | 'fixed';
  portionValue: number | null;
};

export type HibridoConfig = {
  baseBtc: number | null;
  betaFactor: number | null;
};

export type UniformeEurConfig = {
  targetEur: number | null;
};

export type StrategyConfigMap = {
  uniforme: Record<string, never>;
  porcentaje_fijo: PercentConfig;
  creciente: CrecienteConfig;
  disminucion: DisminucionConfig;
  volatilidad: VolatilidadConfig;
  metas: MetasConfig;
  hibrido: HibridoConfig;
  uniforme_eur: UniformeEurConfig;
};

export type StrategyConfig = StrategyConfigMap[StrategyId];

export type GlobalStrategyConfig = {
  feePercent: number;
  minWithdrawal: number | null;
  maxWithdrawal: number | null;
};

export const STRATEGY_DEFAULTS: StrategyConfigMap = {
  uniforme: {},
  porcentaje_fijo: { annualPercent: 4, periodPercent: null },
  creciente: { growthPercent: 1 },
  disminucion: { decayPercent: 1 },
  volatilidad: { pUpPercent: 3, pDownPercent: 0.5, maWindow: 20 },
  metas: { milestonePercent: 10, portionMode: 'percent', portionValue: 10 },
  hibrido: { baseBtc: 0.01, betaFactor: 0.6 },
  uniforme_eur: { targetEur: 600 },
};

export const GLOBAL_STRATEGY_DEFAULTS: GlobalStrategyConfig = {
  feePercent: 0,
  minWithdrawal: null,
  maxWithdrawal: null,
};

export const parseNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const ensureStrategyId = (value: unknown): StrategyId => {
  return STRATEGY_DEFINITIONS.some((definition) => definition.id === value)
    ? (value as StrategyId)
    : 'uniforme';
};

export const sanitizeStrategyConfig = <T extends StrategyId>(
  strategyId: T,
  rawConfig: unknown
): StrategyConfigMap[T] => {
  const defaults = STRATEGY_DEFAULTS[strategyId];
  const target: Record<string, unknown> = { ...defaults };

  if (!rawConfig || typeof rawConfig !== 'object') {
    return target as StrategyConfigMap[T];
  }

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    if (key === 'portionMode') {
      const mode = (rawConfig as Record<string, unknown>)[key];
      target.portionMode = mode === 'fixed' ? 'fixed' : 'percent';
      return;
    }

    if (key === 'periodPercent') {
      const value = parseNullableNumber((rawConfig as Record<string, unknown>)[key]);
      target.periodPercent = value;
      return;
    }

    if (typeof defaultValue === 'number' || defaultValue === null) {
      const value = parseNullableNumber((rawConfig as Record<string, unknown>)[key]);
      target[key] = value !== null ? value : defaultValue;
      return;
    }

    target[key] = (rawConfig as Record<string, unknown>)[key] ?? defaultValue;
  });

  return target as StrategyConfigMap[T];
};

export const sanitizeGlobalStrategy = (rawConfig: unknown): GlobalStrategyConfig => {
  if (!rawConfig || typeof rawConfig !== 'object') {
    return { ...GLOBAL_STRATEGY_DEFAULTS };
  }

  const record = rawConfig as Record<string, unknown>;
  const feePercent = parseNullableNumber(record.feePercent);
  const minWithdrawal = parseNullableNumber(record.minWithdrawal);
  const maxWithdrawal = parseNullableNumber(record.maxWithdrawal);

  return {
    feePercent: feePercent !== null ? clamp(feePercent, 0, 100) : 0,
    minWithdrawal,
    maxWithdrawal,
  };
};

export const mergeStrategyConfigs = (stored?: unknown) => {
  const source = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  return STRATEGY_DEFINITIONS.reduce(
    (accumulator, definition) => {
      const config = sanitizeStrategyConfig(definition.id, source[definition.id]);
      return {
        ...accumulator,
        [definition.id]: config,
      };
    },
    {} as { [K in StrategyId]: StrategyConfigMap[K] }
  );
};
