import type { Dataset, Filters } from '../../types/domain';
import type { Observation } from '../forecasting/models';
import { describe, quantile, wilson, fingerprint } from './numerical';
import { nps } from './metrics';
import { number, percent } from '../format';

export function seasonalAnalysis(history: Observation[]) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    ...describe(
      history
        .filter((point) => Number(point.month.slice(5)) === index + 1)
        .map((point) => point.travelers),
    ),
  }));
  const ranked = months.filter((row) => row.n > 0).sort((a, b) => b.mean! - a.mean!);
  const peak = ranked[0];
  const trough = ranked.at(-1);
  return {
    months,
    distribution: describe(history.map((point) => point.travelers)),
    histogram: [
      { name: '0', lower: -1, upper: 0 },
      { name: '1–3', lower: 0, upper: 3 },
      { name: '4–6', lower: 3, upper: 6 },
      { name: '7–9', lower: 6, upper: 9 },
      { name: '10+', lower: 9, upper: Infinity },
    ].map((bin) => ({
      name: bin.name,
      value: history.filter((point) => point.travelers > bin.lower && point.travelers <= bin.upper)
        .length,
    })),
    conclusion: peak
      ? `O mês ${peak.month} tem a maior média observada (${number(peak.mean)} viajantes; n=${peak.n}), ante ${number(trough!.mean)} no mês ${trough!.month}. Compare disponibilidade antes de ampliar vendas; são apenas ${peak.n} repetições do mês, sem comprovação inferencial de sazonalidade.`
      : 'Não há meses completos para comparar sazonalidade.',
  };
}

export function historicalBookings(data: Dataset, filters: Filters) {
  const routes = new Map(data.routes.map((route) => [route.id, route]));
  const departures = new Map(data.departures.map((departure) => [departure.id, departure]));
  const cutoff = filters.end < data.metadata.historyEnd ? filters.end : data.metadata.historyEnd;
  return data.bookings.filter((booking) => {
    const departure = departures.get(booking.departureId)!;
    const route = routes.get(departure.routeId)!;
    return (
      departure.date >= filters.start &&
      departure.date <= cutoff &&
      (filters.route === 'all' || route.id === filters.route) &&
      (filters.modality === 'all' || route.modality === filters.modality) &&
      (filters.category === 'all' || booking.category === filters.category)
    );
  });
}

export function cancellationAnalysis(data: Dataset, filters: Filters) {
  const bookings = historicalBookings(data, filters);
  const departures = new Map(data.departures.map((departure) => [departure.id, departure]));
  const routes = new Map(data.routes.map((route) => [route.id, route.shortName]));
  const leads = new Map(data.leads.map((lead) => [lead.id, lead]));
  const dimensions = [
    {
      dimension: 'Roteiro',
      key: (booking: (typeof bookings)[number]) =>
        routes.get(departures.get(booking.departureId)!.routeId)!,
    },
    {
      dimension: 'Canal',
      key: (booking: (typeof bookings)[number]) => leads.get(booking.leadId)!.channel,
    },
    { dimension: 'Categoria', key: (booking: (typeof bookings)[number]) => booking.category },
  ];
  const groups = dimensions.flatMap(({ dimension, key }) =>
    [...Map.groupBy(bookings, key)].map(([name, rows]) => {
      const cancelled = rows.filter((row) => row.status === 'cancelled').length;
      const interval = wilson(cancelled, rows.length)!;
      return {
        dimension,
        name,
        n: rows.length,
        cancelled,
        rate: (100 * cancelled) / rows.length,
        lower: 100 * interval.lower,
        upper: 100 * interval.upper,
        lowSample: rows.length < 10,
      };
    }),
  );
  const highest = groups
    .filter((group) => group.dimension === 'Roteiro' && !group.lowSample)
    .sort((a, b) => b.rate - a.rate)[0];
  return {
    groups,
    n: bookings.length,
    cancelled: bookings.filter((row) => row.status === 'cancelled').length,
    conclusion: highest
      ? `${highest.name} apresenta a maior taxa observada entre roteiros com ao menos dez reservas: ${percent(highest.rate)} (${highest.cancelled}/${highest.n}), Wilson 95% ${number(highest.lower)}–${number(highest.upper)}%. Investigue motivos e canais; ranking descritivo não comprova diferença entre grupos.`
      : 'Não há roteiro com dez reservas para um ranking minimamente estável. As taxas exibidas exigem cautela.',
  };
}

