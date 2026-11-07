import type { ForecastResult } from '../lib/forecasting/models';
import { monthLabel, number } from '../lib/format';
import { Empty } from './ui';

/** Fixed viewBox charts remain vector-based and independent of resize events during printing. */
export function ReportDemandChart({ forecast }: { forecast: ForecastResult }) {
  const history = forecast.history.slice(-12);
  const values = [
    ...history.map((p) => p.travelers),
    ...forecast.predictions.map((p) => p.predicted),
    ...forecast.predictions.map((p) => p.upper ?? p.predicted),
  ];
  if (!history.length) return <Empty />;
  const ceiling = Math.max(1, Math.ceil(Math.max(...values) / 4) * 4);
  const months = [...history.map((p) => p.month), ...forecast.predictions.map((p) => p.month)];
  const x = (i: number) => 45 + i * (620 / Math.max(1, months.length - 1));
  const y = (value: number) => 195 - (value / ceiling) * 150;
  const observed = history.map((p, i) => `${x(i)},${y(p.travelers)}`).join(' ');
  const future = [history.at(-1)!.travelers, ...forecast.predictions.map((p) => p.predicted)]
    .map((v, i) => `${x(history.length - 1 + i)},${y(v)}`)
    .join(' ');
  const ranged = forecast.predictions
    .map((point, index) => ({ ...point, index }))
    .filter((point) => point.lower !== undefined);
  const band = [
    ...ranged.map((point) => `${x(history.length + point.index)},${y(point.upper!)}`),
    ...[...ranged]
      .reverse()
      .map((point) => `${x(history.length + point.index)},${y(point.lower!)}`),
  ].join(' ');
  return (
    <svg
      className="report-chart"
      viewBox="0 0 700 250"
      role="img"
      aria-label="Demanda observada e previsão mensal"
    >
      <title>Demanda observada e previsão calculada</title>
      <g fontFamily="sans-serif" fontSize="10" fill="#71849a">
        <circle cx="48" cy="15" r="3" fill="#8fa6de" />
        <text x="58" y="19">
          Demanda observada
        </text>
        <path d="M210 15h14" stroke="#8b96a5" strokeWidth="2" strokeDasharray="4 3" />
        <text x="232" y="19">
          Previsão
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="45"
              x2="665"
              y1={y((ceiling * i) / 4)}
              y2={y((ceiling * i) / 4)}
              stroke="#e4eaf2"
            />
            <text x="33" y={y((ceiling * i) / 4) + 4} textAnchor="end">
              {number((ceiling * i) / 4)}
            </text>
          </g>
        ))}
        {months.map(
          (month, i) =>
            (i % 3 === 0 || i === months.length - 1) && (
              <text
                key={month}
                x={x(i)}
                y="216"
                textAnchor={i === months.length - 1 ? 'end' : 'middle'}
              >
                {monthLabel(month)}
              </text>
            ),
        )}
        <polyline points={observed} stroke="#708fce" fill="none" strokeWidth="2.5" />
        {band && <polygon points={band} fill="#4A4A4A" fillOpacity="0.12" />}
        {forecast.predictions.length > 0 && (
          <>
            <polyline
              points={future}
              stroke="#4A4A4A"
              fill="none"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <line
              x1={x(history.length - 1)}
              x2={x(history.length - 1)}
              y1="35"
              y2="195"
              stroke="#b0bdca"
              strokeDasharray="3 4"
            />
            <text x={x(history.length - 1) + 5} y="41">
              Futuro →
            </text>
          </>
        )}
        <text x="665" y="240" textAnchor="end">
          Viajantes por mês · faixa exploratória quando disponível, sem cobertura garantida
        </text>
      </g>
    </svg>
  );
}

export function ReportFinancialChart({
  rows,
}: {
  rows: { month: string; revenue: number; cost: number }[];
}) {
  const months = rows.slice(-12);
  if (!months.length) return <Empty />;
  const ceiling = Math.max(
    1000,
    Math.ceil(Math.max(...months.flatMap((m) => [m.revenue, m.cost])) / 4000) * 4000,
  );
  const step = 620 / months.length;
  const y = (value: number) => 195 - (value / ceiling) * 150;
  return (
    <svg
      className="report-chart"
      viewBox="0 0 700 250"
      role="img"
      aria-label="Receita contratada e custos por mês"
    >
      <title>Receita contratada versus custos por mês da viagem</title>
      <g fontFamily="sans-serif" fontSize="10" fill="#71849a">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="45"
              x2="665"
              y1={y((ceiling * i) / 4)}
              y2={y((ceiling * i) / 4)}
              stroke="#e4eaf2"
            />
            <text x="33" y={y((ceiling * i) / 4) + 4} textAnchor="end">
              {number((ceiling * i) / 4000)}k
            </text>
          </g>
        ))}
        {months.map((m, i) => (
          <g key={m.month}>
            <rect
              x={45 + i * step + step * 0.2}
              y={y(m.revenue)}
              width={step * 0.23}
              height={195 - y(m.revenue)}
              rx="2"
              fill="#8fa6de"
            />
            <rect
              x={45 + i * step + step * 0.48}
              y={y(m.cost)}
              width={step * 0.23}
              height={195 - y(m.cost)}
              rx="2"
              fill="#b1c4b2"
            />
            {(i % 2 === 0 || i === months.length - 1) && (
              <text x={45 + i * step + step / 2} y="215" textAnchor="middle">
                {monthLabel(m.month)}
              </text>
            )}
          </g>
        ))}
        <circle cx="240" cy="240" r="3" fill="#8fa6de" />
        <text x="250" y="244">
          Receita contratada
        </text>
        <circle cx="390" cy="240" r="3" fill="#b1c4b2" />
        <text x="400" y="244">
          Custos operacionais
        </text>
      </g>
    </svg>
  );
}
