import { describe, expect, it } from 'vitest';
import { potentialDemand } from '../src/lib/market-demand';
import { availabilityRisk } from '../src/lib/commercial/availability';

const scenario = {
  brazilianPilgrims: 12345,
  start: '2025-01-01',
  end: '2025-12-31',
  source: 'Entrada de teste; não é estatística real',
  scope: 'Francês e Português',
};
const scope = { routeId: 'sarria', stage: 1, date: '2027-05-02', category: 'Standard' } as const;
const measurement = {
  ...scope,
  verified: true,
  source: 'Inventário fictício de teste',
  verifiedOn: '2027-05-01',
  capacity: 100,
  committed: 74,
};
describe('Premissa comercial independente', () => {
  it('aplica 0,5% sem arredondar pessoas e aceita zero explícito', () => {
    expect(potentialDemand(scenario)).toBeCloseTo(61.725);
    expect(potentialDemand({ ...scenario, brazilianPilgrims: 0 })).toBe(0);
  });
  it.each([
    { source: '' },
    { end: '2024-12-31' },
    { brazilianPilgrims: -1 },
    { brazilianPilgrims: Infinity },
    { scope: 'Brasil' },
  ])('rejeita entrada inválida %j', (patch) =>
    expect(potentialDemand({ ...scenario, ...patch })).toBeNull(),
  );
});
describe('Semáforo com evidências comparáveis', () => {
  it.each([
    [74, 'favorable'],
    [75, 'attention'],
    [85, 'attention'],
    [86, 'high'],
    [120, 'high'],
  ] as const)('classifica %s/100 como %s', (committed, expected) =>
    expect(availabilityRisk(scope, { ...measurement, committed }, '2027-05-01')).toBe(expected),
  );
  it.each([
    undefined,
    { ...measurement, verified: false },
    { ...measurement, routeId: 'astorga' },
    { ...measurement, stage: 2 },
    { ...measurement, category: 'Superior' },
    { ...measurement, date: '2027-05-03' },
    { ...measurement, capacity: 0 },
    { ...measurement, committed: -1 },
    { ...measurement, source: '' },
    { ...measurement, verifiedOn: '2027-04-30' },
  ])('retorna desconhecido sem comprovação comparável', (evidence) =>
    expect(availabilityRisk(scope, evidence, '2027-05-01')).toBe('unknown'),
  );
});