function seededRandom(seed: string): () => number {
  let state = parseInt(fingerprint(seed).slice(0, 8), 16) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** Resampling customers preserves within-customer repeated responses. Exploratory only. */
export function bootstrapNps(rows: { customerId: string; nps: number }[], iterations = 500) {
  if (!Number.isInteger(iterations) || iterations < 100 || iterations > 5000)
    throw new Error('Número de reamostragens inválido.');
  const clusters = [...Map.groupBy(rows, (row) => row.customerId).values()];
  if (rows.length < 12 || clusters.length < 8) return null;
  const random = seededRandom(JSON.stringify(rows));
  const estimates = Array.from({ length: iterations }, () => {
    const scores: number[] = [];
    for (let i = 0; i < clusters.length; i++)
      scores.push(...clusters[Math.floor(random() * clusters.length)].map((row) => row.nps));
    return nps(scores)!;
  });
  return {
    lower: quantile(estimates, 0.1)!,
    upper: quantile(estimates, 0.9)!,
    iterations,
    clusters: clusters.length,
  };
}

export function satisfactionAnalysis(data: Dataset, filters: Filters) {
  const bookings = new Map(
    historicalBookings(data, filters).map((booking) => [booking.id, booking]),
  );
  const departures = new Map(data.departures.map((departure) => [departure.id, departure]));
  const routes = new Map(data.routes.map((route) => [route.id, route.shortName]));
  const cutoff = filters.end < data.metadata.historyEnd ? filters.end : data.metadata.historyEnd;
  const rows = data.feedback
    .filter((feedback) => bookings.has(feedback.bookingId) && feedback.date <= cutoff)
    .map((feedback) => {
      const booking = bookings.get(feedback.bookingId)!;
      return {
        ...feedback,
        customerId: booking.customerId,
        category: booking.category,
        route: routes.get(departures.get(booking.departureId)!.routeId)!,
      };
    });
  const groups = (['route', 'category'] as const).flatMap((dimension) =>
    [...Map.groupBy(rows, (row) => row[dimension])].map(([name, group]) => ({
      dimension: dimension === 'route' ? 'Roteiro' : 'Categoria',
      name,
      n: group.length,
      nps: nps(group.map((row) => row.nps))!,
      scores: describe(group.map((row) => row.nps)),
      service: describe(group.map((row) => row.service)),
      accommodation: describe(group.map((row) => row.accommodation)),
      logistics: describe(group.map((row) => row.logistics)),
      bootstrap: bootstrapNps(group),
      lowSample: group.length < 12,
    })),
  );
  const eligible = groups
    .filter((group) => group.dimension === 'Roteiro' && !group.lowSample)
    .sort((a, b) => a.nps - b.nps);
  const lowest = eligible[0];
  return {
    groups,
    n: rows.length,
    distribution: Array.from({ length: 11 }, (_, score) => ({
      score,
      count: rows.filter((row) => row.nps === score).length,
    })),
    conclusion: lowest
      ? `${lowest.name} tem o menor NPS observado entre roteiros com 12 respostas: ${number(lowest.nps)} (n=${lowest.n}). Hospedagem ${number(lowest.accommodation.mean)}, atendimento ${number(lowest.service.mean)} e logística ${number(lowest.logistics.mean)} em dez pontos. Revise comentários; seleção de respondentes e amostra pequena impedem concluir causalidade ou diferença robusta.`
      : `Há ${rows.length} respostas; nenhum roteiro reúne 12 para comparação estável. Mostramos as distribuições sem declarar superioridade.`,
  };
}
