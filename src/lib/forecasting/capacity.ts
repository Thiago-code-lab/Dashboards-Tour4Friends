import type { Dataset, Filters } from '../../types/domain';
import type { ForecastResult } from './models';

/** Future commitments constrain planning, never the model's training or validation. */
export function capacityPlan(
  data: Dataset,
  filters: Filters,
  predictions: ForecastResult['predictions'],
  adjustment = 0,
) {
  const routes = new Map(data.routes.map((r) => [r.id, r]));
  const departures = new Map(data.departures.map((d) => [d.id, d]));
  const commitments = new Map<string, number>();
  for (const booking of data.bookings) {
    const departure = departures.get(booking.departureId)!;
    const route = routes.get(departure.routeId)!;
    if (
      booking.status !== 'confirmed' ||
      departure.date <= data.metadata.historyEnd ||
      (filters.route !== 'all' && filters.route !== route.id) ||
      (filters.modality !== 'all' && filters.modality !== route.modality) ||
      (filters.category !== 'all' && filters.category !== booking.category)
    )
      continue;
    const month = departure.date.slice(0, 7);
    commitments.set(month, (commitments.get(month) ?? 0) + booking.travelerIds.length);
  }
  return predictions.map((p) => {
    const simulated = p.predicted * (1 + adjustment / 100);
    const committed = commitments.get(p.month) ?? 0;
    return { ...p, simulated, committed, beds: Math.max(committed, Math.ceil(simulated)) };
  });
}
