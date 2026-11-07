import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  forecastDemand,
  errorMetrics,
  normalizeHistory,
  FORECAST_MODELS,
  rollingOrigin,
  type Observation,
} from '../src/lib/forecasting/models';
import { empiricalBands, empiricalCoverage } from '../src/lib/forecasting/evaluation';
import { forecastDataset, historicalSeries } from '../src/lib/forecasting/dataset';
import {
  describe as describeValues,
  quantile,
  robustDeviation,
  wilson,
} from '../src/lib/analytics/numerical';
import {
  seasonalAnalysis,
  cancellationAnalysis,
  satisfactionAnalysis,
  bootstrapNps,
} from '../src/lib/analytics/statistics';
import { detectAnomalies, demandAnomalies } from '../src/lib/analytics/anomalies';
import { capacityPlan, concreteCapacity } from '../src/lib/forecasting/capacity';
import { DEFAULT_FILTERS } from '../src/lib/analytics/metrics';
import { validateDataset } from '../src/lib/validation/dataset';
import { nextMonth } from '../src/lib/format';
const data = validateDataset(
  JSON.parse(readFileSync(new URL('../public/data/demo.json', import.meta.url), 'utf8')),
);
const series: Observation[] = Array.from({ length: 48 }, (_, index) => ({
  month: nextMonth('2022-01', index),
  travelers: 10 + index * 0.1 + Math.sin((index * Math.PI) / 6) * 4,
}));

