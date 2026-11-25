import { z } from 'zod';
import { commercialCategories, commercialRoutes, documentedPrice, occupancies } from './catalog';

export const quoteSelectionSchema = z.object({
  routeId: z.string().refine((id) => commercialRoutes.some((route) => route.id === id)),
  startDate: z.iso.date(),
  category: z.enum(commercialCategories),
  occupancy: z.enum(occupancies),
  travelers: z.number().int().min(1).max(100),
});
export type QuoteSelection = z.infer<typeof quoteSelectionSchema>;
export interface ManualLodgingCost {
  id: string;
  city: string;
  stage: string;
  amount: string;
}
export interface PreliminaryQuote {
  currency: 'EUR';
  status: 'Orçamento incompleto' | 'Orçamento preliminar';
  unitSaleCents: number | null;
  totalSaleCents: number | null;
  lodgingCents: number;
  partialResultCents: number | null;
  partialPercent: number | null;
  issues: string[];
}

export function parseEuroCents(value: string): number | null {
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function lodgingTotals(costs: readonly ManualLodgingCost[]): { cents: number; valid: boolean } {
  let cents = 0;
  let valid = costs.length > 0 && costs.length <= 200;
  for (const cost of costs) {
    const amount = parseEuroCents(cost.amount);
    const identified = [cost.city, cost.stage].every(
      (value) => value.trim().length > 0 && value.length <= 120,
    );
    if (amount === null || !identified) valid = false;
    if (amount !== null) cents += amount;
  }
  return { cents, valid };
}

export function calculateQuote(
  selection: unknown,
  costs: readonly ManualLodgingCost[],
  costsComplete: boolean,
): PreliminaryQuote {
  const parsed = quoteSelectionSchema.safeParse(selection);
  const issues: string[] = [];
  const unit = parsed.success
    ? documentedPrice(
        parsed.data.routeId,
        parsed.data.category,
        parsed.data.occupancy,
        parsed.data.startDate,
      )
    : null;
  if (!parsed.success)
    issues.push('Selecione roteiro, data, categoria, ocupação e 1 a 100 pessoas válidos.');
  if (unit === null)
    issues.push(
      'Preço não informado para a seleção. Tabela disponível somente em maio, junho, setembro e outubro de 2027.',
    );
  const lodging = lodgingTotals(costs);
  if (!lodging.valid || !costsComplete)
    issues.push('Informe e confira todos os custos de hospedagem, com cidade e etapa.');
  const total = unit !== null && parsed.success ? unit * parsed.data.travelers : null;
  const result = issues.length === 0 && total !== null ? total - lodging.cents : null;
  return {
    currency: 'EUR',
    status: issues.length ? 'Orçamento incompleto' : 'Orçamento preliminar',
    unitSaleCents: unit,
    totalSaleCents: total,
    lodgingCents: lodging.cents,
    partialResultCents: result,
    partialPercent: result !== null && total ? (result / total) * 100 : null,
    issues,
  };
}

const euroFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' });
export const euro = (cents: number | null): string =>
  cents === null ? 'Preço não informado' : euroFormatter.format(cents / 100);
