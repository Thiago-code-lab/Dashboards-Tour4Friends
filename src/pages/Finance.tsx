import { BadgeDollarSign, CirclePercent, Receipt, Wallet } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { DataTable, Kpi, Panel, Progress } from '../components/ui';
import { FinancialChart, SimpleBarChart } from '../components/charts';
import { compactMoney, divide, money, monthLabel, number, percent, sum } from '../lib/format';
import { margin } from '../lib/analytics/metrics';
import { exportCsv } from '../lib/csv';
import { Management } from '../components/management';

export default function Finance() {
  const { view, filters } = useAnalysis();
  const costTypes = [...new Set(view.costs.map((c) => c.category))].map((category) => ({
    category,
    amount: sum(
      view.costs.filter((c) => c.category === category),
      (c) => c.amount,
    ),
  }));
  const cancelled = view.bookings.filter((b) => b.status === 'cancelled');
  return (
    <>
      <PageHeading
        eyebrow="RESULTADOS COM CONTEXTO"
        title="Financeiro"
        description="Receitas, custos e contribuição gerencial. Valores simulados em reais."
      />
      <GlobalFilters />
      <Management resource="costs" />
      <div className="kpi-grid">
        <Kpi
          label="Receita contratada"
          value={compactMoney(view.totalRevenue)}
          detail={`${compactMoney(view.realizedRevenue)} de viagens concluídas`}
          icon={Wallet}
          help="Soma do valor de reservas confirmadas por data da viagem. Não multiplica o valor da reserva pelo número de participantes."
        />
        <Kpi
          label="Custos operacionais"
          value={compactMoney(view.cost)}
          detail={`${compactMoney(
            sum(
              view.costs.filter((c) => c.status === 'estimated'),
              (c) => c.amount,
            ),
          )} estimados futuros`}
          icon={Receipt}
          help="Custos por saída selecionada. Se houver filtro de categoria, o custo é rateado pela participação da receita confirmada da categoria."
        />
        <Kpi
          label="Contribuição estimada"
          value={compactMoney(view.totalRevenue - view.cost)}
          detail={`Margem ${percent(margin(view.totalRevenue, view.cost))}`}
          icon={CirclePercent}
          tone="green"
          help="Receita contratada menos custos operacionais. Não inclui tributos e despesas fixas; não equivale a lucro líquido."
        />
        <Kpi
          label="Ticket médio"
          value={view.ticket == null ? '—' : money(view.ticket)}
          detail={`Custo / viajante: ${view.travelers ? money(view.cost / view.travelers) : '—'}`}
          icon={BadgeDollarSign}
          help="Receita contratada / quantidade de reservas confirmadas. Custo médio por viajante usa participantes confirmados."
        />
      </div>
      <div className="notice">
        <strong>Reconhecimento gerencial:</strong> {money(view.realizedRevenue)} de viagens
        concluídas, {money(view.contractedFuture)} contratados em viagens futuras e{' '}
        {money(view.paid)} em pagamentos recebidos das reservas selecionadas. Esses valores se
        sobrepõem e não devem ser somados.{' '}
        {filters.category !== 'all' &&
          'Custos rateados por participação na receita da categoria; não representam custos individuais apurados.'}
      </div>
      <div className="two-column">
        <Panel title="Receita versus custo" subtitle="Coorte por mês da viagem · histórico">
          <FinancialChart rows={view.monthly} />
        </Panel>
        <Panel
          title="Margem por roteiro"
          subtitle="Contribuição gerencial sobre a receita contratada"
        >
          <SimpleBarChart
            rows={view.routeStats
              .filter((r) => r.margin !== null)
              .map((r) => ({ name: r.shortName, value: r.margin! }))}
            valueLabel="Margem"
            format={(v) => `${number(v)}%`}
          />
        </Panel>
      </div>
      <div className="two-column">
        <Panel
          title="Composição dos custos"
          subtitle="Contratos e serviços das saídas selecionadas"
        >
          <div className="cost-composition">
            {costTypes.map((c) => (
              <div key={c.category}>
                <div>
                  <strong>{c.category}</strong>
                  <span>{money(c.amount)}</span>
                </div>
                <Progress value={view.cost ? (c.amount / view.cost) * 100 : 0} tone="green" />
                <small>{percent(view.cost ? (c.amount / view.cost) * 100 : null)} dos custos</small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Cancelamentos e impacto estimado"
          subtitle="Valor de propostas canceladas; não é perda de receita reconhecida"
        >
          <div className="cancel-metric">
            {cancelled.length}
            <span>reservas canceladas</span>
          </div>
          <div className="detail-metrics">
            <span>
              Taxa de cancelamento<strong>{percent(view.cancellationRate)}</strong>
            </span>
            <span>
              Valor não contratado
              <strong>{compactMoney(sum(cancelled, (b) => b.totalAmount))}</strong>
            </span>
          </div>
          <p className="panel-note">
            Não há multas ou estornos modelados. Reservas canceladas são excluídas da receita.
            Recebimentos anteriores à desistência são preservados, separados da receita e sem
            presumir reembolso. Não é possível inferir perda líquida sem conhecer penalidades e
            custos recuperados.
          </p>
        </Panel>
      </div>
      <Panel
        title="Resultados por roteiro"
        subtitle="Receita contada uma vez por reserva · custos agregados por saída"
      >
        <DataTable
          rows={view.routeStats}
          rowKey={(r) => r.id}
          label="Resultados"
          columns={[
            { key: 'name', label: 'Roteiro', value: (r) => r.shortName },
            { key: 'travelers', label: 'Viajantes', value: (r) => r.travelers },
            {
              key: 'revenue',
              label: 'Receita contratada',
              value: (r) => r.revenue,
              render: (r) => money(r.revenue),
            },
            { key: 'cost', label: 'Custo', value: (r) => r.cost, render: (r) => money(r.cost) },
            {
              key: 'contribution',
              label: 'Contribuição',
              value: (r) => r.contribution,
              render: (r) => money(r.contribution),
            },
            {
              key: 'margin',
              label: 'Margem',
              value: (r) => r.margin,
              render: (r) => percent(r.margin),
            },
            {
              key: 'costTraveler',
              label: 'Custo / viajante',
              value: (r) => divide(r.cost, r.travelers),
              render: (r) => (r.travelers ? money(r.cost / r.travelers) : '—'),
            },
          ]}
          onExport={(rows) => exportCsv('t4f-financeiro.csv', rows)}
        />
      </Panel>
      <Panel
        title="Evolução do ticket médio"
        subtitle="Valor por reserva confirmada em meses com receita"
      >
        <SimpleBarChart
          rows={view.monthly
            .filter((m) => m.ticket !== null)
            .slice(-12)
            .map((m) => ({ name: monthLabel(m.month), value: m.ticket! }))}
          valueLabel="Ticket médio"
          format={(v) => `${number(v / 1000)}k`}
        />
      </Panel>
    </>
  );
}
