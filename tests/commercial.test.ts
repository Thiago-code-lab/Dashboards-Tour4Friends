import { describe, expect, it } from 'vitest';
import {
  accommodationReferenceSchema,
  accommodationReferences,
  commercialRoutes,
  documentedPrice,
} from '../src/lib/commercial/catalog';
import { calculateQuote, parseEuroCents, type QuoteSelection } from '../src/lib/commercial/quote';

const selection: QuoteSelection = {
  routeId: 'sarria',
  startDate: '2027-05-10',
  category: 'Standard',
  occupancy: 'individual',
  travelers: 2,
};
const costs = [{ id: 'one', city: 'Sarria', stage: 'Pernoite inicial', amount: '900,25' }];

describe('catálogo documental separado da base histórica', () => {
  it('preserva sete partidas autorizadas e distingue Central e Costa', () => {
    expect(commercialRoutes.map((route) => route.id)).toEqual([
      'sjpp',
      'astorga',
      'sarria',
      'lisboa',
      'porto-central',
      'porto-costa',
      'tui-valenca',
    ]);
    expect(commercialRoutes.find((route) => route.id === 'porto-central')?.variant).toBe('Central');
    expect(commercialRoutes.find((route) => route.id === 'porto-costa')?.variant).toBe('Costa');
    expect(commercialRoutes.every((route) => route.operationalSource === null)).toBe(true);
    expect(accommodationReferences).toEqual([]);
  });
  it.each([
    ['sarria', 1980, 1450, 1530, 1100],
    ['astorga', 3290, 2390, 2440, 1780],
    ['sjpp', 7400, 5400, 5410, 3980],
    ['tui-valenca', 2070, 1510, 1580, 1140],
    ['porto-central', 3130, 2250, 2280, 1640],
    ['porto-costa', 3250, 2340, 2390, 1730],
  ])('confere todas as tarifas de %s por pessoa', (id, si, sd, ti, td) => {
    for (const [category, occupancy, expected] of [
      ['Superior', 'individual', si],
      ['Superior', 'duplo', sd],
      ['Standard', 'individual', ti],
      ['Standard', 'duplo', td],
    ] as const)
      expect(documentedPrice(String(id), category, occupancy, selection.startDate)).toBe(
        Number(expected) * 100,
      );
  });
  it.each(['2027-05-01', '2027-06-30', '2027-09-01', '2027-10-31'])(
    'aceita alta temporada em %s',
    (date) => {
      expect(documentedPrice('sarria', 'Standard', 'individual', date)).toBe(153000);
    },
  );
  it.each([
    ['lisboa', 'Standard', 'individual', '2027-05-10'],
    ['sarria', 'Econômico', 'individual', '2027-05-10'],
    ['sarria', 'Premium', 'individual', '2027-05-10'],
    ['sarria', 'Standard', 'triplo', '2027-05-10'],
    ['baiona', 'Standard', 'individual', '2027-05-10'],
    ['sarria', 'Standard', 'individual', '2026-05-10'],
    ['sarria', 'Standard', 'individual', '2027-07-10'],
    ['sarria', 'Standard', 'individual', '2027-06-31'],
  ])('não inventa preço para %s %s %s %s', (id, category, occupancy, date) => {
    expect(documentedPrice(id, category, occupancy, date)).toBeNull();
  });
  it('exige rastreabilidade e status não verificado de hospedagens', () => {
    const reference = {
      id: 'ref',
      routeId: 'sarria',
      city: 'Sarria',
      stage: 'Inicial',
      name: 'Teste de validação',
      category: 'Standard',
      sourceDocument: 'planilha.xlsx',
      sourceReferenceDate: '2026-11-14',
      status: 'Sugestão de referência — não verificada',
    };
    expect(accommodationReferenceSchema.safeParse(reference).success).toBe(true);
    expect(
      accommodationReferenceSchema.safeParse({ ...reference, status: 'Parceiro confirmado' })
        .success,
    ).toBe(false);
    expect(
      accommodationReferenceSchema.safeParse({ ...reference, sourceDocument: '' }).success,
    ).toBe(false);
  });
});

describe('orçamento preliminar em EUR', () => {
  it('calcula centavos, total por pessoa e resultado parcial sobre venda', () => {
    const quote = calculateQuote(
      selection,
      [...costs, { ...costs[0], id: 'two', amount: '100.10' }],
      true,
    );
    expect(quote).toMatchObject({
      currency: 'EUR',
      status: 'Orçamento preliminar',
      unitSaleCents: 153000,
      totalSaleCents: 306000,
      lodgingCents: 100035,
      partialResultCents: 205965,
      issues: [],
    });
    expect(quote.partialPercent).toBeCloseTo((205965 / 306000) * 100);
  });
  it('tarifa dupla continua sendo por pessoa', () => {
    expect(calculateQuote({ ...selection, occupancy: 'duplo' }, costs, true).totalSaleCents).toBe(
      220000,
    );
  });
  it('preserva resultado negativo e custo zero explícito', () => {
    expect(
      calculateQuote(selection, [{ ...costs[0], amount: '4000' }], true).partialResultCents,
    ).toBe(-94000);
    expect(calculateQuote(selection, [{ ...costs[0], amount: '0' }], true).partialPercent).toBe(
      100,
    );
  });
  it.each(['', '-1', '1e4', 'Infinity', 'NaN', '0.001', '1.000,00', '100000000'])(
    'recusa valor manual malformado %s',
    (amount) => {
      expect(parseEuroCents(amount)).toBeNull();
      expect(
        calculateQuote(selection, [{ ...costs[0], amount }], true).partialResultCents,
      ).toBeNull();
    },
  );
  it.each([
    {},
    { travelers: 0 },
    { travelers: 1.5 },
    { travelers: 101 },
    { travelers: NaN },
    { routeId: 'unknown' },
    { startDate: '' },
    { category: 'Econômico' },
    { routeId: 'lisboa' },
  ])('bloqueia seleção inválida ou preço ausente %j', (patch) => {
    const quote = calculateQuote(
      Object.keys(patch).length ? { ...selection, ...patch } : {},
      costs,
      true,
    );
    expect(quote.status).toBe('Orçamento incompleto');
    expect(quote.partialResultCents).toBeNull();
  });
  it('exige custos identificados e confirmação de completude', () => {
    for (const [items, complete] of [
      [[], true],
      [costs, false],
      [[{ ...costs[0], city: '' }], true],
      [[{ ...costs[0], stage: '' }], true],
    ] as const) {
      expect(calculateQuote(selection, items, complete).partialResultCents).toBeNull();
    }
  });
});
