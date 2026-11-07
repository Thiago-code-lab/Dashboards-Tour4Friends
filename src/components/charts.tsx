import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Legend,
} from 'recharts';
import type { ForecastResult } from '../lib/forecasting/models';
import { compactMoney, monthLabel, number } from '../lib/format';
import { Empty } from './ui';

const grid = '#e9edf2';
const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e6eaf0',
  boxShadow: '0 8px 24px #152c4110',
  fontSize: 12,
};
export function DemandChart({
  forecast,
  scenario = 0,
  full = false,
}: {
  forecast: ForecastResult;
  scenario?: number;
  full?: boolean;
}) {
  const history = full ? forecast.history : forecast.history.slice(-12);
  const boundary = history.at(-1);
  const points: {
    month: string;
    observed?: number;
    predicted?: number;
    band?: [number, number];
  }[] = history.map((p, i) => ({
    month: p.month,
    observed: p.travelers,
    ...(i === history.length - 1 && forecast.predictions.length ? { predicted: p.travelers } : {}),
  }));
  points.push(
    ...forecast.predictions.map((p) => ({
      month: p.month,
      predicted: p.predicted * (1 + scenario / 100),
      ...(scenario === 0 && p.lower !== undefined
        ? { band: [p.lower, p.upper!] as [number, number] }
        : {}),
    })),
  );
  if (!points.length) return <Empty />;
  return (
    <>
      <div className="chart-legend">
        <span>
          <i className="legend-dot blue" />
          Demanda observada
        </span>
        <span>
          <i className="legend-dash" />
          {scenario ? `Simulação ${scenario > 0 ? '+' : ''}${scenario}%` : 'Previsão'}
        </span>
        <span className="legend-unit">Viajantes / mês</span>
      </div>
      <div
        className="chart"
        role="img"
        aria-label="Gráfico de demanda mensal observada em azul e prevista em cinza tracejado"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 22, right: 14, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="demand-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8FA6DE" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#8FA6DE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={{ fontSize: 11, fill: '#7d8796' }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#7d8796' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(label) => monthLabel(String(label))}
              formatter={(value, name) => [
                Array.isArray(value)
                  ? value.map((v) => number(Number(v))).join(' – ')
                  : number(Number(value)),
                name === 'band'
                  ? 'Faixa exploratória, sem cobertura garantida'
                  : name === 'observed'
                    ? 'Observado'
                    : scenario
                      ? 'Simulado'
                      : 'Previsto',
              ]}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill="#4A4A4A"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
            <Area
              dataKey="observed"
              stroke="none"
              fill="url(#demand-fill)"
              isAnimationActive={false}
            />
            <Line
              dataKey="observed"
              stroke="#708fce"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Line
              dataKey="predicted"
              stroke="#4A4A4A"
              strokeWidth={2.2}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
            />
            {boundary && forecast.predictions.length > 0 && (
              <ReferenceLine
                x={boundary.month}
                stroke="#b3bdc9"
                strokeDasharray="3 4"
                label={{
                  value: 'Previsão →',
                  position: 'insideTopRight',
                  fill: '#7d8796',
                  fontSize: 10,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
export function FinancialChart({
  rows,
}: {
  rows: { month: string; revenue: number; cost: number }[];
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows.slice(-12)} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tick={{ fontSize: 10, fill: '#7d8796' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v / 1000}k`}
            tick={{ fontSize: 10, fill: '#7d8796' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(v) => monthLabel(String(v))}
            formatter={(value) => compactMoney(Number(value))}
          />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="revenue"
            name="Receita contratada"
            fill="#8FA6DE"
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
          <Bar
            dataKey="cost"
            name="Custos"
            fill="#b6c6b6"
            radius={[3, 3, 0, 0]}
            maxBarSize={14}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function SimpleBarChart({
  rows,
  valueLabel,
  format = number,
}: {
  rows: { name: string; value: number }[];
  valueLabel: string;
  format?: (v: number) => string;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 15, right: 12, left: -12, bottom: 10 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#7d8796' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={format}
            tick={{ fontSize: 10, fill: '#7d8796' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [format(Number(v)), valueLabel]} />
          <Bar
            dataKey="value"
            name={valueLabel}
            fill="#8FA6DE"
            radius={[4, 4, 0, 0]}
            maxBarSize={38}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
