const numbers = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const reais = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
export const number = (value: number | null | undefined): string =>
  value == null ? '—' : numbers.format(value);
export const money = (value: number): string => reais.format(value);
export const compactMoney = (value: number): string =>
  value >= 1_000_000
    ? `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value / 1_000_000)} mi`
    : value >= 1000
      ? `R$ ${number(value / 1000)} mil`
      : money(value);
export const percent = (value: number | null): string =>
  value == null ? '—' : `${number(value)}%`;
export const dateLabel = (date: string): string =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
export const monthLabel = (month: string): string =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(`${month}-01T12:00:00Z`))
    .replace('.', '');
export const divide = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;
export const mean = (values: number[]): number | null =>
  divide(
    values.reduce((sum, value) => sum + value, 0),
    values.length,
  );
export const sum = <T>(rows: T[], get: (row: T) => number): number =>
  rows.reduce((total, row) => total + get(row), 0);

export function monthRange(start: string, end: string): string[] {
  const result: string[] = [];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const last = end.slice(0, 7);
  while (`${year}-${String(month).padStart(2, '0')}` <= last && result.length < 240) {
    result.push(`${year}-${String(month).padStart(2, '0')}`);
    if (++month > 12) {
      year++;
      month = 1;
    }
  }
  return result;
}
export function nextMonth(month: string, offset = 1): string {
  const date = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + offset, 1),
  );
  return date.toISOString().slice(0, 7);
}
