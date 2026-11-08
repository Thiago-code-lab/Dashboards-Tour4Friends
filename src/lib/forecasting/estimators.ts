import type { Observation, ForecastModel } from './types';
import { finiteValues } from '../analytics/numerical';

export function seasonalForecast(values: number[], horizon: number): number[] {
  validateValues(values, horizon);
  if (!values.length) return [];
  const series = [...values];
  const result: number[] = [];
  for (let i = 0; i < horizon; i++) {
    const last = series.slice(-3);
    const weight = last.reduce((s, _, j) => s + j + 1, 0);
    const value = Math.max(
      0,
      series.length >= 12
        ? series[series.length - 12]
        : last.reduce((s, v, j) => s + v * (j + 1), 0) / weight,
    );
    series.push(value);
    result.push(value);
  }
  return result;
}

function features(index: number, firstMonth: number): number[] {
  const angle = (2 * Math.PI * (index + firstMonth - 1)) / 12;
  return [
    1,
    index / 12,
    Math.sin(angle),
    Math.cos(angle),
    Math.sin(2 * angle),
    Math.cos(2 * angle),
  ];
}

/** Partial-pivot Gaussian elimination of a 6×6 regularized normal equation. */
function solve(matrix: number[][], target: number[]): number[] {
  const n = target.length;
  const a = matrix.map((row, i) => [...row, target[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    if (Math.abs(a[col][col]) < 1e-10) throw new Error('Sistema Ridge singular');
    const divisor = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

export function ridgeForecast(history: Observation[], horizon: number, lambda = 4): number[] {
  validateValues(
    history.map((point) => point.travelers),
    horizon,
  );
  if (!Number.isFinite(lambda) || lambda <= 0) throw new Error('Regularização deve ser positiva.');
  if (history.length < 12) throw new Error('Ridge requer pelo menos 12 meses de treino');
  const firstMonth = Number(history[0].month.slice(5, 7));
  const x = history.map((_, i) => features(i, firstMonth));
  const xtx = Array.from({ length: 6 }, (_, j) =>
    Array.from(
      { length: 6 },
      (_, k) => x.reduce((s, row) => s + row[j] * row[k], 0) + (j === k && j !== 0 ? lambda : 0),
    ),
  );
  const xty = Array.from({ length: 6 }, (_, j) =>
    x.reduce((s, row, i) => s + row[j] * history[i].travelers, 0),
  );
  const coefficients = solve(xtx, xty);
  return Array.from({ length: horizon }, (_, i) =>
    Math.max(
      0,
      features(history.length + i, firstMonth).reduce(
        (s, value, j) => s + value * coefficients[j],
        0,
      ),
    ),
  );
}

function validateValues(values: number[], horizon: number): void {
  finiteValues(values);
  if (
    values.some((value) => value < 0 || value > Number.MAX_SAFE_INTEGER) ||
    !Number.isInteger(horizon) ||
    horizon < 1 ||
    horizon > 24
  )
    throw new Error('Demanda ou horizonte inválido (1–24 meses).');
}

export function weightedForecast(values: number[], horizon: number): number[] {
  validateValues(values, horizon);
  if (!values.length) return [];
  const series = [...values];
  const result: number[] = [];
  for (let index = 0; index < horizon; index++) {
    const recent = series.slice(-3);
    const totalWeight = (recent.length * (recent.length + 1)) / 2;
    const predicted = recent.reduce((sum, value, i) => sum + value * (i + 1), 0) / totalWeight;
    series.push(predicted);
    result.push(predicted);
  }
  return result;
}

/** Fixed coefficients avoid tuning on the final test: alpha=.4, beta=.2, phi=.85. */
export function dampedForecast(values: number[], horizon: number): number[] {
  validateValues(values, horizon);
  if (values.length < 6) throw new Error('Tendência amortecida requer seis meses.');
  let level = values[0];
  let trend = (values[2] - values[0]) / 2;
  for (let i = 1; i < values.length; i++) {
    const previous = level;
    level = 0.4 * values[i] + 0.6 * (level + 0.85 * trend);
    trend = 0.2 * (level - previous) + 0.8 * 0.85 * trend;
  }
  let damping = 0;
  return Array.from({ length: horizon }, (_, index) => {
    damping += 0.85 ** (index + 1);
    return Math.max(0, level + damping * trend);
  });
}

export const FORECAST_MODELS: readonly ForecastModel[] = [
  {
    id: 'seasonal',
    name: 'Sazonal ingênuo',
    minimum: 12,
    complexity: 0,
    eligible: (history) => history.length >= 12,
    predict: (history, horizon) =>
      seasonalForecast(
        history.map((p) => p.travelers),
        horizon,
      ),
  },
  {
    id: 'weighted',
    name: 'Média ponderada',
    minimum: 3,
    complexity: 1,
    eligible: (history) => history.length >= 3,
    predict: (history, horizon) =>
      weightedForecast(
        history.map((p) => p.travelers),
        horizon,
      ),
  },
  {
    id: 'damped',
    name: 'Tendência amortecida',
    minimum: 6,
    complexity: 2,
    eligible: (history) => history.length >= 6,
    predict: (history, horizon) =>
      dampedForecast(
        history.map((p) => p.travelers),
        horizon,
      ),
  },
  {
    id: 'ridge',
    name: 'Ridge temporal',
    minimum: 12,
    complexity: 3,
    eligible: (history) =>
      history.length >= 12 &&
      history.filter((p) => p.travelers > 0).length >= 8 &&
      new Set(history.map((p) => p.travelers)).size > 1,
    predict: ridgeForecast,
  },
];
