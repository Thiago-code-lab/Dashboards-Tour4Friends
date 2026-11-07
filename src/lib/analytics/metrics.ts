import type { Booking, Dataset, Filters, Thresholds } from '../../types/domain';
import { divide, mean, monthRange, sum } from '../format';

export function nps(scores: number[]): number | null {
  if (!scores.length) return null;
  return (
    (100 * (scores.filter((v) => v >= 9).length - scores.filter((v) => v <= 6).length)) /
    scores.length
  );
}
export const occupancy = (committed: number, capacity: number): number | null => {
  const ratio = divide(committed, capacity);
  return ratio === null ? null : ratio * 100;
};
export const revenue = (bookings: Booking[]): number =>
  sum(
    bookings.filter((b) => b.status === 'confirmed'),
    (b) => b.totalAmount,
  );
export const averageTicket = (bookings: Booking[]): number | null =>
  divide(revenue(bookings), bookings.filter((b) => b.status === 'confirmed').length);
export const margin = (income: number, cost: number): number | null =>
  income > 0 ? (100 * (income - cost)) / income : null;
export const cancellationRate = (bookings: Booking[]): number | null =>
  occupancy(bookings.filter((b) => b.status === 'cancelled').length, bookings.length);
export const conversionRate = (leadIds: string[], bookings: Booking[]): number | null => {
  const cohort = new Set(leadIds);
  return occupancy(
    new Set(
      bookings.filter((b) => b.status === 'confirmed' && cohort.has(b.leadId)).map((b) => b.leadId),
    ).size,
    cohort.size,
  );
};
export const DEFAULT_FILTERS: Filters = {
  start: '2024-01-01',
  end: '2026-12-31',
  route: 'all',
  modality: 'all',
  category: 'all',
};
export const DEFAULT_THRESHOLDS: Thresholds = { attention: 75, critical: 85, costOverrun: 20 };
export const inPeriod = (date: string, filters: Filters): boolean =>
  date >= filters.start && date <= filters.end;

