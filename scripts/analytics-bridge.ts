import { readFileSync } from 'node:fs';
import { validateDataset } from '../src/lib/validation/dataset';
import { analyze, DEFAULT_FILTERS } from '../src/lib/analytics/metrics';
import { forecastDemand } from '../src/lib/forecasting/models';
import { deriveAlerts } from '../src/lib/analytics/alerts';
import { DEFAULT_THRESHOLDS } from '../src/lib/analytics/metrics';
import type { Filters } from '../src/types/domain';

const request = JSON.parse(readFileSync(0, 'utf8')) as { dataset: unknown; filters?: Filters[] };
const data = validateDataset(request.dataset);
const results = (request.filters ?? [DEFAULT_FILTERS]).map((filters) => {
  const view = analyze(data, filters);
  return {
    confirmedBookings: view.confirmed.length,
    bookings: view.bookings.length,
    travelers: view.travelers,
    servedTravelers: view.servedTravelers,
    uniqueCustomers: view.uniqueCustomers,
    totalRevenue: view.totalRevenue,
    realizedRevenue: view.realizedRevenue,
    contractedFuture: view.contractedFuture,
    cost: view.cost,
    ticket: view.ticket,
    nps: view.nps,
    responses: view.feedback.length,
    cancellationRate: view.cancellationRate,
    conversion: view.conversion,
    occupancy: view.occupancy,
    paid: view.paid,
    monthly: view.monthly,
    forecast: forecastDemand(view.monthly, 6),
    alertIds: deriveAlerts(data, filters, DEFAULT_THRESHOLDS)
      .map((a) => a.id)
      .sort(),
  };
});
process.stdout.write(JSON.stringify(results));
