import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { validateDataset } from '../src/lib/validation/dataset';
import { DEFAULT_FILTERS } from '../src/lib/analytics/metrics';
import { forecastDataset, snapshotFingerprint } from '../src/lib/forecasting/dataset';
import { forecastDemand } from '../src/lib/forecasting/models';
import {
  seasonalAnalysis,
  cancellationAnalysis,
  satisfactionAnalysis,
} from '../src/lib/analytics/statistics';
import { detectAnomalies } from '../src/lib/analytics/anomalies';

const data = validateDataset(JSON.parse(readFileSync('public/data/demo.json', 'utf8')));
const forecast = forecastDataset(data, DEFAULT_FILTERS, 6);
const durations = Array.from({ length: 20 }, () => {
  const start = performance.now();
  forecastDemand(forecast.history, 6);
  return performance.now() - start;
}).sort((a, b) => a - b);
const result = {
  snapshotId: snapshotFingerprint(data),
  forecast,
  seasonality: seasonalAnalysis(forecast.history),
  cancellations: cancellationAnalysis(data, DEFAULT_FILTERS),
  satisfaction: satisfactionAnalysis(data, DEFAULT_FILTERS),
  anomalies: detectAnomalies(data, DEFAULT_FILTERS, forecast.history),
  routes: data.routes.map((route) => {
    const model = forecastDataset(data, { ...DEFAULT_FILTERS, route: route.id }, 6);
    return {
      route: route.shortName,
      selected: model.selected,
      independentTest: model.independentTest,
      reason: model.reason,
      validation: model.validation.filter((score) => score.horizon === 3),
      metrics: model.metrics,
    };
  }),
  performance: { runs: durations.length, medianMs: durations[10], maxMs: durations.at(-1) },
};
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/analytics-results.json', JSON.stringify(result, null, 2));
process.stdout.write(
  JSON.stringify(
    {
      snapshotId: result.snapshotId,
      selected: forecast.selected,
      sample: forecast.sample,
      validation: forecast.validation,
      metrics: forecast.metrics,
      coverage: forecast.uncertainty.coverage,
      bands: forecast.uncertainty.bands,
      seasonality: result.seasonality.conclusion,
      cancellations: result.cancellations.conclusion,
      satisfaction: result.satisfaction.conclusion,
      anomalies: result.anomalies.map((row) => ({
        id: row.id,
        scope: row.scope,
        observed: row.observed,
        reference: row.reference,
        sample: row.sample,
        intensity: row.intensity,
      })),
      routes: result.routes.map((row) => ({
        route: row.route,
        selected: row.selected,
        independent: row.independentTest,
      })),
      performance: result.performance,
    },
    null,
    2,
  ),
);
