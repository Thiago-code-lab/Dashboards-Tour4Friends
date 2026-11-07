import { nextMonth } from '../format';
import { fingerprint } from '../analytics/numerical';
import { FORECAST_MODELS } from './estimators';
import {
  normalizeHistory,
  rollingOrigin,
  scoreWindows,
  errorMetrics,
  makePairs,
  empiricalBands,
  empiricalCoverage,
} from './evaluation';
import type { ForecastResult, Observation, ForecastModel, ModelScore, ForecastPair } from './types';
export type * from './types';
export {
  seasonalForecast,
  ridgeForecast,
  weightedForecast,
  dampedForecast,
  FORECAST_MODELS,
} from './estimators';
export { errorMetrics, normalizeHistory, rollingOrigin } from './evaluation';

function selectModel(
  scores: ModelScore[],
  candidates: readonly ForecastModel[],
): ForecastModel | null {
  const comparable = scores.filter((score) => score.horizon === 3 && score.windows >= 4);
  if (!comparable.length) return null;
  const minimum = Math.min(...comparable.map((score) => score.mae));
  const nearBest = comparable.filter((score) => score.mae <= minimum * 1.01 + 1e-9);
  return [...candidates]
    .sort((a, b) => a.complexity - b.complexity)
    .find((model) => nearBest.some((score) => score.modelId === model.id))!;
}

function candidatesFor(history: Observation[]): ForecastModel[] {
  return FORECAST_MODELS.filter((model) => {
    if (!model.eligible(history)) return false;
    if (model.id !== 'ridge') return true;
    let eligibleOrigins = 0;
    for (let size = 12; size + 3 <= history.length; size++) {
      if (model.eligible(history.slice(0, size)) && ++eligibleOrigins >= 4) return true;
    }
    return false;
  });
}

function evaluateFinal(
  train: Observation[],
  test: Observation[],
  candidates: readonly ForecastModel[],
): { score: ModelScore; pairs: ForecastPair[] }[] {
  if (!test.length) return [];
  return candidates.map((model) => {
    const predicted = model.predict(train, test.length);
    return {
      pairs: makePairs(test, predicted),
      score: {
        model: model.name,
        modelId: model.id,
        horizon: test.length,
        windows: 1,
        ...errorMetrics(
          test.map((point) => point.travelers),
          predicted,
        ),
      },
    };
  });
}

export function forecastDemand(
  input: Observation[],
  horizon: number,
  options: { dataVersion?: string; snapshotId?: string; generatedAt?: string } = {},
): ForecastResult {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 24)
    throw new Error('Horizonte inválido (1–24 meses).');
  const history = normalizeHistory(input);
  const independentTest = history.length >= 24;
  const development = independentTest ? history.slice(0, -6) : history;
  const test = independentTest ? history.slice(-6) : [];
  const candidates = candidatesFor(development);
  const windows = rollingOrigin(development, candidates);
  const validation = scoreWindows(windows);
  const evaluated = selectModel(validation, candidates);
  const sufficient = history.length >= 6 && history.filter((p) => p.travelers > 0).length >= 3;
  const selected = sufficient
    ? (evaluated ?? FORECAST_MODELS.find((model) => model.id === 'weighted')!)
    : null;
  const heldOut = evaluated && selected && test.length > 0 ? test : [];
  const final = evaluateFinal(development, heldOut, candidates);
  const metrics = final.map((evaluation) => evaluation.score);
  const selectedPairs =
    final.find((evaluation) => evaluation.score.modelId === selected?.id)?.pairs ?? [];
  const bands = selected && evaluated ? empiricalBands(windows, selected.id) : [];
  const raw = selected ? selected.predict(history, horizon) : [];
  const predictions = raw.map((predicted, index) => {
    const band = bands[index];
    return {
      month: nextMonth(history.at(-1)!.month, index + 1),
      predicted,
      errorSample: band?.sample ?? 0,
      ...(band?.lowerError != null
        ? {
            lower: Math.max(0, predicted + band.lowerError),
            upper: Math.max(0, predicted + band.upperError!),
          }
        : {}),
    };
  });
  const score = metrics.find((row) => row.modelId === selected?.id);
  const baseline = validation.find((row) => row.modelId === 'seasonal' && row.horizon === 3);
  const chosen = validation.find((row) => row.modelId === selected?.id && row.horizon === 3);
  const reason = !selected
    ? 'Base insuficiente: são necessários 6 meses e 3 meses com viajantes.'
    : !evaluated
      ? 'Fallback: média ponderada exploratória; faltam quatro origens comuns de validação a três meses. Não há avaliação independente.'
      : `${selected.name} selecionado em origens expansivas de três meses pelo MAE; métodos a até 1% do menor erro favorecem o mais simples. ${heldOut.length ? 'Os seis meses finais foram excluídos da seleção; só depois do teste o modelo é reajustado ao histórico completo.' : 'Amostra curta: validação disponível, sem teste final independente.'}`;
  const baselinePairs =
    final.find((evaluation) => evaluation.score.modelId === 'seasonal')?.pairs ?? [];
  const ridgePairs = final.find((evaluation) => evaluation.score.modelId === 'ridge')?.pairs ?? [];
  return {
    selected: selected?.name ?? null,
    selectedId: selected?.id ?? null,
    reason,
    history,
    predictions,
    sample: history.length,
    trainEnd: heldOut.length ? development.at(-1)!.month : null,
    testStart: heldOut[0]?.month ?? null,
    backtest: heldOut.map((point, i) => ({
      month: point.month,
      observed: point.travelers,
      baseline: baselinePairs[i].predicted,
      ridge: ridgePairs[i]?.predicted ?? null,
      selected: selectedPairs[i].predicted,
    })),
    metrics,
    validation,
    windows,
    selectionHorizon: 3,
    independentTest: heldOut.length > 0,
    baselineImprovement:
      baseline && baseline.mae > 0 && chosen
        ? (100 * (baseline.mae - chosen.mae)) / baseline.mae
        : null,
    uncertainty: {
      kind: predictions.some((p) => p.lower !== undefined) ? 'exploratory' : 'unavailable',
      bands,
      description:
        'Quantis 10/90 dos erros fora da amostra, separados por passo e com mínimo de 8 erros. Faixa exploratória, sem garantia de cobertura. Acima de seis meses, sem faixa.',
      coverage: empiricalCoverage(selectedPairs, bands),
    },
    metadata: {
      model_id: selected?.id ?? null,
      model_version: '2.0.0',
      method: selected?.name ?? null,
      training_start: history[0]?.month ?? null,
      training_end: history.at(-1)?.month ?? null,
      evaluation_period: heldOut.length ? `${heldOut[0].month}/${heldOut.at(-1)!.month}` : null,
      forecast_horizon: horizon,
      validation_strategy: 'expanding-origin; selection H=3; final holdout=6 when eligible',
      sample_size: history.length,
      mae: score?.mae ?? null,
      rmse: score?.rmse ?? null,
      bias: score?.bias ?? null,
      data_version: options.dataVersion ?? 'series-only',
      generated_at: options.generatedAt ?? new Date().toISOString(),
      fingerprint: fingerprint({
        series: history,
        horizon,
        version: '2.0.0',
        snapshot: options.snapshotId ?? null,
      }),
    },
  };
}
