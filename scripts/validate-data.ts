import { readFile } from 'node:fs/promises';
import { validateDataset } from '../src/lib/validation/dataset';
import { analyze, DEFAULT_FILTERS, DEFAULT_THRESHOLDS } from '../src/lib/analytics/metrics';
import { deriveAlerts } from '../src/lib/analytics/alerts';
import { forecastDemand } from '../src/lib/forecasting/models';

const raw: unknown = JSON.parse(
  await readFile(new URL('../public/data/demo.json', import.meta.url), 'utf-8'),
);
const data = validateDataset(raw);
const view = analyze(data, DEFAULT_FILTERS);
const forecast = forecastDemand(view.monthly, 6);
process.stdout.write(
  JSON.stringify(
    {
      valid: true,
      entities: Object.fromEntries(
        Object.entries(data)
          .filter(([, value]) => Array.isArray(value))
          .map(([name, value]) => [name, (value as unknown[]).length]),
      ),
      kpis: {
        confirmed: view.confirmed.length,
        travelers: view.travelers,
        served: view.servedTravelers,
        realizedRevenue: view.realizedRevenue,
        contractedRevenue: view.totalRevenue,
        nps: view.nps,
        occupancy: view.occupancy,
      },
      alerts: deriveAlerts(data, DEFAULT_FILTERS, DEFAULT_THRESHOLDS).length,
      forecast: {
        selected: forecast.selected,
        metrics: forecast.metrics,
        predictions: forecast.predictions,
        trainEnd: forecast.trainEnd,
        testStart: forecast.testStart,
      },
    },
    null,
    2,
  ) + '\n',
);
