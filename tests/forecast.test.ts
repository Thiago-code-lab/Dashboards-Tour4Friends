import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  errorMetrics,
  forecastDemand,
  ridgeForecast,
  seasonalForecast,
  type Observation,
} from '../src/lib/forecasting/models';
import { analyze, DEFAULT_FILTERS } from '../src/lib/analytics/metrics';
import { validateDataset } from '../src/lib/validation/dataset';
import { monthRange, nextMonth } from '../src/lib/format';
const series: Observation[] = monthRange('2024-01-01', '2026-10-31').map((month, i) => ({
  month,
  travelers: Math.max(0, 8 + i * 0.2 + 3 * Math.sin((i * 2 * Math.PI) / 12)),
}));
describe('Previsão executável e validação temporal', () => {
  it('calcula MAE e RMSE conhecidos', () => {
    const result = errorMetrics([0, 4], [2, 4]);
    expect(result.mae).toBe(1);
    expect(result.rmse).toBeCloseTo(Math.sqrt(2));
    expect(() => errorMetrics([], [])).toThrow();
  });
  it('repete o mês sazonal sem consultar observações futuras', () => {
    expect(
      seasonalForecast(
        Array.from({ length: 12 }, (_, i) => i + 1),
        3,
      ),
    ).toEqual([1, 2, 3]);
  });
  it('média ponderada é estatística e tem pesos reais 1, 2 e 3', () =>
    expect(seasonalForecast([1, 2, 3], 1)[0]).toBeCloseTo(14 / 6));
  it('Ridge reage aos valores de treinamento e produz horizonte solicitado', () => {
    const a = ridgeForecast(series, 6);
    const b = ridgeForecast(
      series.map((p) => ({ ...p, travelers: p.travelers * 2 })),
      6,
    );
    expect(a).toHaveLength(6);
    a.forEach((v, i) => expect(b[i]).toBeCloseTo(v * 2));
  });
  it('preserva seis meses cronológicos para teste', () => {
    const r = forecastDemand(series, 12);
    expect(r.trainEnd).toBe('2026-04');
    expect(r.testStart).toBe('2026-05');
    expect(r.backtest).toHaveLength(6);
    expect(r.predictions[0].month).toBe('2026-11');
    expect(r.predictions.at(-1)!.month).toBe('2027-10');
  });
  it('não vaza os valores do teste para as previsões do próprio teste', () => {
    const a = forecastDemand(series, 3);
    const changed = series.map((p, i) => (i >= series.length - 6 ? { ...p, travelers: 999 } : p));
    const b = forecastDemand(changed, 3);
    expect(a.backtest.map((p) => p.ridge)).toEqual(b.backtest.map((p) => p.ridge));
    expect(a.backtest.map((p) => p.baseline)).toEqual(b.backtest.map((p) => p.baseline));
    expect(a.metrics[0].mae).not.toEqual(b.metrics[0].mae);
  });
  it('seleciona pelo MAE de validação, favorecendo simplicidade em empate', () => {
    const r = forecastDemand(series, 6);
    const scores = r.validation.filter((score) => score.horizon === 3);
    const min = Math.min(...scores.map((score) => score.mae));
    expect(scores.find((score) => score.model === r.selected)!.mae).toBeLessThanOrEqual(
      min * 1.01 + 1e-9,
    );
    const constant = forecastDemand(
      series.map((p) => ({ ...p, travelers: 5 })),
      6,
    );
    expect(constant.selected).toBe('Sazonal ingênuo');
  });
  it('usa fallback explícito e não inventa métricas para amostra curta', () => {
    const r = forecastDemand(series.slice(0, 10), 3);
    expect(r.selected).toBe('Média ponderada');
    expect(r.metrics).toHaveLength(0);
    expect(r.reason).toMatch(/Fallback/);
  });
  it('bloqueia previsão sem base suficiente', () => {
    expect(forecastDemand(series.slice(0, 3), 6).predictions).toHaveLength(0);
    expect(
      forecastDemand(
        series.map((p) => ({ ...p, travelers: 0 })),
        6,
      ).selected,
    ).toBeNull();
  });
  it('produz somente previsões finitas não negativas', () => {
    const declining = series.map((p, i) => ({ ...p, travelers: Math.max(0, 30 - i * 2) }));
    const r = forecastDemand(declining, 12);
    expect(r.predictions.every((p) => Number.isFinite(p.predicted) && p.predicted >= 0)).toBe(true);
  });
  it('refaz a série e a previsão sob filtros dimensionais', () => {
    const data = validateDataset(
      JSON.parse(readFileSync(new URL('../public/data/demo.json', import.meta.url), 'utf8')),
    );
    const a = forecastDemand(analyze(data, DEFAULT_FILTERS).monthly, 6);
    const b = forecastDemand(analyze(data, { ...DEFAULT_FILTERS, route: 'portugues' }).monthly, 6);
    expect(a.predictions).not.toEqual(b.predictions);
  });
  it('trata virada do ano sem ambiguidades de timezone', () => {
    expect(nextMonth('2026-12')).toBe('2027-01');
    expect(monthRange('2026-12-01', '2027-02-28')).toEqual(['2026-12', '2027-01', '2027-02']);
  });
});
