import type { ReactNode, ElementType } from 'react';
import { ArrowDown, ArrowUp, Info, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  help,
  tone = 'blue',
}: {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
  help: string;
  tone?: string;
}) {
  return (
    <article className="kpi">
      <div className="flex items-center justify-between gap-2">
        <span className="kpi-label">{label}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={17} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="flex items-center gap-2">
        <span className="kpi-detail">{detail}</span>
        <span className="help" tabIndex={0} role="note" aria-label={help}>
          <Info size={13} />
          <span className="help-text">{help}</span>
        </span>
      </div>
    </article>
  );
}
export function Empty({
  message = 'Nenhum registro neste recorte. Experimente ampliar o período ou limpar os filtros.',
}: {
  message?: string;
}) {
  return (
    <div className="empty-state">
      <SearchX size={30} />
      <strong>Sem dados para exibir</strong>
      <p>{message}</p>
    </div>
  );
}
export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Progress({ value, tone = 'blue' }: { value: number; tone?: string }) {
  return (
    <div
      className="progress-track"
      role="meter"
      aria-label="Ocupação ou participação"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.max(100, Math.ceil(value))}
    >
      <span
        className={`progress-fill ${tone}`}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
export type Column<T> = {
  key: string;
  label: string;
  value: (row: T) => string | number | null;
  render?: (row: T) => ReactNode;
  align?: 'right' | 'left';
};
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  label = 'Registros',
  onExport,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchText?: (row: T) => string;
  label?: string;
  onExport?: (rows: T[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: columns[0].key, direction: 1 });
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const subset =
      query && searchText
        ? rows.filter((r) =>
            searchText(r).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
          )
        : rows;
    const column = columns.find((c) => c.key === sort.key) ?? columns[0];
    if (!column) return subset;
    return [...subset].sort((a, b) => {
      const va = column.value(a) ?? '';
      const vb = column.value(b) ?? '';
      return (
        sort.direction *
        (typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'pt-BR'))
      );
    });
  }, [rows, query, searchText, columns, sort]);
  const numericColumns = new Set(
    columns
      .filter((column) => {
        if (column.align) return column.align === 'right';
        const sample = rows.find((row) => column.value(row) !== null);
        return sample !== undefined && typeof column.value(sample) === 'number';
      })
      .map((column) => column.key),
  );
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 10) - 1));
  return (
    <div>
      <div className="table-tools">
        <span>
          {filtered.length} {label.toLowerCase()}
        </span>
        {searchText && (
          <input
            className="search-input"
            aria-label={`Buscar ${label.toLowerCase()}`}
            placeholder="Buscar nos registros…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        )}
        {onExport && (
          <button
            className="button small"
            disabled={!filtered.length}
            onClick={() => onExport(filtered)}
          >
            Exportar CSV
          </button>
        )}
      </div>
      {!filtered.length ? (
        <Empty />
      ) : (
        <>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">{label}</caption>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={numericColumns.has(c.key) ? 'text-right' : ''}
                      aria-sort={
                        sort.key === c.key
                          ? sort.direction === 1
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        onClick={() =>
                          setSort((s) => ({
                            key: c.key,
                            direction: s.key === c.key ? -s.direction : 1,
                          }))
                        }
                      >
                        {c.label}
                        {sort.key === c.key &&
                          (sort.direction === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(currentPage * 10, currentPage * 10 + 10).map((row) => (
                  <tr key={rowKey(row)}>
                    {columns.map((c) => (
                      <td key={c.key} className={numericColumns.has(c.key) ? 'text-right' : ''}>
                        {c.render ? c.render(row) : (c.value(row) ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              Página {currentPage + 1} de {Math.max(1, Math.ceil(filtered.length / 10))}
            </span>
            <div>
              <button
                className="button small"
                disabled={!currentPage}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </button>
              <button
                className="button small"
                disabled={(currentPage + 1) * 10 >= filtered.length}
                onClick={() => setPage(currentPage + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
