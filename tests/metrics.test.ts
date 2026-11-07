import { describe, expect, it } from 'vitest';
import {
  averageTicket,
  cancellationRate,
  conversionRate,
  margin,
  nps,
  occupancy,
  revenue,
} from '../src/lib/analytics/metrics';
import type { Booking } from '../src/types/domain';
const booking = (
  id: string,
  status: Booking['status'],
  totalAmount: number,
  leadId = `L-${id}`,
): Booking => ({
  id,
  status,
  totalAmount,
  leadId,
  customerId: 'C1',
  travelerIds: ['C1', 'C2'],
  departureId: 'D1',
  category: 'Conforto',
  bookedAt: '2026-01-01',
  confirmedAt: status === 'confirmed' ? '2026-01-01' : null,
  formComplete: true,
  cancellationReason: null,
});
describe('KPIs com valores calculáveis à mão', () => {
  it('calcula NPS em escala −100 a 100 e inclui neutros no denominador', () => {
    expect(nps([10, 9, 8, 7, 6])).toBe(20);
    expect(nps([0, 6])).toBe(-100);
    expect(nps([9, 10])).toBe(100);
  });
  it('retorna ausência de NPS sem respostas', () => expect(nps([])).toBeNull());
  it('calcula ocupação por mesmo slot, inclusive acima de 100%', () => {
    expect(occupancy(17, 20)).toBe(85);
    expect(occupancy(11, 10)).toBeCloseTo(110);
    expect(occupancy(0, 0)).toBeNull();
  });
  it('não duplica receita de reservas com vários participantes', () => {
    const rows = [
      booking('1', 'confirmed', 200),
      booking('2', 'confirmed', 100),
      booking('3', 'cancelled', 900),
      booking('4', 'pending', 1000),
    ];
    expect(revenue(rows)).toBe(300);
    expect(averageTicket(rows)).toBe(150);
  });
  it('não cria ticket sem reservas confirmadas', () =>
    expect(averageTicket([booking('1', 'cancelled', 200)])).toBeNull());
  it('calcula margem incluindo resultado negativo e ausência de denominador', () => {
    expect(margin(1000, 700)).toBe(30);
    expect(margin(100, 120)).toBe(-20);
    expect(margin(0, 0)).toBeNull();
  });
  it('calcula taxa de cancelamento sobre todos os status', () => {
    expect(cancellationRate([booking('1', 'confirmed', 50), booking('2', 'cancelled', 50)])).toBe(
      50,
    );
    expect(cancellationRate([])).toBeNull();
  });
  it('mede conversão somente por leads vinculados e únicos', () => {
    const rows = [
      booking('1', 'confirmed', 50, 'L1'),
      booking('2', 'confirmed', 50, 'L1'),
      booking('3', 'pending', 50, 'L2'),
      booking('4', 'confirmed', 50, 'outro'),
    ];
    expect(conversionRate(['L1', 'L2', 'L3', 'L4'], rows)).toBe(25);
    expect(conversionRate([], rows)).toBeNull();
  });
});
