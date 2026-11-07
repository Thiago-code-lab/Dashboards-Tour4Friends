import { useSearchParams } from 'react-router-dom';
import { Compass, MapPin, Route as RouteIcon, Users, Wallet } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { Badge, DataTable, Empty, Kpi, Panel } from '../components/ui';
import { compactMoney, money, monthLabel, number, percent, sum } from '../lib/format';
import { exportCsv } from '../lib/csv';

const routeColors = ['#708fce', '#7F9A80', '#556e92', '#a4b9d0', '#576d60', '#b5bdd0'];
export default function Routes() {
  const { view } = useAnalysis();
  const [params, setParams] = useSearchParams();
  const selected =
    view.routeStats.find((r) => r.id === params.get('roteiro')) ?? view.routeStats[0];
  const timeline = view.monthly.slice(-12).map((m) =>
    Object.assign(
      { month: m.month },
      Object.fromEntries(
        view.routeStats.map((r) => [
          r.id,
          sum(
            view.bookingRows.filter(
              (b) =>
                b.routeId === r.id && b.status === 'confirmed' && b.travelDate.startsWith(m.month),
            ),
            (b) => b.travelers,
          ),
        ]),
      ),
    ),
  );
  return (
    <>
      <PageHeading
        eyebrow="UM PORTFÓLIO, DIFERENTES CAMINHOS"
        title="Roteiros e destinos"
        description="Compare demanda, rentabilidade e experiência para planejar as próximas saídas."
      />
      <GlobalFilters />
      <div className="kpi-grid">
        <Kpi
          label="Roteiros no recorte"
          value={number(view.routes.length)}
          detail="Catálogo demonstrativo"
          icon={Compass}
          help="Roteiros que atendem aos filtros de roteiro e modalidade; não indica disponibilidade comercial atual."
        />
        <Kpi
          label="Saídas organizadas"
          value={number(view.departures.length)}
          detail="Históricas e futuras simuladas"
          icon={RouteIcon}
          help="Saídas por data de início no período selecionado."
        />
        <Kpi
          label="Viajantes confirmados"
          value={number(view.travelers)}
          detail="Participações em viagens"
          icon={Users}
          help="Número de participantes de reservas confirmadas, incluindo saídas futuras no recorte."
        />
        <Kpi
          label="Receita contratada"
          value={compactMoney(view.totalRevenue)}
          detail="Reservas confirmadas"
          icon={Wallet}
          help="Valor das reservas confirmadas contado uma única vez, independentemente de participantes."
        />
      </div>
      <Panel
        title="Desempenho do portfólio"
        subtitle="Selecione um roteiro para conferir o percurso e os resultados"
      >
        <DataTable
          rows={view.routeStats}
          rowKey={(r) => r.id}
          label="Roteiros"
          columns={[
            {
              key: 'name',
              label: 'Roteiro',
              value: (r) => r.name,
              render: (r) => (
                <button className="table-link" onClick={() => setParams({ roteiro: r.id })}>
                  {r.name}
                </button>
              ),
            },
            { key: 'departures', label: 'Saídas', value: (r) => r.departures },
            { key: 'travelers', label: 'Viajantes', value: (r) => r.travelers },
            {
              key: 'revenue',
              label: 'Receita contratada',
              value: (r) => r.revenue,
              render: (r) => money(r.revenue),
            },
            { key: 'cost', label: 'Custo', value: (r) => r.cost, render: (r) => money(r.cost) },
            {
              key: 'margin',
              label: 'Margem',
              value: (r) => r.margin,
              render: (r) => percent(r.margin),
            },
            {
              key: 'occupancy',
              label: 'Ocupação',
              value: (r) => r.occupancy,
              render: (r) => percent(r.occupancy),
            },
            {
              key: 'nps',
              label: 'NPS (n)',
              value: (r) => r.nps,
              render: (r) => `${number(r.nps)} (${r.responses})`,
            },
          ]}
          onExport={(rows) => exportCsv('t4f-roteiros.csv', rows)}
        />
      </Panel>
      <div className="two-column">
        <Panel
          title="Demanda por roteiro ao longo do tempo"
          subtitle="Viajantes confirmados · últimos 12 meses históricos"
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 15, left: -20, right: 10 }}>
                <CartesianGrid stroke="#e9edf2" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={monthLabel}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip labelFormatter={(v) => monthLabel(String(v))} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" />
                {view.routeStats.map((r, i) => (
                  <Line
                    key={r.id}
                    dataKey={r.id}
                    name={r.shortName}
                    stroke={routeColors[i % 6]}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel
          title="Volume e rentabilidade"
          subtitle="Cada ponto é um roteiro · tamanho proporcional à receita contratada"
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 18, right: 25, bottom: 20, left: 0 }}>
                <CartesianGrid stroke="#e9edf2" />
                <XAxis
                  type="number"
                  dataKey="travelers"
                  name="Viajantes"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: 'Viajantes confirmados',
                    position: 'insideBottom',
                    offset: -12,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="margin"
                  name="Margem (%)"
                  tickFormatter={(v) => `${number(v)}%`}
                  tick={{ fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="revenue" range={[80, 500]} name="Receita" />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="custom-tooltip">
                        <strong>{payload[0].payload.shortName}</strong>
                        <p>{payload[0].payload.travelers} viajantes</p>
                        <p>Margem: {percent(payload[0].payload.margin)}</p>
                        <p>{money(payload[0].payload.revenue)}</p>
                      </div>
                    ) : null
                  }
                />
                <Scatter
                  data={view.routeStats.filter((r) => r.margin !== null)}
                  fill="#8FA6DE"
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel
        title="Um olhar sobre o roteiro"
        subtitle="Percurso ilustrativo, sem oferta ou saída comercial confirmada"
        action={
          <select
            aria-label="Detalhar roteiro"
            value={selected?.id ?? ''}
            onChange={(e) => setParams({ roteiro: e.target.value })}
          >
            {view.routeStats.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        }
      >
        {selected ? (
          <div className="route-detail">
            <div className="route-detail-heading">
              <span className="route-emblem">
                <MapPin size={30} />
              </span>
              <div>
                <h3>{selected.name}</h3>
                <p>
                  {selected.country} · {selected.days} dias · {selected.modality}
                  {selected.distanceKm > 0 ? ` · ${selected.distanceKm} km ilustrativos` : ''}
                </p>
              </div>
              <Badge tone="blue">Catálogo acadêmico</Badge>
            </div>
            <ol className="route-stages">
              {selected.stages.map((stage, i) => (
                <li key={stage}>
                  <span>{i + 1}</span>
                  <strong>{stage}</strong>
                </li>
              ))}
            </ol>
            <div className="detail-metrics">
              <span>
                Receita <strong>{money(selected.revenue)}</strong>
              </span>
              <span>
                Custo <strong>{money(selected.cost)}</strong>
              </span>
              <span>
                Margem <strong>{percent(selected.margin)}</strong>
              </span>
              <span>
                Cancelamentos <strong>{selected.cancellations}</strong>
              </span>
              <span>
                Satisfação atendimento <strong>{number(selected.satisfaction)} / 10</strong>
              </span>
            </div>
            <div className="composition-row">
              {['Premium', 'Conforto', 'Alternativa'].map((c) => (
                <div key={c}>
                  <strong>{c}</strong>
                  <span>
                    {
                      view.bookingRows.filter((b) => b.routeId === selected.id && b.category === c)
                        .length
                    }{' '}
                    reservas
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    </>
  );
}
