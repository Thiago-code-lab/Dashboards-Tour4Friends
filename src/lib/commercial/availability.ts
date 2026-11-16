import { z } from 'zod';

const scopeSchema = z.object({
  routeId: z.string().min(1),
  stage: z.number().int().positive(),
  date: z.iso.date(),
  category: z.enum(['Econômico', 'Standard', 'Superior']),
});
const evidenceSchema = scopeSchema.extend({
  source: z.string().trim().min(1),
  verified: z.literal(true),
  verifiedOn: z.iso.date(),
  capacity: z.number().int().positive(),
  committed: z.number().int().nonnegative(),
});
export type AvailabilityScope = z.infer<typeof scopeSchema>;
export const availabilityLabels = {
  unknown: 'Disponibilidade desconhecida',
  favorable: 'Disponibilidade favorável',
  attention: 'Atenção',
  high: 'Risco elevado de lotação',
} as const;
export type AvailabilityRisk = keyof typeof availabilityLabels;

/** No demand forecast or unverified event can stand in for a comparable inventory measurement. */
export function availabilityRisk(
  scope: AvailabilityScope,
  evidence: unknown,
  asOf: string,
): AvailabilityRisk {
  const parsed = evidenceSchema.safeParse(evidence);
  if (
    !scopeSchema.safeParse(scope).success ||
    !z.iso.date().safeParse(asOf).success ||
    !parsed.success
  )
    return 'unknown';
  const measurement = parsed.data;
  if (
    Object.entries(scope).some(
      ([key, value]) => measurement[key as keyof AvailabilityScope] !== value,
    )
  )
    return 'unknown';
  // Conservative policy: same-day verification; no unbounded freshness assumption.
  if (measurement.verifiedOn !== asOf || scope.date < asOf) return 'unknown';
  const occupancy = (100 * measurement.committed) / measurement.capacity;
  return occupancy > 85 ? 'high' : occupancy >= 75 ? 'attention' : 'favorable';
}
