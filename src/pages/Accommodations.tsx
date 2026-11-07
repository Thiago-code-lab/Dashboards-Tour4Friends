import { useState } from 'react';
import { BedDouble, Building2, CircleAlert, Layers } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { Badge, DataTable, Empty, Kpi, Panel, Progress } from '../components/ui';
import { dateLabel, monthLabel, number, percent, sum } from '../lib/format';
import { occupancy } from '../lib/analytics/metrics';
import { exportCsv } from '../lib/csv';

export default function Accommodations() {
  const { data, view, thresholds, setThresholds } = useAnalysis();
  const [upcoming, setUpcoming] = useState(true);
  const [attention, setAttention] = useState(thresholds.attention);
  const [critical, setCritical] = useState(thresholds.critical);
  const [error, setError] = useState('');
  const slots = view.allocations.filter((a) => !upcoming || a.date >= data.metadata.referenceDate);
  const committed = sum(slots, (a) => a.committed);
  const capacity = sum(slots, (a) => a.capacity);
  const risk = slots
    .filter((a) => a.occupancy > thresholds.critical && a.committed > 0)
    .sort((a, b) => b.occupancy - a.occupancy);
  const months = [...new Set(slots.map((s) => s.date.slice(0, 7)))].sort().slice(-6);
  const partnerIds = [...new Set(slots.map((s) => s.partnerId))];
  const tone = (value: number) =>
    value > thresholds.critical ? 'orange' : value >= thresholds.attention ? 'orange' : 'green';
  return (
    <>
      <PageHeading
        eyebrow="CAPACIDADE PARA ACOLHER"
        title="Hospedagens e capacidade"
        description="Disponibilidade negociada com parceiros, por saída, etapa, data e categoria."
      />
      <GlobalFilters />
      <div className="module-toolbar">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={upcoming}
            onChange={(e) => setUpcoming(e.target.checked)}
          />{' '}
          Somente utilizações a partir de {dateLabel(data.metadata.referenceDate)}
        </label>
        <Badge>Parceiros simulados · sem inventário próprio</Badge>
      </div>
      <div className="kpi-grid">
        <Kpi
          label="Ocupação contratada"
          value={percent(occupancy(committed, capacity))}
          detail={`${committed} / ${capacity} vagas-noite`}
          icon={BedDouble}
          help="Soma de vagas comprometidas dividida pela capacidade dos mesmos slots de data, etapa e categoria. A unidade agregada é vaga-noite, não pessoas únicas."
        />
        <Kpi
          label="Disponibilidade"
          value={number(sum(slots, (a) => a.available))}
          detail="Vagas-noite ainda livres"
          icon={Layers}
          help="Soma de max(0, capacidade − comprometidas) por slot. Folga em uma data não cobre insuficiência em outra."
        />
        <Kpi
          label="Slots críticos"
          value={number(risk.length)}
          detail={`Ocupação acima de ${thresholds.critical}%`}
          icon={CircleAlert}
          tone="orange"
          help="Slots de hospedagem que ultrapassam o limite crítico configurado. Cada registro representa uma data/etapa/categoria."
        />
        <Kpi
          label="Contratação adicional"
          value={number(sum(slots, (a) => a.shortage))}
          detail="Vagas-noite em falta"
          icon={Building2}
          tone={risk.length ? 'orange' : 'green'}
          help="Soma das insuficiências por slot, sem compensar datas diferentes. Planeje cada localidade separadamente."
        />
      </div>
      <div className="two-column">
        <Panel
          title="Etapas que pedem atenção"
          subtitle="Slots ordenados pela ocupação comprometida"
        >
          {risk.length ? (
            <div className="capacity-ranking">
              {risk.slice(0, 6).map((a) => (
                <div key={a.id}>
                  <div>
                    <strong>{a.locality}</strong>
                    <Badge tone="orange">Crítica · {percent(a.occupancy)}</Badge>
                  </div>
                  <p>
                    {a.routeName} · {dateLabel(a.date)} · {a.category}
                  </p>
                  <Progress value={a.occupancy} tone="orange" />
                  <small>
                    {a.committed} comprometidas / {a.capacity} contratadas
                    {a.shortage ? ` · faltam ${a.shortage}` : ''}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <Empty message="Nenhum slot crítico neste escopo." />
          )}
        </Panel>
        <Panel
          title="Disponibilidade por categoria"
          subtitle="A capacidade é negociada para cada data de utilização"
        >
          <div className="category-capacity">
            {['Premium', 'Conforto', 'Alternativa'].map((category) => {
              const rows = slots.filter((a) => a.category === category);
              const rate = occupancy(
                sum(rows, (a) => a.committed),
                sum(rows, (a) => a.capacity),
              );
              return (
                <div key={category}>
                  <div>
                    <strong>{category}</strong>
                    <span>{percent(rate)}</span>
                  </div>
                  <Progress value={rate ?? 0} tone={tone(rate ?? 0)} />
                  <p>
                    {sum(rows, (a) => a.committed)} comprometidas · {sum(rows, (a) => a.capacity)}{' '}
                    contratadas <small>(vagas-noite)</small>
                  </p>
                </div>
              );
            })}
          </div>
          <form
            className="threshold-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (attention < 1 || critical > 100 || attention >= critical) {
                setError('Use 1 ≤ atenção < crítico ≤ 100.');
                return;
              }
              setError('Limites atualizados neste navegador.');
              setThresholds({ ...thresholds, attention, critical });
            }}
          >
            <h3>Limites de ocupação</h3>
            <div>
              <label>
                Atenção a partir de (%)
                <input
                  aria-label="Limite de atenção"
                  type="number"
                  min={1}
                  max={99}
                  value={attention}
                  onChange={(e) => setAttention(Number(e.target.value))}
                />
              </label>
              <label>
                Crítica acima de (%)
                <input
                  aria-label="Limite crítico"
                  type="number"
                  min={2}
                  max={100}
                  value={critical}
                  onChange={(e) => setCritical(Number(e.target.value))}
                />
              </label>
              <button className="button small" type="submit">
                Salvar limites
              </button>
            </div>
            {error && <p role="status">{error}</p>}
          </form>
        </Panel>
      </div>
      <Panel
        title="Mapa de ocupação"
        subtitle="Últimos meses com registros no recorte · vagas-noite por hospedagem"
      >
        {months.length ? (
          <div className="table-scroll">
            <table className="heatmap">
              <thead>
                <tr>
                  <th>Hospedagem demonstrativa</th>
                  {months.map((m) => (
                    <th key={m}>{monthLabel(m)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partnerIds.map((id) => (
                  <tr key={id}>
                    <td>{data.partners.find((p) => p.id === id)!.name}</td>
                    {months.map((month) => {
                      const rows = slots.filter(
                        (a) => a.partnerId === id && a.date.startsWith(month),
                      );
                      const rate = occupancy(
                        sum(rows, (a) => a.committed),
                        sum(rows, (a) => a.capacity),
                      );
                      return (
                        <td key={month}>
                          {rate === null ? (
                            '—'
                          ) : (
                            <span
                              className={`heat-cell ${tone(rate)}`}
                              title={`${sum(rows, (a) => a.committed)} vagas-noite / ${sum(rows, (a) => a.capacity)}`}
                            >
                              {percent(rate)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <p className="panel-note">
          Uma hospedagem no mapa representa um contrato demonstrativo de apoio ao roteiro; a tabela
          abaixo discrimina a localidade efetiva de cada slot.
        </p>
      </Panel>
      <Panel
        title="Contratações por saída e etapa"
        subtitle="Cada linha representa um slot independente de utilização"
      >
        <DataTable
          rows={slots}
          rowKey={(a) => a.id}
          label="Slots de hospedagem"
          searchText={(a) => `${a.partnerName} ${a.routeName} ${a.locality} ${a.departureId}`}
          columns={[
            {
              key: 'date',
              label: 'Utilização',
              value: (a) => a.date,
              render: (a) => dateLabel(a.date),
            },
            {
              key: 'routeName',
              label: 'Roteiro / saída',
              value: (a) => a.routeName,
              render: (a) => (
                <div>
                  <strong>{a.routeName}</strong>
                  <small className="block muted">{a.departureId}</small>
                </div>
              ),
            },
            { key: 'locality', label: 'Etapa', value: (a) => a.locality },
            { key: 'category', label: 'Categoria', value: (a) => a.category },
            {
              key: 'capacity',
              label: 'Vagas',
              value: (a) => a.capacity,
              render: (a) => `${a.committed} / ${a.capacity}`,
            },
            {
              key: 'occupancy',
              label: 'Ocupação',
              value: (a) => a.occupancy,
              render: (a) => <Badge tone={tone(a.occupancy)}>{percent(a.occupancy)}</Badge>,
            },
            {
              key: 'confirmed',
              label: 'Contrato',
              value: (a) => (a.confirmed ? 1 : 0),
              render: (a) => (
                <Badge tone={a.confirmed ? 'green' : 'orange'}>
                  {a.confirmed ? 'Confirmado' : 'A confirmar'}
                </Badge>
              ),
            },
          ]}
          onExport={(rows) => exportCsv('t4f-hospedagens.csv', rows)}
        />
      </Panel>
    </>
  );
}
