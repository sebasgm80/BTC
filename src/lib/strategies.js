const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const isFiniteNumber = (value) => Number.isFinite(value) && !Number.isNaN(value);

const buildBounds = (params) => {
  const min = isFiniteNumber(params?.rMin) ? Math.max(0, Number(params.rMin)) : null;
  const max = isFiniteNumber(params?.rMax) ? Math.max(0, Number(params.rMax)) : null;
  if (min !== null && max !== null && min > max) {
    return { min: max, max: min };
  }
  return { min, max };
};

const applyBounds = (value, available, bounds) => {
  let result = value;
  if (!isFiniteNumber(result) || result < 0) {
    result = 0;
  }
  if (bounds.min !== null) {
    result = Math.max(result, bounds.min);
  }
  if (bounds.max !== null) {
    result = Math.min(result, bounds.max);
  }
  if (available >= 0) {
    result = Math.min(result, available);
  }
  return result;
};

const applyFee = (value, feePct) => {
  if (!isFiniteNumber(value) || value <= 0) return 0;
  if (!isFiniteNumber(feePct) || feePct <= 0) return value;
  return Math.max(0, value * (1 - clamp(feePct, 0, 1)));
};

const computeMovingAverage = (prices, window) => {
  const length = prices.length;
  const ma = new Array(length).fill(0);
  if (!length) return ma;
  const size = Math.max(1, window);
  let sum = 0;
  for (let i = 0; i < length; i += 1) {
    sum += prices[i] ?? 0;
    if (i >= size) {
      sum -= prices[i - size] ?? 0;
    }
    const count = i + 1 < size ? i + 1 : size;
    ma[i] = count > 0 ? sum / count : prices[i] ?? 0;
  }
  return ma;
};

