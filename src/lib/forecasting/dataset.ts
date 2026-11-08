import type { Dataset, Filters } from '../../types/domain';
import { monthRange } from '../format';
import { fingerprint } from '../analytics/numerical';
import { forecastDemand, type ForecastResult, type Observation } from './models';

const cache = new WeakMap<Dataset, Map<string, ForecastResult>>();
const versions = new WeakMap<Dataset, string>();
export function snapshotFingerprint(data: Dataset): string {
  let version = versions.get(data);
  if (!version) {
    version = fingerprint(data);
    versions.set(data, version);
  }
  return version;
}

export function historicalSeries(data: Dataset, filters: Filters): Observation[] {
  const start =
    filters.start > data.metadata.historyStart ? filters.start : data.metadata.historyStart;
  const end = filters.end < data.metadata.historyEnd ? filters.end : data.metadata.historyEnd;
  const routes = new Map(data.routes.map((route) => [route.id, route]));
  const departures = new Map(data.departures.map((departure) => [departure.id, departure]));
  const demand = new Map<string, number>();
  for (const booking of data.bookings) {
    const departure = departures.get(booking.departureId)!;
    const route = routes.get(departure.routeId)!;
    if (
      booking.status !== 'confirmed' ||
      departure.date < start ||
      departure.date > end ||
      (filters.route !== 'all' && filters.route !== route.id) ||
      (filters.modality !== 'all' && filters.modality !== route.modality) ||
      (filters.category !== 'all' && filters.category !== booking.category)
    )
      continue;
    const month = departure.date.slice(0, 7);
    demand.set(month, (demand.get(month) ?? 0) + booking.travelerIds.length);
  }
  return monthRange(start, end)
    .filter((month) => {
      const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10);
      return `${month}-01` >= start && lastDay <= end;
    })
    .map((month) => ({ month, travelers: demand.get(month) ?? 0 }));
}

/** Snapshot identity bounds cache lifetime; no forecast survives replacement of API data. */
export function forecastDataset(data: Dataset, filters: Filters, horizon = 6): ForecastResult {
  let results = cache.get(data);
  if (!results) {
    results = new Map();
    cache.set(data, results);
  }
  const key = JSON.stringify({ filters, horizon });
  const previous = results.get(key);
  if (previous) return previous;
  const result = forecastDemand(historicalSeries(data, filters), horizon, {
    snapshotId: fingerprint({ snapshot: snapshotFingerprint(data), filters }),
    dataVersion: data.metadata.version,
  });
  if (results.size >= 32) results.delete(results.keys().next().value!);
  results.set(key, result);
  return result;
}