describe('Contrato mensal, modelos e métricas', () => {
  it('preenche meses internos ausentes com zero e recusa desordem/duplicatas', () => {
    expect(
      normalizeHistory([
        { month: '2025-01', travelers: 1 },
        { month: '2025-03', travelers: 3 },
      ]),
    ).toEqual([
      { month: '2025-01', travelers: 1 },
      { month: '2025-02', travelers: 0 },
      { month: '2025-03', travelers: 3 },
    ]);
    expect(() => normalizeHistory([series[1], series[0]])).toThrow();
    expect(() => normalizeHistory([series[0], series[0]])).toThrow();
  });
  it.each([NaN, Infinity, -1])('recusa demanda inválida %s', (travelers) =>
    expect(() => forecastDemand([{ month: '2025-01', travelers }], 3)).toThrow(),
  );
  it.each([0, -1, 1.5, 25, NaN])('recusa horizonte %s', (horizon) =>
    expect(() => forecastDemand(series, horizon)).toThrow(),
  );
  it('exclui meses incompletos, períodos pré-históricos e reservas futuras', () => {
    const history = historicalSeries(data, {
      ...DEFAULT_FILTERS,
      start: '2024-01-15',
      end: '2026-10-15',
    });
    expect(history[0].month).toBe('2024-02');
    expect(history.at(-1)!.month).toBe('2026-09');
    const altered = structuredClone(data);
    const future = altered.bookings.find(
      (booking) =>
        altered.departures.find((departure) => departure.id === booking.departureId)!.date >
        data.metadata.historyEnd,
    )!;
    future.travelerIds = [...future.travelerIds, 'synthetic-only'];
    expect(historicalSeries(altered, DEFAULT_FILTERS)).toEqual(
      historicalSeries(data, DEFAULT_FILTERS),
    );
    expect(historicalSeries(data, { ...DEFAULT_FILTERS, start: '2020-01-01' })[0].month).toBe(
      '2024-01',
    );
  });
  it('calcula sinal do viés, WAPE e pares sem arredondamento', () => {
    expect(errorMetrics([1, 3], [2, 4])).toMatchObject({
      mae: 1,
      rmse: 1,
      bias: 1,
      wape: 50,
      count: 2,
    });
    expect(errorMetrics([0, 0], [0.5, 0.5])).toMatchObject({ mae: 0.5, bias: 0.5, wape: null });
    expect(() => errorMetrics([1], [NaN])).toThrow();
    expect(() => errorMetrics([1], [1, 2])).toThrow();
  });
  it.each(FORECAST_MODELS.map((model) => [model.name, model] as const))(
    '%s é determinístico, finito, não negativo e preserva constantes',
    (_, model) => {
      const constant = series.map((point) => ({ ...point, travelers: 5 }));
      const first = model.predict(series, 12);
      expect(first).toEqual(model.predict(series, 12));
      expect(first).toHaveLength(12);
      expect(first.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
      model.predict(constant, 6).forEach((value) => expect(value).toBeCloseTo(5));
    },
  );
  it('não força Ridge em séries esparsas e não inventa teste em série curta', () => {
    const sparse = series
      .slice(0, 34)
      .map((point, index) => ({ ...point, travelers: index % 9 === 0 ? 2 : 0 }));
    expect(forecastDemand(sparse, 6).validation.some((score) => score.modelId === 'ridge')).toBe(
      false,
    );
    const short = forecastDemand(series.slice(0, 10), 6);
    expect(short.selectedId).toBe('weighted');
    expect(short.metrics).toEqual([]);
    expect(short.independentTest).toBe(false);
    expect(
      forecastDemand(
        series.map((point) => ({ ...point, travelers: 0 })),
        6,
      ).selected,
    ).toBeNull();
  });
});

describe('Separação temporal e comparabilidade', () => {
  it('usa somente treino anterior aos alvos e horizonte exato em todas as origens', () => {
    const windows = rollingOrigin(series, FORECAST_MODELS);
    for (const window of windows) {
      expect(window.pairs).toHaveLength(window.horizon);
      expect(window.pairs[0].month).toBe(nextMonth(window.origin));
      expect(window.pairs.every((pair) => pair.month > window.origin)).toBe(true);
      const model = FORECAST_MODELS.find((candidate) => candidate.id === window.modelId)!;
      expect(window.pairs.map((pair) => pair.predicted)).toEqual(
        model.predict(series.slice(0, window.trainingSize), window.horizon),
      );
    }
    for (const horizon of [1, 3, 6]) {
      const origins = FORECAST_MODELS.map((model) =>
        windows
          .filter((window) => window.horizon === horizon && window.modelId === model.id)
          .map((window) => window.origin),
      );
      origins.forEach((origin) => expect(origin).toEqual(origins[0]));
    }
  });
  it('alterar somente o holdout não muda seleção, janelas, previsões antigas ou quantis', () => {
    const original = forecastDemand(series, 6);
    const changed = forecastDemand(
      series.map((point, index) =>
        index >= series.length - 6 ? { ...point, travelers: 10000 } : point,
      ),
      6,
    );
    expect(changed.selectedId).toBe(original.selectedId);
    expect(changed.validation).toEqual(original.validation);
    expect(changed.windows).toEqual(original.windows);
    expect(changed.backtest.map((point) => point.selected)).toEqual(
      original.backtest.map((point) => point.selected),
    );
    expect(changed.uncertainty.bands).toEqual(original.uncertainty.bands);
    expect(changed.metrics).not.toEqual(original.metrics);
    expect(changed.predictions).not.toEqual(original.predictions);
  });
  it('alterar o futuro dentro da validação não muda previsões anteriores à alteração', () => {
    const original = rollingOrigin(series, FORECAST_MODELS);
    const changed = rollingOrigin(
      series.map((point, index) => (index >= 30 ? { ...point, travelers: 9000 } : point)),
      FORECAST_MODELS,
    );
    const past = (windows: typeof original) =>
      windows
        .filter((window) => window.origin < series[30].month)
        .map((window) => ({
          origin: window.origin,
          model: window.modelId,
          horizon: window.horizon,
          predictions: window.pairs.map((point) => point.predicted),
        }));
    expect(past(changed)).toEqual(past(original));
  });
  it('recalcula as métricas usando exatamente os pares de cada modelo/horizonte', () => {
    const result = forecastDemand(series, 6);
    for (const score of result.validation) {
      const pairs = result.windows
        .filter((window) => window.modelId === score.modelId && window.horizon === score.horizon)
        .flatMap((window) => window.pairs);
      expect(score).toMatchObject(
        errorMetrics(
          pairs.map((pair) => pair.observed),
          pairs.map((pair) => pair.predicted),
        ),
      );
      expect(pairs.every((pair) => pair.month < result.testStart!)).toBe(true);
    }
    const compared = result.validation.filter((score) => score.horizon === 3);
    expect(compared.find((score) => score.modelId === result.selectedId)!.mae).toBeLessThanOrEqual(
      Math.min(...compared.map((score) => score.mae)) * 1.01 + 1e-9,
    );
  });
});

describe('Faixas empíricas e dados versionados', () => {
  it('quantil usa interpolação linear e valida sua entrada', () => {
    expect(quantile([0, 10, 20, 30], 0.25)).toBe(7.5);
    expect(quantile([], 0.5)).toBeNull();
    expect(() => quantile([NaN], 0.5)).toThrow();
    expect(() => quantile([1], 2)).toThrow();
  });
  it('não duplica resíduos de origens sobrepostas nem cria faixas sem oito erros', () => {
    const windows = rollingOrigin(series.slice(0, 18), FORECAST_MODELS);
    const bands = empiricalBands([...windows, ...windows], 'seasonal');
    expect(bands[0].sample).toBe(6);
    expect(bands.every((band) => band.lowerError === null)).toBe(true);
  });
  it('mantém limites ordenados, não negativos e sem extrapolar quantis para passo sete', () => {
    const forecast = forecastDemand(series, 12);
    expect(
      forecast.predictions
        .slice(0, 6)
        .every((point) => point.lower! >= 0 && point.upper! >= point.lower!),
    ).toBe(true);
    expect(forecast.predictions.slice(6).every((point) => point.lower === undefined)).toBe(true);
    expect(forecast.uncertainty.kind).toBe('exploratory');
  });
  it('cobertura usa alvos separados da calibração e somente passos disponíveis', () => {
    const bands = [{ lead: 1, sample: 10, lowerError: -2, upperError: 2 }];
    expect(
      empiricalCoverage(
        [
          { month: '2025-01', lead: 1, observed: 3, predicted: 4 },
          { month: '2025-02', lead: 2, observed: 999, predicted: 0 },
        ],
        bands,
      ),
    ).toEqual({ hits: 1, count: 1, rate: 100 });
    expect(empiricalCoverage([], bands)).toBeNull();
  });
  it('invalida a identificação mesmo para alteração fora da demanda e reaproveita o mesmo snapshot', () => {
    const original = forecastDataset(data, DEFAULT_FILTERS);
    expect(forecastDataset(data, DEFAULT_FILTERS)).toBe(original);
    const changed = structuredClone(data);
    changed.costs[0].amount += 1;
    const next = forecastDataset(changed, DEFAULT_FILTERS);
    expect(next.metadata.fingerprint).not.toBe(original.metadata.fingerprint);
    expect(next.predictions).toEqual(original.predictions);
  });
});

describe('Estatística robusta e interpretação', () => {
  it('identifica outlier conhecido, recusa grupos pequenos e dispersão zero', () => {
    expect(robustDeviation(100, [9, 10, 11, 9, 10, 11, 10])!.score).toBeGreaterThan(3.5);
    expect(robustDeviation(100, [1, 2])).toBeNull();
    expect(robustDeviation(100, [10, 10, 10, 10, 10, 10])).toBeNull();
    expect(describeValues([2, 4, 6]).sd).toBe(2);
  });
  it('Wilson não divide por zero e tem referência numérica conhecida', () => {
    expect(wilson(0, 0)).toBeNull();
    expect(wilson(5, 10)!.lower).toBeCloseTo(0.23659, 4);
    expect(wilson(0, 10)!.lower).toBe(0);
    expect(wilson(10, 10)!.upper).toBe(1);
    expect(() => wilson(2, 1)).toThrow();
  });
  it('demanda inesperada usa baseline e resíduos somente anteriores', () => {
    const original = series.map((point, index) => ({
      ...point,
      travelers: index === 35 ? 1000 : point.travelers + 2 * Math.sin(index * 1.7),
    }));
    const findings = demandAnomalies(original);
    expect(findings.some((finding) => finding.date.startsWith(original[35].month))).toBe(true);
    const changed = original.map((point, index) =>
      index > 35 ? { ...point, travelers: 9999 } : point,
    );
    expect(
      demandAnomalies(changed).filter((finding) => finding.date <= `${original[35].month}-01`),
    ).toEqual(findings.filter((finding) => finding.date <= `${original[35].month}-01`));
  });
  it('normalização detecta custo extremo sem transformar tamanho de viagem em anomalia', () => {
    const altered = structuredClone(data);
    const firstRoute = data.routes[0];
    const template = data.departures[0];
    const cost = data.costs[0];
    const booking = data.bookings[0];
    altered.departures = Array.from({ length: 9 }, (_, index) => ({
      ...template,
      id: `D${index}`,
      routeId: firstRoute.id,
      date: '2025-01-01',
      endDate: '2025-01-20',
      capacity: 30,
    }));
    altered.bookings = altered.departures.map((departure, index) => ({
      ...booking,
      id: `B${index}`,
      departureId: departure.id,
      status: 'confirmed',
      travelerIds: Array.from({ length: index + 1 }, (_, i) => `C${i}`),
    }));
    altered.costs = altered.departures.map((departure, index) => ({
      ...cost,
      id: `C${index}`,
      departureId: departure.id,
      date: '2025-01-01',
      status: 'realized',
      amount: (index + 1) * firstRoute.days * (index === 8 ? 100 : 10 + (index % 3)),
    }));
    const findings = detectAnomalies(altered, DEFAULT_FILTERS, []);
    expect(
      findings
        .filter((finding) => finding.indicator === 'Custo por viajante-dia')
        .map((finding) => finding.id),
    ).toEqual(['cost-C8']);
    expect(findings.every((finding) => finding.level === 'attention')).toBe(true);
  });
  it('bootstrap é reproduzível, por cliente, e se abstém com pouca amostra', () => {
    const rows = Array.from({ length: 24 }, (_, index) => ({
      customerId: `C${index % 12}`,
      nps: index % 11,
    }));
    expect(bootstrapNps(rows)).toEqual(bootstrapNps(rows));
    expect(bootstrapNps(rows)!.clusters).toBe(12);
    expect(bootstrapNps(rows.slice(0, 5))).toBeNull();
    expect(bootstrapNps(rows.map((row) => ({ ...row, customerId: 'one' })))).toBeNull();
  });
  it('as três conclusões derivam do recorte e preservam denominadores', () => {
    const history = historicalSeries(data, DEFAULT_FILTERS);
    const seasonal = seasonalAnalysis(history);
    expect(seasonal.distribution.n).toBe(34);
    expect(seasonal.histogram.reduce((sum, bin) => sum + bin.value, 0)).toBe(34);
    const cancellation = cancellationAnalysis(data, DEFAULT_FILTERS);
    expect(
      cancellation.groups
        .filter((group) => group.dimension === 'Roteiro')
        .reduce((sum, group) => sum + group.n, 0),
    ).toBe(cancellation.n);
    const satisfaction = satisfactionAnalysis(data, DEFAULT_FILTERS);
    expect(satisfaction.distribution.reduce((sum, row) => sum + row.count, 0)).toBe(satisfaction.n);
    expect(
      cancellationAnalysis(data, { ...DEFAULT_FILTERS, start: '2030-01-01', end: '2030-12-31' })
        .conclusion,
    ).toMatch(/Não há/);
  });
  it('simulação respeita unidades, compromissos, contratos e não grava no dataset', () => {
    const before = JSON.stringify(data);
    const predictions = [{ month: '2026-11', predicted: 10.5 }];
    const base = capacityPlan(data, DEFAULT_FILTERS, predictions);
    const altered = capacityPlan(data, DEFAULT_FILTERS, predictions, 30, {
      extraPerDeparture: 5,
      contractedPercent: -30,
    });
    expect(altered[0].beds).toBeGreaterThanOrEqual(altered[0].committed);
    expect(altered[0].simulatedCapacity).toBeGreaterThan(base[0].scheduledCapacity);
    expect(
      concreteCapacity(data, DEFAULT_FILTERS, ['2026-11'])
        .filter((slot) => !slot.confirmed)
        .every((slot) => slot.contracted === 0),
    ).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
    expect(() => capacityPlan(data, DEFAULT_FILTERS, predictions, NaN)).toThrow();
  });
});
