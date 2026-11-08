import Papa from 'papaparse';
import { bookingSchema, type Dataset } from '../types/domain';
import { validateDataset } from './validation/dataset';

export function exportCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const safeRows = rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        const text =
          value == null
            ? ''
            : Array.isArray(value)
              ? value
                  .map((entry) =>
                    typeof entry === 'object' ? JSON.stringify(entry) : String(entry),
                  )
                  .join('|')
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
        return [key, /^[=+@\-\t\r]/.test(text) ? `'${text}` : text];
      }),
    ),
  );
  const blob = new Blob(['\uFEFF', Papa.unparse(safeRows, { delimiter: ';' })], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importBookingsCsv(text: string, current: Dataset): Dataset {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [';', ','],
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
  });
  if (parsed.errors.length) throw new Error(`CSV inválido: ${parsed.errors[0].message}`);
  if (!parsed.data.length || parsed.data.length > 500)
    throw new Error('Importe entre 1 e 500 reservas por arquivo.');
  const fields = Object.keys(bookingSchema.shape);
  const headers = parsed.meta.fields ?? [];
  if (headers.length !== fields.length || fields.some((f) => !headers.includes(f)))
    throw new Error(`Colunas obrigatórias: ${fields.join(';')}`);
  const seen = new Set<string>();
  const rows = parsed.data.map((row, i) => {
    if (!['true', 'false'].includes(row.formComplete) || !/^\d+(\.\d{1,2})?$/.test(row.totalAmount))
      throw new Error(`Linha ${i + 2}: valor monetário ou booleano inválido.`);
    const result = bookingSchema.safeParse({
      ...row,
      travelerIds: row.travelerIds.split('|'),
      totalAmount: Number(row.totalAmount),
      formComplete: row.formComplete === 'true',
      confirmedAt: row.confirmedAt || null,
      cancellationReason: row.cancellationReason || null,
    });
    if (!result.success)
      throw new Error(
        `Linha ${i + 2}: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
    if (seen.has(result.data.id)) throw new Error(`Linha ${i + 2}: reserva duplicada no arquivo.`);
    seen.add(result.data.id);
    return result.data;
  });
  const replacements = new Map(rows.map((r) => [r.id, r]));
  const next = {
    ...current,
    bookings: [...current.bookings.filter((b) => !replacements.has(b.id)), ...rows],
  };
  return validateDataset(next);
}
