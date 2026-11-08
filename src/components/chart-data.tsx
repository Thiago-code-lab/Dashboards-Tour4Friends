import { useId, useState } from 'react';
export function ChartData({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
}) {
  const identifier = useId();
  const [opened, setOpened] = useState(false);
  return (
    <details
      className="chart-data no-print"
      onToggle={(event) => setOpened(event.currentTarget.open)}
    >
      <summary>Consultar dados: {title}</summary>
      {opened && (
        <div className="table-scroll" role="region" aria-labelledby={identifier} tabIndex={0}>
          <table>
            <caption id={identifier}>{title}</caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((value, column) => (
                    <td key={column}>{value ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
