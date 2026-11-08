import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze, DEFAULT_FILTERS, margin } from '../src/lib/analytics/metrics';
import { validateDataset } from '../src/lib/validation/dataset';
import { forecastDataset } from '../src/lib/forecasting/dataset';
import { deriveAlerts } from '../src/lib/analytics/alerts';
import { detectAnomalies } from '../src/lib/analytics/anomalies';
import type { Filters } from '../src/types/domain';

const fixture = validateDataset(
  JSON.parse(readFileSync(new URL('./fixtures/kpi-reference.json', import.meta.url), 'utf8')),
);
const references = JSON.parse(
  readFileSync(new URL('./fixtures/kpi-reference-expected.json', import.meta.url), 'utf8'),
) as { name: string; filters: Filters; expected: Record<string, number | null> }[];
describe('Auditoria por carteira pequena calculada manualmente', () => {
  it.each(references)('$name confere com o resultado independente', ({ filters, expected }) => {
    const view = analyze(fixture, filters);
    const actual = {
      ...view,
      bookings: view.bookings.length,
      confirmedBookings: view.confirmed.length,
      responses: view.feedback.length,
    } as Record<string, unknown>;
    for (const [key, value] of Object.entries(expected))
      expect(actual[key], key).toBeCloseTo(value!, 8);
  });
  it('não duplica receita por participante e mantém recebimento de cancelamento', () => {
    const view = analyze(fixture, references[0].filters);
    expect(view.totalRevenue).toBe(2100);
    expect(view.paid).toBe(1000);
    expect(margin(view.totalRevenue, view.cost)).toBeCloseTo((100 * 1500) / 2100);
    expect(view.allocations.reduce((sum, slot) => sum + slot.shortage, 0)).toBe(2);
  });
  it('preserva no consolidado o custo sem receita que não tem base de rateio', () => {
    const views = references.slice(0, 3).map((reference) => analyze(fixture, reference.filters));
    expect(views[0].cost - views[1].cost - views[2].cost).toBeCloseTo(50);
    expect(analyze(fixture, { ...references[0].filters, route: 'ausente' }).ticket).toBeNull();
  });
  it('verifica as referências da previsão sem alterar algoritmos ou seed', () => {
    const data = validateDataset(
      JSON.parse(readFileSync(new URL('../public/data/demo.json', import.meta.url), 'utf8')),
    );
    const forecast = forecastDataset(data, DEFAULT_FILTERS);
    expect(forecast.selectedId).toBe('ridge');
    expect(
      forecast.validation.find((score) => score.modelId === 'ridge' && score.horizon === 3)!.mae,
    ).toBeCloseTo(2.5817044738013415, 10);
    const score = forecast.metrics.find((row) => row.modelId === 'ridge')!;
    expect(score).toMatchObject({ count: 6 });
    expect(score.mae).toBeCloseTo(2.5566699870100056, 10);
    expect(score.rmse).toBeCloseTo(2.750766255921746, 10);
    expect(score.bias).toBeCloseTo(1.377065113775157, 10);
    expect(score.wape).toBeCloseTo(38.35004980515008, 10);
    expect(forecast.uncertainty.coverage?.hits).toBe(5);
    expect(
      deriveAlerts(data, DEFAULT_FILTERS, { attention: 75, critical: 85, costOverrun: 20 }),
    ).toHaveLength(12);
    expect(detectAnomalies(data, DEFAULT_FILTERS, forecast.history)).toHaveLength(0);
  });
});
