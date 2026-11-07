import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateDataset } from '../src/lib/validation/dataset';
import { analyze, DEFAULT_FILTERS, DEFAULT_THRESHOLDS } from '../src/lib/analytics/metrics';
import { deriveAlerts } from '../src/lib/analytics/alerts';
import { importBookingsCsv } from '../src/lib/csv';
import Papa from 'papaparse';
import type { Dataset } from '../src/types/domain';
const source: Dataset = JSON.parse(
  readFileSync(new URL('../public/data/demo.json', import.meta.url), 'utf8'),
) as Dataset;
const fresh = () => structuredClone(source);
describe('Contrato e integridade da base sintética', () => {
  it('valida o snapshot inteiro e a escala de uma pequena agência', () => {
    const d = validateDataset(source);
    expect(d.metadata.source_type).toBe('synthetic_demo');
    expect(d.customers.length).toBeGreaterThanOrEqual(80);
    expect(d.customers.length).toBeLessThanOrEqual(140);
    expect(d.bookings.length).toBeLessThanOrEqual(180);
    expect(d.feedback.length).toBe(72);
  });
  it('rejeita chaves duplicadas', () => {
    const d = fresh();
    d.bookings.push(d.bookings[0]);
    expect(() => validateDataset(d)).toThrow(/duplicada/);
  });
  it('rejeita cliente inexistente', () => {
    const d = fresh();
    d.bookings[0].customerId = 'inexistente';
    expect(() => validateDataset(d)).toThrow();
  });
  it('rejeita feedback órfão', () => {
    const d = fresh();
    d.feedback[0].bookingId = 'inexistente';
    expect(() => validateDataset(d)).toThrow(/avaliação/);
  });
  it('rejeita etapas de outro roteiro', () => {
    const d = fresh();
    d.allocations[0].locality = 'Cidade de outro caminho';
    expect(() => validateDataset(d)).toThrow(/etapa/);
  });
  it('rejeita data inválida, nota fora da escala, status inválido e quantidades negativas', () => {
    for (const mutate of [
      (d: Dataset) => {
        d.bookings[0].bookedAt = '2026-02-30';
      },
      (d: Dataset) => {
        d.feedback[0].nps = 11;
      },
      (d: Dataset) => {
        d.bookings[0].totalAmount = -1;
      },
      (d: Dataset) => {
        (d.bookings[0] as unknown as Record<string, unknown>).status = 'unknown';
      },
    ]) {
      const d = fresh();
      mutate(d);
      expect(() => validateDataset(d)).toThrow();
    }
  });
  it('rejeita pagamento excessivo e pagamento de reserva cancelada', () => {
    const d = fresh();
    d.payments[0].amount = 99999999;
    expect(() => validateDataset(d)).toThrow(/pagamentos excedem/);
    const e = fresh();
    e.payments[0].bookingId = e.bookings.find((b) => b.status === 'cancelled')!.id;
    expect(() => validateDataset(e)).toThrow(/pagamento/);
  });
  it('mantém zeros nos 34 meses entre janeiro de 2024 e outubro de 2026', () => {
    const v = analyze(source, DEFAULT_FILTERS);
    expect(v.monthly.length).toBe(34);
    expect(v.monthly[0].month).toBe('2024-01');
    expect(v.monthly.at(-1)!.month).toBe('2026-10');
    expect(v.monthly.some((p) => p.travelers === 0)).toBe(true);
  });
  it('altera KPIs e tabelas sob todos os filtros globais', () => {
    const base = analyze(source, DEFAULT_FILTERS);
    const v = analyze(source, {
      ...DEFAULT_FILTERS,
      route: source.routes[0].id,
      category: 'Premium',
      modality: 'A pé',
    });
    expect(v.bookings.length).toBeLessThan(base.bookings.length);
    expect(
      v.bookingRows.every((b) => b.routeId === source.routes[0].id && b.category === 'Premium'),
    ).toBe(true);
    const none = analyze(source, {
      ...DEFAULT_FILTERS,
      route: source.routes[0].id,
      modality: 'Bicicleta',
    });
    expect(none.totalRevenue).toBe(0);
    expect(none.ticket).toBeNull();
  });
  it('receita contratada corresponde a uma soma única de reservas, e realizada + futura reconcilia', () => {
    const v = analyze(source, DEFAULT_FILTERS);
    expect(v.totalRevenue).toBe(v.confirmed.reduce((s, b) => s + b.totalAmount, 0));
    expect(v.realizedRevenue + v.contractedFuture).toBe(v.totalRevenue);
  });
  it('usa slots equivalentes e não compensa faltas entre datas', () => {
    const v = analyze(source, DEFAULT_FILTERS);
    expect(v.allocations.every((a) => a.available >= 0 && a.shortage >= 0)).toBe(true);
    expect(v.allocations.filter((a) => a.shortage > 0).length).toBeGreaterThan(0);
  });
});
describe('Alertas derivados de registros', () => {
  it('possui IDs estáveis, tipos, causas, ações e datas', () => {
    const a = deriveAlerts(source, DEFAULT_FILTERS, DEFAULT_THRESHOLDS);
    expect(a.length).toBeGreaterThan(0);
    expect(new Set(a.map((v) => v.id)).size).toBe(a.length);
    expect(a.every((v) => v.cause && v.action && v.date)).toBe(true);
  });
  it('remove alertas de ficha ao completar os registros', () => {
    const d = fresh();
    d.bookings.forEach((b) => {
      b.formComplete = true;
    });
    expect(
      deriveAlerts(d, DEFAULT_FILTERS, DEFAULT_THRESHOLDS).some(
        (a) => a.type === 'Ficha pré-viagem',
      ),
    ).toBe(false);
  });
  it('respeita a data de referência e os limites configurados', () => {
    const d = fresh();
    d.metadata.referenceDate = '2027-02-01';
    expect(deriveAlerts(d, DEFAULT_FILTERS, DEFAULT_THRESHOLDS)).toHaveLength(0);
    const low = deriveAlerts(source, DEFAULT_FILTERS, {
      ...DEFAULT_THRESHOLDS,
      attention: 50,
      critical: 60,
    });
    expect(low.length).toBeGreaterThan(
      deriveAlerts(source, DEFAULT_FILTERS, DEFAULT_THRESHOLDS).length,
    );
  });
});
describe('Importação atômica local', () => {
  const csv = (rows: Dataset['bookings']) =>
    Papa.unparse(
      rows.map((b) => ({
        ...b,
        travelerIds: b.travelerIds.join('|'),
        confirmedAt: b.confirmedAt ?? '',
        cancellationReason: b.cancellationReason ?? '',
      })),
      { delimiter: ';' },
    );
  it('reimporta um arquivo técnico sem duplicar registros', () => {
    const result = importBookingsCsv(csv(source.bookings.slice(0, 5)), source);
    expect(result.bookings.length).toBe(source.bookings.length);
    expect(analyze(result, DEFAULT_FILTERS).totalRevenue).toBe(
      analyze(source, DEFAULT_FILTERS).totalRevenue,
    );
  });
  it('rejeita arquivo com FK inválida e preserva o snapshot anterior', () => {
    const before = JSON.stringify(source);
    const rows = structuredClone(source.bookings.slice(0, 1));
    rows[0].customerId = 'fake';
    expect(() => importBookingsCsv(csv(rows), source)).toThrow();
    expect(JSON.stringify(source)).toBe(before);
  });
  it('rejeita colunas incompletas e IDs duplicados no lote', () => {
    expect(() => importBookingsCsv('id;status\nA;confirmed', source)).toThrow(/Colunas/);
    expect(() => importBookingsCsv(csv([source.bookings[0], source.bookings[0]]), source)).toThrow(
      /duplicada/,
    );
  });
});
