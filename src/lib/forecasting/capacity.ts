import type { Dataset, Filters } from '../../types/domain';
import type { ForecastResult } from './models';

/** Future commitments constrain planning, never the model's training or validation. */
export function capacityPlan(
  data: Dataset,
  filters: Filters,
  predictions: ForecastResult['predictions'],
  adjustment = 0,
  simulation: { extraPerDeparture?: number; contractedPercent?: number } = {},
) {
  if (
    !Number.isFinite(adjustment) ||
    adjustment < -100 ||
    adjustment > 200 ||
    !Number.isInteger(simulation.extraPerDeparture ?? 0) ||
    (simulation.extraPerDeparture ?? 0) < 0 ||
    (simulation.extraPerDeparture ?? 0) > 100 ||
    !Number.isFinite(simulation.contractedPercent ?? 0) ||
    Math.abs(simulation.contractedPercent ?? 0) > 100
  )
    throw new Error('Parâmetros de capacidade inválidos.');
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
    const selectedDepartures = data.departures.filter((departure) => {
      const route = routes.get(departure.routeId)!;
      return (
        departure.date.slice(0, 7) === p.month &&
        departure.date > data.metadata.historyEnd &&
        (filters.route === 'all' || filters.route === route.id) &&
        (filters.modality === 'all' || filters.modality === route.modality)
      );
    });
    const departureIds = new Set(selectedDepartures.map((departure) => departure.id));
    const scheduledCapacity = selectedDepartures.reduce(
      (sum, departure) => sum + departure.capacity,
      0,
    );
    const simulatedCapacity =
      scheduledCapacity + selectedDepartures.length * (simulation.extraPerDeparture ?? 0);
    const contractedBedNights = data.allocations
      .filter(
        (slot) =>
          departureIds.has(slot.departureId) &&
          slot.confirmed &&
          (filters.category === 'all' || slot.category === filters.category),
      )
      .reduce((sum, slot) => sum + slot.capacity, 0);
    const beds = Math.max(committed, Math.ceil(simulated));
    return {
      ...p,
      simulated,
      committed,
      beds,
      scheduledCapacity,
      simulatedCapacity,
      additionalTravelers: beds - Math.max(committed, Math.ceil(p.predicted)),
      scheduledGap: Math.max(0, beds - simulatedCapacity),
      contractedBedNights,
      simulatedBedNights: Math.floor(
        contractedBedNights * (1 + (simulation.contractedPercent ?? 0) / 100),
      ),
    };
  });
}

/** Only concrete commitments are assigned to existing dates/stages; forecasts remain monthly. */
export function concreteCapacity(
  data: Dataset,
  filters: Filters,
  months: string[],
  contractedPercent = 0,
) {
  if (!Number.isFinite(contractedPercent) || Math.abs(contractedPercent) > 100)
    throw new Error('Simulação contratual inválida.');
  const routes = new Map(data.routes.map((route) => [route.id, route]));
  const selected = new Set(
    data.departures
      .filter((departure) => {
        const route = routes.get(departure.routeId)!;
        return (
          departure.date > data.metadata.historyEnd &&
          months.includes(departure.date.slice(0, 7)) &&
          (filters.route === 'all' || route.id === filters.route) &&
          (filters.modality === 'all' || route.modality === filters.modality)
        );
      })
      .map((departure) => departure.id),
  );
  const commitments = new Map<string, number>();
  for (const booking of data.bookings) {
    if (
      booking.status !== 'confirmed' ||
      !selected.has(booking.departureId) ||
      (filters.category !== 'all' && filters.category !== booking.category)
    )
      continue;
    const key = `${booking.departureId}:${booking.category}`;
    commitments.set(key, (commitments.get(key) ?? 0) + booking.travelerIds.length);
  }
  return data.allocations
    .filter(
      (slot) =>
        selected.has(slot.departureId) &&
        (filters.category === 'all' || slot.category === filters.category),
    )
    .map((slot) => {
      const committed = commitments.get(`${slot.departureId}:${slot.category}`) ?? 0;
      const contracted = slot.confirmed ? slot.capacity : 0;
      const simulated = Math.floor(contracted * (1 + contractedPercent / 100));
      return {
        id: slot.id,
        departureId: slot.departureId,
        date: slot.date,
        stage: slot.locality,
        category: slot.category,
        committed,
        contracted,
        simulated,
        shortage: Math.max(0, committed - simulated),
        originalShortage: Math.max(0, committed - contracted),
        confirmed: slot.confirmed,
      };
    });
}
