import { describe, expect, it } from 'vitest';
import { commercialRoutes } from '../src/lib/commercial/catalog';
import { operationalItineraries } from '../src/lib/commercial/operational-data';
import {
  compareItineraries,
  documentedItinerarySchema,
  summarizeItinerary,
  type DocumentedItinerary,
} from '../src/lib/commercial/operational';

const documents = operationalItineraries.filter(
  (route): route is DocumentedItinerary => route.status === 'documented',
);
const sarria = documents.find((route) => route.routeId === 'sarria')!;

describe('percursos operacionais documentais', () => {
  it('vincula todas as partidas sem preencher percursos pendentes com dados sintéticos', () => {
    expect(operationalItineraries.map((route) => route.routeId)).toEqual(
      commercialRoutes.map((route) => route.id),
    );
    expect(documents.map((route) => route.routeId)).toEqual([
      'astorga',
      'sarria',
      'porto-central',
      'porto-costa',
    ]);
    expect(
      operationalItineraries
        .filter((route) => route.status === 'pending')
        .map((route) => route.routeId),
    ).toEqual(['sjpp', 'lisboa', 'tui-valenca']);
    for (const route of operationalItineraries.filter((entry) => entry.status === 'pending')) {
      expect(summarizeItinerary(route)).toEqual({
        durationDays: null,
        walkingStages: null,
        walkingDays: null,
        walkingKm: null,
      });
      expect(compareItineraries(route)[0].kind).toBe('pending');
    }
  });
  it.each([
    ['astorga', 18, 12, 257.6],
    ['sarria', 11, 5, 114.4],
    ['porto-central', 18, 12, 231.4],
    ['porto-costa', 18, 12, 256.2],
  ])('confere totalizações de %s com a tabela da fonte', (id, days, stages, km) => {
    const route = documents.find((entry) => entry.routeId === id)!;
    expect(summarizeItinerary(route)).toEqual({
      durationDays: days,
      walkingStages: stages,
      walkingDays: stages,
      walkingKm: km,
    });
    expect(route.declaredDurationDays).toBe(days);
    expect(route.declaredDistanceKm).toBe(km);
    expect(compareItineraries(route).filter((issue) => issue.kind === 'divergence')).toEqual([]);
  });
  it.each(documents.map((route) => [route.routeId, route] as const))(
    'preserva ordem, etapas e referência de %s',
    (_, route) => {
      expect(documentedItinerarySchema.safeParse(route).success).toBe(true);
      expect(route.days.map((day) => day.order)).toEqual(
        Array.from({ length: route.days.length }, (_, i) => i + 1),
      );
      const walks = route.days.filter((day) => day.walkingStage !== null);
      expect(walks.map((day) => day.walkingStage)).toEqual(
        Array.from({ length: walks.length }, (_, i) => i + 1),
      );
      expect(walks[0].day).toBe(3);
      expect(
        route.days.every((day) => day.evidence.page === 1 && day.evidence.location.length > 0),
      ).toBe(true);
      expect(
        route.days.every((day) => day.accommodation === null || day.accommodation.name === null),
      ).toBe(true);
      expect(route.days.every((day) => day.accommodationSuggestions.length === 0)).toBe(true);
      expect(route.source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(route.source.documentDate).toBeNull();
    },
  );
  it('preserva início, fim e distâncias distintas entre Central e Costa', () => {
    const central = documents.find((route) => route.routeId === 'porto-central')!;
    const coast = documents.find((route) => route.routeId === 'porto-costa')!;
    expect(central.days[2]).toMatchObject({
      startCity: 'Porto',
      endCity: 'São Pedro Rates',
      distanceKm: 24,
    });
    expect(coast.days[2]).toMatchObject({
      startCity: 'Porto - Matosinhos',
      endCity: 'Povoa do Varzin',
      distanceKm: 24.8,
    });
    expect(coast.notes.join(' ')).toMatch(/256,2 km; perfil ilustrado indica 261,9 km/);
  });
  it('separa chegada, transporte, passeio, retorno e encerramento da caminhada', () => {
    expect(sarria.days[0].activities).toContain('chegada');
    expect(sarria.days[1].activities).toEqual(['transporte']);
    expect(sarria.days[8].activities).toEqual(['transporte', 'passeio']);
    expect(sarria.days[10].activities).toEqual(['encerramento']);
    const coast = documents.find((route) => route.routeId === 'porto-costa')!;
    expect(coast.days[14].activities).toEqual(['passeio']); // FreeWalkingTour is not a Camino stage.
    expect(coast.days[17].activities).toEqual(['retorno']);
    expect(coast.days[1].activities).toEqual(['nao_informado']);
    const withTransferDistance = {
      ...sarria,
      days: sarria.days.map((day) => (day.day === 2 ? { ...day, distanceKm: 500 } : day)),
    };
    expect(summarizeItinerary(withTransferDistance).walkingKm).toBe(114.4);
  });
  it.each([
    'reversed',
    'duplicate-day',
    'stage-gap',
    'transfer-stage',
    'missing-end',
    'negative-distance',
    'missing-reference',
    'missing-source',
  ])('rejeita cadastro inconsistente: %s', (kind) => {
    const route = structuredClone(sarria);
    if (kind === 'reversed') route.days.reverse();
    if (kind === 'duplicate-day') route.days[1].day = 1;
    if (kind === 'stage-gap') route.days[2].walkingStage = 2;
    if (kind === 'transfer-stage') route.days[1].walkingStage = 1;
    if (kind === 'missing-end') route.days[2].endCity = null;
    if (kind === 'negative-distance') route.days[2].distanceKm = -1;
    if (kind === 'missing-reference') route.days[2].evidence.location = '';
    if (kind === 'missing-source') route.source.sha256 = '';
    expect(documentedItinerarySchema.safeParse(route).success).toBe(false);
  });
  it('não converte distância desconhecida em zero nem confirma comparação sem dados', () => {
    const incomplete = {
      ...sarria,
      days: sarria.days.map((day) => (day.day === 3 ? { ...day, distanceKm: null } : day)),
    };
    expect(summarizeItinerary(incomplete).walkingKm).toBeNull();
    expect(compareItineraries(sarria)).toHaveLength(3);
    expect(compareItineraries(sarria).every((issue) => issue.kind === 'pending')).toBe(true);
  });
  it('registra diferenças de duração, etapas e distância sem modificar as fontes', () => {
    const original = JSON.stringify(sarria);
    const commercial = {
      source: 'Tabela comercial de teste',
      durationDays: 9,
      walkingStages: 6,
      distanceKm: 115,
    };
    expect(
      compareItineraries(sarria, commercial).filter((issue) => issue.kind === 'divergence'),
    ).toHaveLength(3);
    expect(JSON.stringify(sarria)).toBe(original);
    expect(
      compareItineraries({ ...sarria, declaredDistanceKm: 120 }).some((issue) =>
        issue.message.includes('declaração operacional 120'),
      ),
    ).toBe(true);
  });
});
