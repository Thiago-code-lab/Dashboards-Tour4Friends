import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { capacityPlan } from '../src/lib/forecasting/capacity';
import { validateDataset } from '../src/lib/validation/dataset';
import { DEFAULT_FILTERS } from '../src/lib/analytics/metrics';
const data = validateDataset(
  JSON.parse(readFileSync(new URL('../public/data/demo.json', import.meta.url), 'utf8')),
);
describe('Planejamento respeita compromissos sem alterar a previsão', () => {
  it('não planeja menos vagas que viajantes futuros confirmados', () => {
    const predictions = [{ month: '2026-11', predicted: 1 }];
    const plan = capacityPlan(data, DEFAULT_FILTERS, predictions);
    expect(plan[0].committed).toBeGreaterThan(1);
    expect(plan[0].beds).toBe(plan[0].committed);
    expect(predictions[0].predicted).toBe(1);
  });
  it('recalcula a simulação e arredonda vagas para cima', () => {
    const plan = capacityPlan(data, DEFAULT_FILTERS, [{ month: '2027-04', predicted: 10.1 }], 10);
    expect(plan[0].simulated).toBeCloseTo(11.11);
    expect(plan[0].beds).toBe(12);
  });
  it('respeita filtros e não introduz compromissos históricos como novos', () => {
    const none = capacityPlan(
      data,
      { ...DEFAULT_FILTERS, route: 'portugues', modality: 'Bicicleta' },
      [{ month: '2026-11', predicted: 1 }],
    );
    expect(none[0].committed).toBe(0);
    expect(
      capacityPlan(data, DEFAULT_FILTERS, [{ month: '2025-05', predicted: 1 }])[0].committed,
    ).toBe(0);
  });
});
