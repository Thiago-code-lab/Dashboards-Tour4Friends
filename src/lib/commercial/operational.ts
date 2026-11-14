import { z } from 'zod';
import { accommodationReferenceSchema, commercialRoutes, commercialSource } from './catalog';

const text = z.string().trim().min(1).max(240);
export const documentarySourceSchema = z.object({
  document: text,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  documentDate: z.iso.date().nullable(),
  inspectedAt: z.iso.date(),
});
const evidenceSchema = z.object({ page: z.number().int().positive(), location: text });
const distance = z.number().finite().nonnegative().max(10000);
export const activityLabels = {
  caminhada: 'Caminhada',
  chegada: 'Chegada',
  transporte: 'Transporte',
  passeio: 'Passeio',
  retorno: 'Retorno',
  preparacao: 'Preparação',
  encerramento: 'Encerramento',
  nao_informado: 'Atividade não detalhada',
} as const;

export const operationalDaySchema = z
  .object({
    order: z.number().int().positive(),
    day: z.number().int().positive(),
    activities: z
      .array(
        z.enum(
          Object.keys(activityLabels) as [
            keyof typeof activityLabels,
            ...Array<keyof typeof activityLabels>,
          ],
        ),
      )
      .min(1),
    walkingStage: z.number().int().positive().nullable(),
    startCity: text.nullable(),
    endCity: text.nullable(),
    distanceKm: distance.nullable(),
    description: text,
    accommodation: z.object({ city: text, name: text.nullable() }).nullable(),
    accommodationSuggestions: z.array(accommodationReferenceSchema),
    evidence: evidenceSchema,
  })
  .superRefine((day, context) => {
    const walking = day.activities.includes('caminhada');
    if (walking !== (day.walkingStage !== null) || (walking && (!day.startCity || !day.endCity)))
      context.addIssue({
        code: 'custom',
        message: 'Caminhada exige número de etapa, início e fim; outros dias não recebem etapa.',
      });
    if (new Set(day.activities).size !== day.activities.length)
      context.addIssue({ code: 'custom', message: 'Atividades duplicadas.' });
  });
export type OperationalDay = z.infer<typeof operationalDaySchema>;

const routeId = z.string().refine((id) => commercialRoutes.some((route) => route.id === id));
export const documentedItinerarySchema = z
  .object({
    routeId,
    status: z.literal('documented'),
    source: documentarySourceSchema,
    declaredDurationDays: z.number().int().positive(),
    declaredWalkingStages: z.number().int().positive(),
    declaredDistanceKm: distance,
    days: z.array(operationalDaySchema).min(1).max(366),
    notes: z.array(text),
  })
  .superRefine((route, context) => {
    let walkingOrder = 0;
    route.days.forEach((day, index) => {
      if (day.order !== index + 1 || day.day !== index + 1)
        context.addIssue({
          code: 'custom',
          message: 'Dias e ordem devem ser consecutivos na sequência da fonte.',
          path: ['days', index],
        });
      if (day.activities.includes('caminhada') && day.walkingStage !== ++walkingOrder)
        context.addIssue({
          code: 'custom',
          message: 'Etapas de caminhada devem ser consecutivas.',
          path: ['days', index],
        });
      if (day.accommodationSuggestions.some((suggestion) => suggestion.routeId !== route.routeId))
        context.addIssue({
          code: 'custom',
          message: 'Sugestão de hospedagem pertence a outro roteiro.',
          path: ['days', index],
        });
    });
  });
export type DocumentedItinerary = z.infer<typeof documentedItinerarySchema>;
export type PendingItinerary = { routeId: string; status: 'pending'; expectedSources: string[] };
export type OperationalItinerary = DocumentedItinerary | PendingItinerary;

export function summarizeItinerary(route: OperationalItinerary) {
  if (route.status === 'pending')
    return { durationDays: null, walkingStages: null, walkingDays: null, walkingKm: null };
  let walkingStages = 0;
  let meters = 0;
  let complete = true;
  for (const day of route.days) {
    if (!day.activities.includes('caminhada')) continue;
    walkingStages++;
    if (day.distanceKm === null) complete = false;
    else meters += Math.round(day.distanceKm * 1000);
  }
  return {
    durationDays: route.days.length,
    walkingStages,
    walkingDays: walkingStages,
    walkingKm: complete ? meters / 1000 : null,
  };
}

export interface DocumentaryIssue {
  kind: 'divergence' | 'pending';
  message: string;
}
export interface CommercialItineraryReference {
  source: string;
  durationDays: number | null;
  walkingStages: number | null;
  distanceKm: number | null;
}
export const commercialItineraryReference: CommercialItineraryReference = {
  source: commercialSource.document,
  durationDays: null,
  walkingStages: null,
  distanceKm: null,
};

export function compareItineraries(
  route: OperationalItinerary,
  commercial = commercialItineraryReference,
): DocumentaryIssue[] {
  if (route.status === 'pending')
    return [{ kind: 'pending', message: 'Cadastro operacional pendente; totais não informados.' }];
  const total = summarizeItinerary(route);
  const issues: DocumentaryIssue[] = [];
  const fields = [
    ['Duração (dias)', total.durationDays, route.declaredDurationDays, commercial.durationDays],
    [
      'Etapas de caminhada',
      total.walkingStages,
      route.declaredWalkingStages,
      commercial.walkingStages,
    ],
    [
      'Distância de caminhada (km)',
      total.walkingKm,
      route.declaredDistanceKm,
      commercial.distanceKm,
    ],
  ] as const;
  for (const [label, calculated, declared, offered] of fields) {
    if (calculated === null)
      issues.push({ kind: 'pending', message: `${label}: dados operacionais incompletos.` });
    else if (calculated !== declared)
      issues.push({
        kind: 'divergence',
        message: `${label}: sequência ${calculated}; declaração operacional ${declared} (${route.source.document}, p. 1).`,
      });
    if (offered === null)
      issues.push({
        kind: 'pending',
        message: `${label}: comparação pendente com ${commercial.source}; dado comercial não disponível.`,
      });
    else if (calculated !== null && calculated !== offered)
      issues.push({
        kind: 'divergence',
        message: `${label}: sequência operacional ${calculated} (${route.source.document}, p. 1); comercial ${offered} (${commercial.source}). Decisão do grupo pendente.`,
      });
  }
  return issues;
}
