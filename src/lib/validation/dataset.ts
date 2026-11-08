import { datasetSchema, type Dataset } from '../../types/domain';

/** Validate the complete snapshot before replacing any currently valid data. */
export function validateDataset(input: unknown): Dataset {
  const data = datasetSchema.parse(input);
  const errors: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) errors.push(message);
  };
  for (const [name, records] of Object.entries(data)) {
    if (!Array.isArray(records)) continue;
    check(new Set(records.map((r) => r.id)).size === records.length, `${name}: chave duplicada`);
  }
  const routes = new Map(data.routes.map((r) => [r.id, r]));
  const deps = new Map(data.departures.map((d) => [d.id, d]));
  const customers = new Set(data.customers.map((c) => c.id));
  const leads = new Map(data.leads.map((l) => [l.id, l]));
  const bookings = new Map(data.bookings.map((b) => [b.id, b]));
  const partners = new Map(data.partners.map((p) => [p.id, p]));
  check(
    data.metadata.historyStart <= data.metadata.historyEnd &&
      data.metadata.historyEnd < data.metadata.referenceDate,
    'Corte histórico inválido',
  );
  for (const dep of data.departures) {
    check(routes.has(dep.routeId), `${dep.id}: roteiro inexistente`);
    check(
      dep.date <= dep.endDate && dep.transferDue <= dep.date,
      `${dep.id}: datas inconsistentes`,
    );
  }
  for (const lead of data.leads) {
    check(
      routes.has(lead.routeId) && lead.createdAt <= data.metadata.referenceDate,
      `${lead.id}: roteiro ou data inválidos`,
    );
  }
  validateBookings(data, check);
  for (const partner of data.partners)
    check(routes.has(partner.routeId), `${partner.id}: roteiro inexistente`);
  for (const row of data.allocations) {
    const dep = deps.get(row.departureId);
    check(
      !!dep && partners.get(row.partnerId)?.routeId === dep.routeId,
      `${row.id}: hospedagem/saída incompatíveis`,
    );
    check(
      !!dep && row.date >= dep.date && row.date <= dep.endDate,
      `${row.id}: data fora da saída`,
    );
    check(
      !!dep && !!routes.get(dep.routeId)?.stages.includes(row.locality),
      `${row.id}: etapa fora do roteiro`,
    );
  }
  for (const row of data.costs) {
    const dep = deps.get(row.departureId);
    check(!!dep && row.date === dep.date, `${row.id}: custo sem saída/data compatível`);
    check(
      (row.status === 'realized') === (!!dep && dep.date <= data.metadata.referenceDate),
      `${row.id}: status financeiro incompatível`,
    );
  }
  for (const row of data.feedback) {
    const booking = bookings.get(row.bookingId);
    const dep = booking && deps.get(booking.departureId);
    check(
      booking?.status === 'confirmed' &&
        !!dep &&
        row.date >= dep.endDate &&
        row.date <= data.metadata.referenceDate,
      `${row.id}: avaliação sem viagem concluída`,
    );
  }
  for (const row of data.payments) {
    const booking = bookings.get(row.bookingId);
    check(
      (booking?.status === 'confirmed' ||
        (booking?.status === 'cancelled' && !!booking.confirmedAt)) &&
        !!booking &&
        row.date >= booking.bookedAt &&
        row.date <= data.metadata.referenceDate,
      `${row.id}: pagamento inválido`,
    );
  }
  const paidByBooking = new Map<string, number>();
  for (const payment of data.payments)
    paidByBooking.set(
      payment.bookingId,
      (paidByBooking.get(payment.bookingId) ?? 0) + payment.amount,
    );
  for (const booking of bookings.values()) {
    const paid = paidByBooking.get(booking.id) ?? 0;
    check(paid <= booking.totalAmount, `${booking.id}: pagamentos excedem valor contratado`);
    check(
      customers.has(booking.customerId) && leads.has(booking.leadId),
      `${booking.id}: vínculo inválido`,
    );
  }
  if (errors.length) throw new Error(errors.slice(0, 20).join('\n'));
  return data;
}

function validateBookings(data: Dataset, check: (ok: boolean, message: string) => void): void {
  const deps = new Map(data.departures.map((d) => [d.id, d]));
  const leads = new Map(data.leads.map((l) => [l.id, l]));
  const customers = new Set(data.customers.map((c) => c.id));
  const travelers = new Set<string>();
  const linkedLeads = new Set<string>();
  for (const booking of data.bookings) {
    const dep = deps.get(booking.departureId);
    const lead = leads.get(booking.leadId);
    check(
      booking.confirmedAt === null ||
        (booking.confirmedAt >= booking.bookedAt &&
          booking.confirmedAt <= data.metadata.referenceDate),
      `${booking.id}: data do evento de confirmação inválida`,
    );
    check(
      !!dep && !!lead && lead.routeId === dep.routeId && lead.category === booking.category,
      `${booking.id}: lead/saída inválidos`,
    );
    check(
      !!dep && booking.bookedAt <= dep.date && booking.bookedAt <= data.metadata.referenceDate,
      `${booking.id}: contratação posterior à saída/corte`,
    );
    check(
      !!lead && lead.createdAt <= booking.bookedAt,
      `${booking.id}: lead posterior à contratação`,
    );
    check(
      booking.travelerIds.includes(booking.customerId),
      `${booking.id}: titular não é viajante`,
    );
    check(!linkedLeads.has(booking.leadId), `${booking.id}: lead vinculado a múltiplas reservas`);
    linkedLeads.add(booking.leadId);
    check(
      booking.status !== 'confirmed' ||
        (!!booking.confirmedAt &&
          booking.confirmedAt >= booking.bookedAt &&
          booking.confirmedAt <= data.metadata.referenceDate),
      `${booking.id}: confirmação inválida`,
    );
    check(
      booking.status !== 'pending' || booking.confirmedAt === null,
      `${booking.id}: confirmação de reserva inativa`,
    );
    check(
      !!lead && (lead.stage === 'won') === (booking.status === 'confirmed'),
      `${booking.id}: conversão inconsistente`,
    );
    for (const customerId of booking.travelerIds) {
      check(customers.has(customerId), `${booking.id}: cliente inexistente`);
      const key = `${booking.departureId}/${customerId}`;
      if (booking.status !== 'cancelled')
        check(!travelers.has(key), `${booking.id}: viajante duplicado na saída`);
      if (booking.status !== 'cancelled') travelers.add(key);
    }
  }
}