/** Build joined views once; pages share a memoized result instead of fetching or joining independently. */
export function analyze(data: Dataset, filters: Filters) {
  const routeMap = new Map(data.routes.map((r) => [r.id, r]));
  const depMap = new Map(data.departures.map((d) => [d.id, d]));
  const leadMap = new Map(data.leads.map((l) => [l.id, l]));
  const customerMap = new Map(data.customers.map((c) => [c.id, c]));
  const partnerMap = new Map(data.partners.map((p) => [p.id, p]));
  const allByDeparture = Map.groupBy(data.bookings, (b) => b.departureId);
  const routeMatches = (id: string) =>
    (filters.route === 'all' || id === filters.route) &&
    (filters.modality === 'all' || routeMap.get(id)?.modality === filters.modality);
  const routes = data.routes.filter((r) => routeMatches(r.id));
  const bookings = data.bookings.filter(
    (b) =>
      routeMatches(depMap.get(b.departureId)!.routeId) &&
      inPeriod(depMap.get(b.departureId)!.date, filters) &&
      (filters.category === 'all' || b.category === filters.category),
  );
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const bookingIds = new Set(bookings.map((b) => b.id));
  const departures = data.departures.filter(
    (d) => routeMatches(d.routeId) && inPeriod(d.date, filters),
  );
  const departureIds = new Set(departures.map((d) => d.id));
  const leads = data.leads.filter(
    (l) =>
      routeMatches(l.routeId) &&
      inPeriod(l.createdAt, filters) &&
      (filters.category === 'all' || l.category === filters.category),
  );
  const feedback = data.feedback.filter((f) => bookingIds.has(f.bookingId));
  const bookingsByDep = Map.groupBy(confirmed, (b) => b.departureId);
  const allocations = data.allocations
    .filter(
      (a) =>
        departureIds.has(a.departureId) &&
        (filters.category === 'all' || a.category === filters.category),
    )
    .map((a) => {
      const committed = sum(bookingsByDep.get(a.departureId) ?? [], (b) =>
        b.category === a.category ? b.travelerIds.length : 0,
      );
      const dep = depMap.get(a.departureId)!;
      return {
        ...a,
        routeId: dep.routeId,
        routeName: routeMap.get(dep.routeId)!.shortName,
        committed,
        occupancy: occupancy(committed, a.capacity)!,
        available: Math.max(0, a.capacity - committed),
        shortage: Math.max(0, committed - a.capacity),
        partnerName: partnerMap.get(a.partnerId)!.name,
      };
    });
  const costs = data.costs
    .filter((c) => departureIds.has(c.departureId))
    .map((c) => {
      const total = revenue(allByDeparture.get(c.departureId) ?? []);
      const share =
        filters.category === 'all'
          ? 1
          : (divide(revenue(bookingsByDep.get(c.departureId) ?? []), total) ?? 0);
      return { ...c, amount: c.amount * share, budget: c.budget * share };
    });
  const bookingRows = bookings.map((b) => {
    const dep = depMap.get(b.departureId)!;
    return {
      ...b,
      routeId: dep.routeId,
      routeName: routeMap.get(dep.routeId)!.shortName,
      travelDate: dep.date,
      travelers: b.travelerIds.length,
      customer: customerMap.get(b.customerId)!.label,
      channel: leadMap.get(b.leadId)!.channel,
    };
  });
  const bookingsByMonth = Map.groupBy(bookingRows, (b) => b.travelDate.slice(0, 7));
  const costsByMonth = Map.groupBy(costs, (c) => c.date.slice(0, 7));
  const feedbackByMonth = Map.groupBy(feedback, (f) => f.date.slice(0, 7));
  const monthly = monthRange(
    filters.start,
    filters.end < data.metadata.historyEnd ? filters.end : data.metadata.historyEnd,
  ).map((month) => {
    const rows = bookingsByMonth.get(month) ?? [];
    return {
      month,
      travelers: sum(
        rows.filter((b) => b.status === 'confirmed'),
        (b) => b.travelers,
      ),
      reservations: rows.length,
      revenue: revenue(rows),
      cost: sum(costsByMonth.get(month) ?? [], (c) => c.amount),
      nps: nps((feedbackByMonth.get(month) ?? []).map((f) => f.nps)),
      ticket: averageTicket(rows),
    };
  });
  const routeStats = routes
    .map((route) => {
      const rows = bookingRows.filter((b) => b.routeId === route.id);
      const routeDeps = new Set(departures.filter((d) => d.routeId === route.id).map((d) => d.id));
      const income = revenue(rows);
      const cost = sum(
        costs.filter((c) => routeDeps.has(c.departureId)),
        (c) => c.amount,
      );
      const ids = new Set(rows.map((b) => b.id));
      const ratings = feedback.filter((f) => ids.has(f.bookingId));
      const beds = allocations.filter((a) => a.routeId === route.id);
      return {
        ...route,
        travelers: sum(
          rows.filter((b) => b.status === 'confirmed'),
          (b) => b.travelers,
        ),
        departures: routeDeps.size,
        revenue: income,
        cost,
        contribution: income - cost,
        margin: margin(income, cost),
        ticket: averageTicket(rows),
        cancellations: rows.filter((b) => b.status === 'cancelled').length,
        nps: nps(ratings.map((f) => f.nps)),
        satisfaction: mean(ratings.map((f) => f.service)),
        responses: ratings.length,
        occupancy: occupancy(
          sum(beds, (a) => a.committed),
          sum(beds, (a) => a.capacity),
        ),
      };
    })
    .sort((a, b) => b.travelers - a.travelers);
  const completed = confirmed.filter(
    (b) => depMap.get(b.departureId)!.endDate <= data.metadata.referenceDate,
  );
  const realizedRevenue = revenue(completed);
  const closedLeadIds = new Set(
    data.bookings.filter((b) => b.status !== 'cancelled').map((b) => b.leadId),
  );
  const cohortLeadIds = new Set(leads.map((l) => l.id));
  const pipeline =
    sum(
      leads.filter(
        (l) => ['new', 'qualified', 'proposal'].includes(l.stage) && !closedLeadIds.has(l.id),
      ),
      (l) => l.potentialValue,
    ) +
    sum(
      data.bookings.filter((b) => b.status === 'pending' && cohortLeadIds.has(b.leadId)),
      (b) => b.totalAmount,
    );
  return {
    bookings,
    confirmed,
    bookingRows,
    departures,
    leads,
    feedback,
    allocations,
    costs,
    monthly,
    routeStats,
    routes,
    pipeline,
    totalRevenue: revenue(bookings),
    realizedRevenue,
    contractedFuture: revenue(
      confirmed.filter((b) => depMap.get(b.departureId)!.endDate > data.metadata.referenceDate),
    ),
    cost: sum(costs, (c) => c.amount),
    travelers: sum(confirmed, (b) => b.travelerIds.length),
    servedTravelers: sum(completed, (b) => b.travelerIds.length),
    uniqueCustomers: new Set(confirmed.flatMap((b) => b.travelerIds)).size,
    nps: nps(feedback.map((f) => f.nps)),
    ticket: averageTicket(bookings),
    occupancy: occupancy(
      sum(allocations, (a) => a.committed),
      sum(allocations, (a) => a.capacity),
    ),
    cancellationRate: cancellationRate(bookings),
    conversion: conversionRate(
      leads.map((l) => l.id),
      data.bookings,
    ),
    paid: sum(
      data.payments.filter((p) => bookingIds.has(p.bookingId)),
      (p) => p.amount,
    ),
    closingDays: mean(
      confirmed.map(
        (b) => (Date.parse(b.bookedAt) - Date.parse(leadMap.get(b.leadId)!.createdAt)) / 86400000,
      ),
    ),
  };
}
export type Analysis = ReturnType<typeof analyze>;
