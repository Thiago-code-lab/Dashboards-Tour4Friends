import type { Dataset, Filters } from '../../types/domain';
import type { Observation } from '../forecasting/models';
import { seasonalForecast } from '../forecasting/models';
import { historicalBookings, cancellationAnalysis } from './statistics';
import { robustDeviation, wilson } from './numerical';
import { number } from '../format';

export type StatisticalAnomaly = {
  id: string;
  indicator: string;
  scope: string;
  date: string;
  observed: number;
  reference: number;
  unit: string;
  method: string;
  sample: number;
  intensity: number;
  level: 'attention';
  explanation: string;
  investigation: string;
};

export function demandAnomalies(history: Observation[]): StatisticalAnomaly[] {
  const result: StatisticalAnomaly[] = [];
  const residuals: number[] = [];
  for (let index = 12; index < history.length; index++) {
    const predicted = seasonalForecast(
      history.slice(0, index).map((point) => point.travelers),
      1,
    )[0];
    const error = history[index].travelers - predicted;
    const deviation = robustDeviation(error, residuals, 8);
    if (deviation && Math.abs(deviation.score) > 3.5)
      result.push({
        id: `demand-${history[index].month}`,
        indicator: 'Demanda inesperada',
        scope: history[index].month,
        date: `${history[index].month}-01`,
        observed: history[index].travelers,
        reference: predicted + deviation.reference,
        unit: 'viajantes',
        method: `Sazonal prévio + ${deviation.method}`,
        sample: deviation.sample,
        intensity: Math.abs(deviation.score),
        level: 'attention',
        explanation: `Desvio ${number(deviation.score)} em relação apenas a erros anteriores. A previsão foi emitida com treino até ${history[index - 1].month}.`,
        investigation:
          'Verificar concentração de saídas, cancelamentos e revisões do histórico; não há causa comprovada.',
      });
    residuals.push(error);
  }
  return result;
}

function normalizedOperations(data: Dataset, filters: Filters) {
  const bookings = historicalBookings(data, { ...filters, category: 'all' });
  const grouped = Map.groupBy(
    bookings.filter((booking) => booking.status === 'confirmed'),
    (booking) => booking.departureId,
  );
  const routes = new Map(data.routes.map((route) => [route.id, route]));
  const cutoff = filters.end < data.metadata.historyEnd ? filters.end : data.metadata.historyEnd;
  return data.departures
    .filter((departure) => departure.endDate <= cutoff && grouped.has(departure.id))
    .map((departure) => {
      const route = routes.get(departure.routeId)!;
      const confirmed = grouped.get(departure.id)!;
      const travelers = confirmed.reduce((sum, booking) => sum + booking.travelerIds.length, 0);
      const revenue = confirmed.reduce((sum, booking) => sum + booking.totalAmount, 0);
      return { departure, route, travelers, revenue, travelerDays: travelers * route.days };
    });
}

function costAnomalies(data: Dataset, filters: Filters): StatisticalAnomaly[] {
  const departures = new Map(
    normalizedOperations(data, filters).map((row) => [row.departure.id, row]),
  );
  const rows = data.costs
    .filter((cost) => cost.status === 'realized' && departures.has(cost.departureId))
    .map((cost) => {
      const row = departures.get(cost.departureId)!;
      return {
        cost,
        row,
        value: cost.amount / row.travelerDays,
        group: `${row.route.id}:${cost.category}`,
      };
    });
  const groups = Map.groupBy(rows, (row) => row.group);
  return rows.flatMap((row): StatisticalAnomaly[] => {
    const peers = groups
      .get(row.group)!
      .filter((peer) => peer.cost.id !== row.cost.id)
      .map((peer) => peer.value);
    const deviation = robustDeviation(row.value, peers);
    if (!deviation || deviation.score <= 3.5) return [];
    return [
      {
        id: `cost-${row.cost.id}`,
        indicator: 'Custo por viajante-dia',
        scope: `${row.row.route.shortName} · ${row.cost.category} · ${row.cost.departureId}`,
        date: row.cost.date,
        observed: row.value,
        reference: deviation.reference,
        unit: 'BRL/viajante-dia',
        method: `${deviation.method}, comparação retrospectiva`,
        sample: deviation.sample,
        intensity: deviation.score,
        level: 'attention',
        explanation: `Custo realizado normalizado por ${row.row.travelers} viajantes × ${row.row.route.days} dias; pares do mesmo roteiro e rubrica. Custos de saída não são rateados por categoria de hospedagem.`,
        investigation:
          'Conferir rubricas, contratos e escala do grupo. Um valor incomum não comprova erro ou fraude.',
      },
    ];
  });
}

function operationalAnomalies(data: Dataset, filters: Filters): StatisticalAnomaly[] {
  const rows = normalizedOperations(data, filters);
  const groups = Map.groupBy(rows, (row) => row.route.id);
  const result: StatisticalAnomaly[] = [];
  for (const row of rows) {
    const observed = (100 * row.travelers) / row.departure.capacity;
    const peers = groups
      .get(row.route.id)!
      .filter((peer) => peer.departure.id !== row.departure.id)
      .map((peer) => (100 * peer.travelers) / peer.departure.capacity);
    const deviation = robustDeviation(observed, peers);
    if (!deviation || Math.abs(deviation.score) <= 3.5) continue;
    result.push({
      id: `occupancy-${row.departure.id}`,
      indicator: 'Ocupação atípica do grupo',
      scope: `${row.route.shortName} · ${row.departure.id}`,
      date: row.departure.date,
      observed,
      reference: deviation.reference,
      unit: '% da capacidade de saída',
      method: `${deviation.method}, retrospectivo`,
      sample: deviation.sample,
      intensity: Math.abs(deviation.score),
      level: 'attention',
      explanation:
        'Razão entre viajantes confirmados e capacidade física da saída; não representa ocupação de hotel.',
      investigation:
        'Comparar calendário, composição das reservas e tamanho do grupo; não inferir causalidade.',
    });
  }
  const cancellations = cancellationAnalysis(data, filters);
  for (const group of cancellations.groups.filter(
    (item) => item.dimension === 'Roteiro' && item.n >= 10,
  )) {
    const remainder = cancellations.n - group.n;
    const reference =
      remainder >= 20 ? wilson(cancellations.cancelled - group.cancelled, remainder) : null;
    if (!reference || group.lower / 100 <= reference.upper) continue;
    result.push({
      id: `cancel-${group.name}`,
      indicator: 'Cancelamento acima da referência',
      scope: group.name,
      date: filters.end < data.metadata.historyEnd ? filters.end : data.metadata.historyEnd,
      observed: group.rate,
      reference: (100 * (cancellations.cancelled - group.cancelled)) / remainder,
      unit: '% de reservas',
      method: 'Limite Wilson inferior acima do superior dos demais roteiros',
      sample: group.n,
      intensity: group.lower - 100 * reference.upper,
      level: 'attention',
      explanation: `${group.cancelled}/${group.n} cancelamentos; comparação exploratória múltipla, sem ajuste para multiplicidade.`,
      investigation:
        'Revisar motivos e composição comercial; confirmar em novos períodos antes de agir.',
    });
  }
  return result;
}

export function detectAnomalies(data: Dataset, filters: Filters, history: Observation[]) {
  return [
    ...costAnomalies(data, filters),
    ...demandAnomalies(history),
    ...operationalAnomalies(data, filters),
  ].sort((a, b) => b.intensity - a.intensity || a.id.localeCompare(b.id));
}
