import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { analyze, DEFAULT_FILTERS, DEFAULT_THRESHOLDS } from '../src/lib/analytics/metrics';
import { validateDataset } from '../src/lib/validation/dataset';
import { forecastDataset } from '../src/lib/forecasting/dataset';
import {
  seasonalAnalysis,
  cancellationAnalysis,
  satisfactionAnalysis,
} from '../src/lib/analytics/statistics';
import { deriveAlerts } from '../src/lib/analytics/alerts';
import { detectAnomalies } from '../src/lib/analytics/anomalies';
import { capacityPlan } from '../src/lib/forecasting/capacity';
const data = validateDataset(JSON.parse(readFileSync('public/data/demo.json', 'utf8')));
const view = analyze(data, DEFAULT_FILTERS);
const forecast = forecastDataset(data, DEFAULT_FILTERS);
mkdirSync('artifacts/qa-final', { recursive: true });
writeFileSync(
  'artifacts/qa-final/report-data.json',
  JSON.stringify(
    {
      metadata: data.metadata,
      datasetSha256: createHash('sha256')
        .update(readFileSync('public/data/demo.json'))
        .digest('hex'),
      filters: DEFAULT_FILTERS,
      counts: Object.fromEntries(
        Object.entries(data)
          .filter(([, value]) => Array.isArray(value))
          .map(([name, value]) => [name, (value as unknown[]).length]),
      ),
      kpis: {
        bookings: view.bookings.length,
        confirmed: view.confirmed.length,
        travelers: view.travelers,
        servedTravelers: view.servedTravelers,
        realizedRevenue: view.realizedRevenue,
        totalRevenue: view.totalRevenue,
        contractedFuture: view.contractedFuture,
        cost: view.cost,
        ticket: view.ticket,
        occupancy: view.occupancy,
        nps: view.nps,
        responses: view.feedback.length,
        cancellation: view.cancellationRate,
        paid: view.paid,
      },
      forecast,
      routes: view.routeStats,
      plan: capacityPlan(data, DEFAULT_FILTERS, forecast.predictions),
      seasonal: seasonalAnalysis(forecast.history),
      cancellations: cancellationAnalysis(data, DEFAULT_FILTERS),
      satisfaction: satisfactionAnalysis(data, DEFAULT_FILTERS),
      alerts: deriveAlerts(data, DEFAULT_FILTERS, DEFAULT_THRESHOLDS),
      anomalies: detectAnomalies(data, DEFAULT_FILTERS, forecast.history),
    },
    null,
    2,
  ),
);
process.stdout.write(
  'Dados do relatório acadêmico recalculados em artifacts/qa-final/report-data.json.\n',
);