export const calcularRetiros = (estrategia, params) => {
  const periods = Number.isFinite(params?.N) ? Math.max(0, Math.floor(params.N)) : 0;
  const total = Number.isFinite(params?.W0) ? Math.max(0, params.W0) : 0;
  const precios = Array.isArray(params?.precios) ? params.precios.slice(0, periods) : [];
  const feePct = Number.isFinite(params?.feePct) ? clamp(params.feePct, 0, 1) : 0;
  const bounds = buildBounds(params);

  if (periods <= 0 || total <= 0) {
    return new Array(Math.max(periods, 0)).fill(0);
  }

  const result = new Array(periods).fill(0);
  let disponible = total;

  switch (estrategia) {
    case 'uniforme': {
      for (let t = 0; t < periods; t += 1) {
        const remainingPeriods = periods - t;
        const base = remainingPeriods > 0 ? disponible / remainingPeriods : 0;
        const bounded = applyBounds(base, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
      break;
    }
    case 'porcentaje_fijo': {
      const p = Number.isFinite(params?.p) ? Math.max(0, params.p) : 0;
      for (let t = 0; t < periods; t += 1) {
        const candidate = disponible * p;
        const bounded = applyBounds(candidate, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
      break;
    }
    case 'creciente': {
      const g = Number.isFinite(params?.g) ? params.g : 0;
      const safeG = Number.isFinite(g) ? g : 0;
      const growth = safeG === -1 ? -0.99 : safeG;
      const ratio = 1 + growth;
      let r1;
      if (Math.abs(growth) < 1e-9) {
        r1 = total / periods;
      } else {
        const denom = (ratio ** periods - 1) / growth;
        r1 = denom > 0 ? total / denom : total / periods;
      }
      for (let t = 0; t < periods; t += 1) {
        const candidate = r1 * ratio ** t;
        const bounded = applyBounds(candidate, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
      break;
    }
    case 'disminucion': {
      const d = Number.isFinite(params?.d) ? clamp(params.d, 0, 1) : 0;
      const q = clamp(1 - d, 0, 1);
      let r1;
      if (Math.abs(1 - q) < 1e-9) {
        r1 = total / periods;
      } else {
        const denom = (1 - q ** periods) / (1 - q);
        r1 = denom > 0 ? total / denom : total / periods;
      }
      for (let t = 0; t < periods; t += 1) {
        const candidate = r1 * q ** t;
        const bounded = applyBounds(candidate, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
      break;
    }
    case 'volatilidad': {
      const pUp = Number.isFinite(params?.pUp) ? Math.max(0, params.pUp) : 0.03;
      const pDown = Number.isFinite(params?.pDown) ? Math.max(0, params.pDown) : 0.005;
      const window = Number.isFinite(params?.window) ? Math.max(1, Math.floor(params.window)) : 20;
      const ma = Array.isArray(params?.MA) && params.MA.length >= periods
        ? params.MA.slice(0, periods)
        : computeMovingAverage(precios.length === periods ? precios : precios.concat(new Array(periods - precios.length).fill(precios[precios.length - 1] ?? 0)), window);
      for (let t = 0; t < periods; t += 1) {
        const price = precios[t] ?? precios[precios.length - 1] ?? 0;
        const moving = ma[t] ?? price;
        const candidate = price > moving ? disponible * pUp : disponible * pDown;
        const bounded = applyBounds(candidate, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
      break;
    }
    case 'metas': {
      const milestone = Number.isFinite(params?.m) ? Math.max(0, params.m) : 0.1;
      const portion = Number.isFinite(params?.pOrFixed) ? Math.max(0, params.pOrFixed) : 0.1;
      let lastPrice = precios.length > 0 ? precios[0] : 0;
      for (let t = 0; t < periods; t += 1) {
        const price = precios[t] ?? lastPrice;
        const trigger = lastPrice * (1 + milestone);
        if (price >= trigger && disponible > 0) {
          const candidate = portion <= 1 ? disponible * portion : Math.min(portion, disponible);
          const bounded = applyBounds(candidate, disponible, bounds);
          const net = applyFee(bounded, feePct);
          result[t] = net;
          disponible = Math.max(0, disponible - net);
          lastPrice = price;
        } else {
          result[t] = 0;
          if (price > lastPrice) {
            lastPrice = price;
          }
        }
      }
      break;
    }
    case 'hibrido': {
      const base = Number.isFinite(params?.rBase) ? Math.max(0, params.rBase) : 0;
      const beta = Number.isFinite(params?.beta) ? Math.max(0, params.beta) : 0;
      for (let t = 0; t < periods; t += 1) {
        const price = precios[t] ?? precios[precios.length - 1] ?? 0;
        const previousPrice = t > 0 ? precios[t - 1] ?? price : price;
        const diff = price - previousPrice;
        const variable = price > 0 ? Math.max(0, beta * diff) / (price || 1) : 0;
        const candidate = base + variable;
        const bounded = applyBounds(candidate, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
      break;
    }
    case 'uniforme_eur': {
      const objetivo = Number.isFinite(params?.objetivoEUR) ? Math.max(0, params.objetivoEUR) : 0;
      if (objetivo <= 0) {
        return result;
      }
      const provisional = [];
      let totalBtc = 0;
      for (let t = 0; t < periods; t += 1) {
        const price = precios[t] ?? precios[precios.length - 1] ?? 0;
        const amount = price > 0 ? objetivo / price : 0;
        provisional.push(amount);
        totalBtc += amount;
      }
      const scale = totalBtc > 0 && totalBtc > total ? total / totalBtc : 1;
      for (let t = 0; t < periods; t += 1) {
        const candidate = provisional[t] * scale;
        const bounded = applyBounds(candidate, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
      break;
    }
    default: {
      for (let t = 0; t < periods; t += 1) {
        const remainingPeriods = periods - t;
        const base = remainingPeriods > 0 ? disponible / remainingPeriods : 0;
        const bounded = applyBounds(base, disponible, bounds);
        const net = applyFee(bounded, feePct);
        result[t] = net;
        disponible = Math.max(0, disponible - net);
      }
    }
  }

  let cumulative = 0;
  for (let t = 0; t < periods; t += 1) {
    cumulative += result[t];
    if (cumulative > total) {
      const excess = cumulative - total;
      result[t] = Math.max(0, result[t] - excess);
      for (let k = t + 1; k < periods; k += 1) {
        result[k] = 0;
      }
      break;
    }
  }

  return result;
};
