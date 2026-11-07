import type { Alert, Dataset, Filters, Thresholds } from '../../types/domain';
import { analyze } from './metrics';
import { sum } from '../format';

export function deriveAlerts(data: Dataset, filters: Filters, thresholds: Thresholds): Alert[] {
  const view = analyze(data, filters);
  const reference = data.metadata.referenceDate;
  const alerts: Alert[] = [];
  const upcoming = view.departures.filter((d) => d.date >= reference);
  const add = (alert: Alert) => alerts.push(alert);
  for (const dep of upcoming) {
    const days = (Date.parse(dep.date) - Date.parse(reference)) / 86400000;
    const rows = view.confirmed.filter((b) => b.departureId === dep.id);
    const missing = rows.filter((b) => !b.formComplete).length;
    if (days <= 7 && missing)
      add({
        id: `forms-${dep.id}`,
        type: 'Ficha pré-viagem',
        severity: 'critical',
        routeId: dep.routeId,
        departureId: dep.id,
        date: dep.date,
        cause: `${missing} reserva(s) com ficha incompleta a ${days} dias da saída.`,
        action: 'Concluir a conferência das fichas antes da saída.',
      });
    if (!dep.transferConfirmed && dep.transferDue <= reference)
      add({
        id: `transfer-${dep.id}`,
        type: 'Transfer de bagagem',
        severity: 'critical',
        routeId: dep.routeId,
        departureId: dep.id,
        date: dep.transferDue,
        cause: 'Transfer sem confirmação após o prazo operacional.',
        action: 'Confirmar o prestador e o horário de coleta.',
      });
    const depCosts = view.costs.filter((c) => c.departureId === dep.id);
    const budget = sum(depCosts, (c) => c.budget);
    const actual = sum(depCosts, (c) => c.amount);
    if (budget > 0 && (actual / budget - 1) * 100 > thresholds.costOverrun)
      add({
        id: `cost-${dep.id}`,
        type: 'Desvio de custo',
        severity: 'attention',
        routeId: dep.routeId,
        departureId: dep.id,
        date: dep.date,
        cause: `Custo estimado ${(100 * (actual / budget - 1)).toFixed(1)}% acima do orçamento.`,
        action: 'Revisar cotações e a margem da saída.',
      });
    const travelers = sum(rows, (b) => b.travelerIds.length);
    if (travelers > dep.capacity)
      add({
        id: `departure-${dep.id}`,
        type: 'Capacidade da saída',
        severity: 'critical',
        routeId: dep.routeId,
        departureId: dep.id,
        date: dep.date,
        cause: `${travelers} viajantes para ${dep.capacity} vagas na saída.`,
        action: 'Revisar a capacidade do grupo e contratar vagas.',
      });
  }
  for (const slot of view.allocations.filter((a) => a.date >= reference && a.committed > 0)) {
    const base = { routeId: slot.routeId, departureId: slot.departureId, date: slot.date };
    if (!slot.confirmed)
      add({
        ...base,
        id: `unconfirmed-${slot.id}`,
        type: 'Hospedagem sem confirmação',
        severity: 'attention',
        cause: `${slot.locality} · ${slot.category}: ${slot.committed} vagas comprometidas sem confirmação.`,
        action: 'Confirmar a contratação com a hospedagem demonstrativa.',
      });
    if (slot.occupancy >= thresholds.attention)
      add({
        ...base,
        id: `occupancy-${slot.id}`,
        type: 'Ocupação de hospedagem',
        severity: slot.occupancy > thresholds.critical ? 'critical' : 'attention',
        cause: `${slot.locality} · ${slot.category}: ${slot.committed}/${slot.capacity} vagas (${slot.occupancy.toFixed(0)}%).`,
        action: slot.shortage
          ? `Contratar pelo menos ${slot.shortage} vaga(s) para esta data/etapa.`
          : 'Negociar uma alternativa antes de aceitar novas reservas.',
      });
  }
  return alerts.sort(
    (a, b) =>
      Number(b.severity === 'critical') - Number(a.severity === 'critical') ||
      a.date.localeCompare(b.date),
  );
}
