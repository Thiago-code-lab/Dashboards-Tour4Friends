import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { analyze, DEFAULT_FILTERS, DEFAULT_THRESHOLDS } from '../src/lib/analytics/metrics';
import { validateDataset } from '../src/lib/validation/dataset';
import { forecastDataset } from '../src/lib/forecasting/dataset';
import {
  cancellationAnalysis,
  satisfactionAnalysis,
  seasonalAnalysis,
} from '../src/lib/analytics/statistics';
import { deriveAlerts } from '../src/lib/analytics/alerts';
import { detectAnomalies } from '../src/lib/analytics/anomalies';
import { mean, sum } from '../src/lib/format';
import type { Filters } from '../src/types/domain';

const raw = readFileSync('public/data/demo.json');
const data = validateDataset(JSON.parse(raw.toString('utf8')));
const scopes: { name: string; filters: Filters }[] = [
  { name: 'Histórico completo e compromissos até dezembro de 2026', filters: DEFAULT_FILTERS },
  { name: 'Caminho Francês', filters: { ...DEFAULT_FILTERS, way: 'Francês' } },
  { name: 'Caminho Português', filters: { ...DEFAULT_FILTERS, way: 'Português' } },
];

function summarize({ name, filters }: (typeof scopes)[number]) {
  const view = analyze(data, filters);
  const forecast = forecastDataset(data, filters);
  return {
    name,
    filters,
    kpis: {
      bookings: view.bookings.length,
      confirmed: view.confirmed.length,
      travelers: view.travelers,
      cancelled: view.bookings.filter((booking) => booking.status === 'cancelled').length,
      cancellationRate: view.cancellationRate,
      occupancy: view.occupancy,
      committed: sum(view.allocations, (slot) => slot.committed),
      capacity: sum(view.allocations, (slot) => slot.capacity),
      shortageSlots: view.allocations.filter((slot) => slot.shortage > 0).length,
      nps: view.nps,
      responses: view.feedback.length,
      promoters: view.feedback.filter((row) => row.nps >= 9).length,
      detractors: view.feedback.filter((row) => row.nps <= 6).length,
      service: mean(view.feedback.map((row) => row.service)),
      accommodation: mean(view.feedback.map((row) => row.accommodation)),
      logistics: mean(view.feedback.map((row) => row.logistics)),
      revenue: view.totalRevenue,
      realizedRevenue: view.realizedRevenue,
      cost: view.cost,
      contribution: view.totalRevenue - view.cost,
    },
    routes: view.routeStats,
    monthly: view.monthly,
    forecast: {
      selected: forecast.selected,
      reason: forecast.reason,
      sample: forecast.sample,
      validation: forecast.validation,
      test: forecast.metrics,
      independentTest: forecast.independentTest,
      trainEnd: forecast.trainEnd,
      testStart: forecast.testStart,
      predictions: forecast.predictions,
      uncertainty: forecast.uncertainty,
    },
    seasonality: seasonalAnalysis(forecast.history),
    cancellations: cancellationAnalysis(data, filters),
    satisfaction: satisfactionAnalysis(data, filters),
    alerts: deriveAlerts(data, filters, DEFAULT_THRESHOLDS),
    anomalies: detectAnomalies(data, filters, forecast.history),
  };
}

mkdirSync('docs/p2-visualizacao/evidencias', { recursive: true });
writeFileSync(
  'docs/p2-visualizacao/evidencias/metricas.json',
  JSON.stringify(
    {
      datasetSha256: createHash('sha256').update(raw).digest('hex'),
      metadata: data.metadata,
      source: 'public/data/demo.json',
      scopes: scopes.map(summarize),
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write('Métricas P2 recalculadas sem modificar o dataset.\n');
