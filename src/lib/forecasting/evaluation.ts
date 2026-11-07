import { nextMonth } from '../format';
import { finiteValues, quantile } from '../analytics/numerical';
import type {
  ErrorMetrics,
  Observation,
  ForecastModel,
  ModelScore,
  ValidationWindow,
  EmpiricalBand,
  ForecastPair,
} from './types';

export function normalizeHistory(input: Observation[]): Observation[] {
  const rows: Observation[] = [];
  for (const point of input) {
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(point.month) ||
      !Number.isFinite(point.travelers) ||
      point.travelers < 0 ||
      point.travelers > Number.MAX_SAFE_INTEGER
    )
      throw new Error('Série mensal inválida.');
    const previous = rows.at(-1)?.month;
    if (previous && point.month <= previous)
      throw new Error('Meses devem estar em ordem, sem duplicação.');
    if (previous && Number(point.month.slice(0, 4)) - Number(rows[0].month.slice(0, 4)) > 20)
      throw new Error('Série limitada a vinte anos.');
    let month = previous ? nextMonth(previous) : point.month;
    while (month < point.month) {
      rows.push({ month, travelers: 0 });
      month = nextMonth(month);
    }
    rows.push({ month: point.month, travelers: point.travelers });
  }
  return rows;
}

/** Bias is predicted minus observed: positive means overestimation. */
export function errorMetrics(observed: number[], predicted: number[]): ErrorMetrics {
  if (!observed.length || observed.length !== predicted.length)
    throw new Error('Amostras de erro incompatíveis');
  finiteValues([...observed, ...predicted]);
  if (observed.some((v) => v < 0) || predicted.some((v) => v < 0))
    throw new Error('Demanda negativa recusada.');
  let absolute = 0;
  let squared = 0;
  let signed = 0;
  let denominator = 0;
  observed.forEach((value, i) => {
    const error = predicted[i] - value;
    absolute += Math.abs(error);
    squared += error * error;
    signed += error;
    denominator += value;
  });
  return {
    mae: absolute / observed.length,
    rmse: Math.sqrt(squared / observed.length),
    bias: signed / observed.length,
    wape: denominator > 0 ? (100 * absolute) / denominator : null,
    count: observed.length,
  };
}

export function makePairs(test: Observation[], predicted: number[]): ForecastPair[] {
  return test.map((point, index) => ({
    month: point.month,
    observed: point.travelers,
    predicted: predicted[index],
    lead: index + 1,
  }));
}

/** All candidates in a horizon share exactly the same origins and targets. */
export function rollingOrigin(
  history: Observation[],
  candidates: readonly ForecastModel[],
  horizons = [1, 3, 6],
): ValidationWindow[] {
  if (horizons.some((horizon) => !Number.isInteger(horizon) || horizon < 1 || horizon > 24))
    throw new Error('Horizonte de validação inválido.');
  history = normalizeHistory(history);
  const windows: ValidationWindow[] = [];
  for (const horizon of horizons) {
    for (let size = 12; size + horizon <= history.length; size++) {
      const train = history.slice(0, size);
      if (!candidates.every((model) => model.eligible(train))) continue;
      const test = history.slice(size, size + horizon);
      for (const model of candidates)
        windows.push({
          modelId: model.id,
          model: model.name,
          horizon,
          origin: train.at(-1)!.month,
          trainingStart: train[0].month,
          trainingSize: train.length,
          pairs: makePairs(test, model.predict(train, horizon)),
        });
    }
  }
  return windows;
}

export function scoreWindows(windows: ValidationWindow[]): ModelScore[] {
  const groups = Map.groupBy(windows, (window) => `${window.modelId}:${window.horizon}`);
  return [...groups.values()].map((group) => ({
    model: group[0].model,
    modelId: group[0].modelId,
    horizon: group[0].horizon,
    windows: group.length,
    ...errorMetrics(
      group.flatMap((w) => w.pairs.map((p) => p.observed)),
      group.flatMap((w) => w.pairs.map((p) => p.predicted)),
    ),
  }));
}

/** Keep one residual per origin/lead, irrespective of overlapping evaluation horizons. */
export function empiricalBands(windows: ValidationWindow[], modelId: string): EmpiricalBand[] {
  const unique = new Map<string, ForecastPair>();
  for (const window of windows.filter((w) => w.modelId === modelId)) {
    for (const pair of window.pairs) unique.set(`${window.origin}:${pair.lead}`, pair);
  }
  return Array.from({ length: 6 }, (_, index) => {
    const lead = index + 1;
    const errors = [...unique.values()]
      .filter((p) => p.lead === lead)
      .map((p) => p.observed - p.predicted);
    return {
      lead,
      sample: errors.length,
      lowerError: errors.length >= 8 ? quantile(errors, 0.1) : null,
      upperError: errors.length >= 8 ? quantile(errors, 0.9) : null,
    };
  });
}

export function empiricalCoverage(pairs: ForecastPair[], bands: EmpiricalBand[]) {
  const eligible = pairs.filter((p) => bands[p.lead - 1]?.lowerError != null);
  if (!eligible.length) return null;
  const hits = eligible.filter((p) => {
    const band = bands[p.lead - 1];
    return (
      p.observed >= Math.max(0, p.predicted + band.lowerError!) &&
      p.observed <= Math.max(0, p.predicted + band.upperError!)
    );
  }).length;
  return { hits, count: eligible.length, rate: (100 * hits) / eligible.length };
}
