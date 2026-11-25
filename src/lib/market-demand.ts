import { z } from 'zod';

export const commercialCapture = 0.005;
export const marketScenarioSchema = z
  .object({
    brazilianPilgrims: z.number().finite().nonnegative().max(100_000_000),
    start: z.iso.date(),
    end: z.iso.date(),
    source: z.string().trim().min(5).max(500),
    scope: z.enum(['Francês e Português', 'Todos os caminhos; recorte indisponível']),
  })
  .refine((input) => input.start <= input.end, 'Período inválido.');
export function potentialDemand(input: unknown): number | null {
  const scenario = marketScenarioSchema.safeParse(input);
  return scenario.success ? scenario.data.brazilianPilgrims * commercialCapture : null;
}
