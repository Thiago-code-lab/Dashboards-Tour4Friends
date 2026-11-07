import { mean, nextMonth } from '../format';

export type Observation = { month: string; travelers: number };
export type ModelName = 'Sazonal ingênuo' | 'Ridge temporal' | 'Média ponderada';
export type ErrorMetrics = { mae: number; rmse: number };
export type ForecastResult = {
  selected: ModelName | null;
  reason: string;
  history: Observation[];
  predictions: { month: string; predicted: number }[];
  backtest: { month: string; observed: number; baseline: number; ridge: number }[];
  metrics: { model: ModelName; mae: number; rmse: number }[];
  trainEnd: string | null;
  testStart: string | null;
  sample: number;
};

export function errorMetrics(observed: number[], predicted: number[]): ErrorMetrics {
  if (!observed.length || observed.length !== predicted.length)
    throw new Error('Amostras de erro incompatíveis');
  const residuals = observed.map((value, i) => value - predicted[i]);
  return {
    mae: mean(residuals.map(Math.abs))!,
    rmse: Math.sqrt(mean(residuals.map((v) => v * v))!),
  };
}

export function seasonalForecast(values: number[], horizon: number): number[] {
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

export function forecastDemand(history: Observation[], horizon: number): ForecastResult {
  const empty: ForecastResult = {
    selected: null,
    reason: '',
    history,
    predictions: [],
    backtest: [],
    metrics: [],
    trainEnd: null,
    testStart: null,
    sample: history.length,
  };
  if (history.length < 6 || history.filter((p) => p.travelers > 0).length < 3)
    return {
      ...empty,
      reason:
        'Base insuficiente: são necessários 6 meses e pelo menos 3 meses com viajantes. Amplie o recorte.',
    };
  let selected: ModelName = history.length >= 12 ? 'Sazonal ingênuo' : 'Média ponderada';
  let reason =
    'Fallback estatístico: amostra insuficiente para comparar Ridge com seis meses de teste. Estimativa exploratória, sem métrica validada.';
  let backtest: ForecastResult['backtest'] = [];
  let metrics: ForecastResult['metrics'] = [];
  let trainEnd: string | null = null;
  let testStart: string | null = null;
  if (history.length >= 18 && history.slice(0, -6).filter((p) => p.travelers > 0).length >= 8) {
    const train = history.slice(0, -6);
    const test = history.slice(-6);
    const baseline = seasonalForecast(
      train.map((p) => p.travelers),
      6,
    );
    const ridge = ridgeForecast(train, 6);
    metrics = [
      {
        model: 'Sazonal ingênuo',
        ...errorMetrics(
          test.map((p) => p.travelers),
          baseline,
        ),
      },
      {
        model: 'Ridge temporal',
        ...errorMetrics(
          test.map((p) => p.travelers),
          ridge,
        ),
      },
    ];
    selected = metrics[1].mae < metrics[0].mae ? 'Ridge temporal' : 'Sazonal ingênuo';
    reason = `${selected} selecionado pelo menor MAE nos 6 meses reservados para teste. Após a comparação, o método é ajustado ao histórico completo para projetar o futuro.`;
    backtest = test.map((p, i) => ({
      month: p.month,
      observed: p.travelers,
      baseline: baseline[i],
      ridge: ridge[i],
    }));
    trainEnd = train.at(-1)!.month;
    testStart = test[0].month;
  }
  const values =
    selected === 'Ridge temporal'
      ? ridgeForecast(history, horizon)
      : seasonalForecast(
          history.map((p) => p.travelers),
          horizon,
        );
  return {
    ...empty,
    selected,
    reason,
    backtest,
    metrics,
    trainEnd,
    testStart,
    predictions: values.map((predicted, i) => ({
      month: nextMonth(history.at(-1)!.month, i + 1),
      predicted,
    })),
  };
}
