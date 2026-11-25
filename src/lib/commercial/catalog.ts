import { z } from 'zod';

export const commercialCategories = ['Econômico', 'Standard', 'Superior'] as const;
export const occupancies = ['individual', 'duplo'] as const;
export const commercialSource = {
  document: 'Valores_Roteiros_Autoguiados_2027.pdf',
  referenceYear: 2027,
  recordedAt: '2026-11-14',
  provenance:
    'Transcrição fornecida no anexo Implementação 01; PDF original pendente de conferência',
  currency: 'EUR',
  months: [5, 6, 9, 10],
} as const;

type Rates = { Standard: readonly [number, number]; Superior: readonly [number, number] };
export interface CommercialRoute {
  id: string;
  way: 'Francês' | 'Português';
  start: string;
  variant: 'Central' | 'Costa' | null;
  commercialLabel: string;
  modality: 'Caminhada autoguiada';
  rates: Rates | null;
  // Legacy PR #4 field; documentary itineraries are linked by routeId in operational-data.ts.
  operationalSource: null;
}

const route = (
  id: string,
  way: CommercialRoute['way'],
  start: string,
  commercialLabel: string,
  rates: Rates | null,
  variant: CommercialRoute['variant'] = null,
): CommercialRoute => ({
  id,
  way,
  start,
  commercialLabel,
  rates,
  variant,
  modality: 'Caminhada autoguiada',
  operationalSource: null,
});

export const commercialRoutes: readonly CommercialRoute[] = [
  route('sjpp', 'Francês', 'Saint-Jean-Pied-de-Port (SJPP)', 'SJPP', {
    Superior: [7400, 5400],
    Standard: [5410, 3980],
  }),
  route('astorga', 'Francês', 'Astorga', 'Astorga', {
    Superior: [3290, 2390],
    Standard: [2440, 1780],
  }),
  route('sarria', 'Francês', 'Sarria', 'Sarria', {
    Superior: [1980, 1450],
    Standard: [1530, 1100],
  }),
  route('lisboa', 'Português', 'Lisboa', 'Lisboa–Santiago', null),
  route(
    'porto-central',
    'Português',
    'Porto Central',
    'Porto Central',
    { Superior: [3130, 2250], Standard: [2280, 1640] },
    'Central',
  ),
  route(
    'porto-costa',
    'Português',
    'Porto Costa',
    'Porto Costa',
    { Superior: [3250, 2340], Standard: [2390, 1730] },
    'Costa',
  ),
  route('tui-valenca', 'Português', 'Tui/Valença', 'Tui/Valença/Baiona', {
    Superior: [2070, 1510],
    Standard: [1580, 1140],
  }),
];

export const accommodationReferenceSchema = z.object({
  id: z.string().trim().min(1).max(80),
  routeId: z.enum(commercialRoutes.map((entry) => entry.id) as [string, ...string[]]),
  city: z.string().trim().min(1).max(120),
  stage: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  category: z.enum(commercialCategories),
  sourceDocument: z.string().trim().min(1).max(200),
  sourceReferenceDate: z.iso.date(),
  status: z.literal('Sugestão de referência — não verificada'),
});
export type AccommodationReference = z.infer<typeof accommodationReferenceSchema>;
export const accommodationReferences: readonly AccommodationReference[] = [];

export function documentedPrice(
  routeId: string,
  category: string,
  occupancy: string,
  date: string,
): number | null {
  if (
    !z.iso.date().safeParse(date).success ||
    !date.startsWith('2027-') ||
    !commercialSource.months.some((month) => month === Number(date.slice(5, 7))) ||
    !occupancies.some((value) => value === occupancy)
  )
    return null;
  const selected = commercialRoutes.find((entry) => entry.id === routeId);
  if (!selected?.rates || (category !== 'Standard' && category !== 'Superior')) return null;
  return selected.rates[category][occupancy === 'individual' ? 0 : 1] * 100;
}
