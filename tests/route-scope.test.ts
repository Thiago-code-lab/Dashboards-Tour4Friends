import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateDataset } from '../src/lib/validation/dataset';
import { analyze, DEFAULT_FILTERS } from '../src/lib/analytics/metrics';
import { dependentScope } from '../src/lib/analytics/route-scope';
import { historicalSeries } from '../src/lib/forecasting/dataset';

const data = validateDataset(JSON.parse(readFileSync('public/data/demo.json', 'utf8')));
describe('Caminho e modalidade do histórico', () => {
  it.each(['Francês', 'Português'] as const)(
    'reconcilia %s com seus roteiros e previsão',
    (way) => {
      const filters = { ...DEFAULT_FILTERS, way };
      const combined = analyze(data, filters);
      const individual = combined.routes.map((route) =>
        analyze(data, { ...filters, route: route.id }),
      );
      expect(combined.routes).toHaveLength(2);
      expect(combined.totalRevenue).toBeCloseTo(
        individual.reduce((sum, view) => sum + view.totalRevenue, 0),
      );
      expect(combined.allocations.length).toBe(
        individual.reduce((sum, view) => sum + view.allocations.length, 0),
      );
      const series = historicalSeries(data, filters);
      const separate = combined.routes.map((route) =>
        historicalSeries(data, { ...filters, route: route.id }),
      );
      expect(series.map((row) => row.travelers)).toEqual(
        series.map((_, index) => separate.reduce((sum, rows) => sum + rows[index].travelers, 0)),
      );
    },
  );
  it('limpa dependências ao trocar caminho e impede roteiro de outra modalidade', () => {
    const selected = dependentScope(
      data.routes,
      { ...DEFAULT_FILTERS, route: 'portugues' },
      'modality',
      'Bicicleta',
    );
    expect(selected.route).toBe('all');
    expect(selected.modality).toBe('Bicicleta');
    expect(dependentScope(data.routes, selected, 'way', 'Francês')).toMatchObject({
      way: 'Francês',
      route: 'all',
      modality: 'all',
    });
  });
  it('mantém histórico original e retorna recorte vazio para combinação externa inválida', () => {
    expect(analyze(data, DEFAULT_FILTERS).routes).toHaveLength(6);
    const empty = analyze(data, { ...DEFAULT_FILTERS, way: 'Francês', route: 'portugues' });
    expect(empty.routes).toEqual([]);
    expect(empty.occupancy).toBeNull();
    expect(empty.nps).toBeNull();
  });
});
