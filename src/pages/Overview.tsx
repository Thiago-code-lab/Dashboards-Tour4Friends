import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  CircleAlert,
  FileDown,
  Lightbulb,
  Smile,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { Badge, Empty, Kpi, Panel, Progress } from '../components/ui';
import { DemandChart, FinancialChart } from '../components/charts';
import { compactMoney, dateLabel, money, number, percent } from '../lib/format';
import { useForecast } from '../hooks/useForecast';
import { useIntelligence } from '../hooks/useIntelligence';
import { IntelligencePanel } from '../components/intelligence-panel';
import { PresentationGuide } from '../components/presentation-guide';

export default function Overview() {
  const { view, activeAlerts, insights, filters } = useAnalysis();
  const forecast = useForecast();
  const analysis = useIntelligence(forecast);
  const critical = activeAlerts.filter((a) => a.severity === 'critical');
  const maxTravelers = Math.max(1, ...view.routeStats.map((r) => r.travelers));
  return (
    <>
      <PageHeading
        eyebrow="INTELIGÊNCIA PARA CADA JORNADA"
        title="Visão geral"
        description="Os principais movimentos do negócio. Um caminho mais claro para decidir."
        action={
          <Link className="button" to="/relatorios">
            <FileDown size={16} /> Gerar relatório
          </Link>
        }
      />
      <GlobalFilters />
      <PresentationGuide />
      <div className="scope-caption">
        <span>
          <i /> {dateLabel(filters.start)} a {dateLabel(filters.end)}
        </span>
        <span>Visão consolidada · BRL</span>
      </div>
      <div className="kpi-grid">
        <Kpi
          label="Reservas confirmadas"
          value={number(view.confirmed.length)}
          detail={`${view.bookings.length} reservas no período`}
          icon={Ticket}
          help="Reservas com status confirmado, selecionadas pela data da viagem. Uma reserva pode conter vários viajantes."
        />
        <Kpi
          label="Viajantes atendidos"
          value={number(view.servedTravelers)}
          detail={`${view.uniqueCustomers} clientes únicos confirmados`}
          icon={Users}
          help="Participações em viagens concluídas até a data de referência. A mesma pessoa em duas viagens conta como duas participações."
        />
        <Kpi
          label="Receita realizada"
          value={compactMoney(view.realizedRevenue)}
          detail={`${compactMoney(view.contractedFuture)} em viagens futuras`}
          icon={Wallet}
          help="Valor total das reservas confirmadas com viagem concluída; receita gerencial simulada, não um demonstrativo contábil. Canceladas são excluídas."
        />
        <Kpi
          label="NPS dos viajantes"
          value={number(view.nps)}
          detail={`${view.feedback.length} respostas na amostra`}
          icon={Smile}
          tone="green"
          help="Percentual de promotores (9–10) menos detratores (0–6). Notas 7–8 são neutras. Escala de −100 a 100."
        />
      </div>
      <div className="quick-metrics">
        <span>
          <BadgeCheck size={16} /> Ticket médio{' '}
          <strong>{view.ticket == null ? '—' : money(view.ticket)}</strong>
        </span>
        <span>
          <BedDouble size={16} /> Ocupação contratada <strong>{percent(view.occupancy)}</strong>
        </span>
        <Link to="/operacoes" className={critical.length ? 'risk-text' : ''}>
          <CircleAlert size={16} /> Alertas críticos <strong>{critical.length}</strong>
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="overview-primary">
        <Panel
          title="Demanda, com o próximo passo à vista"
          subtitle="Histórico de viagens e projeção dos próximos 6 meses"
          action={
            <Link className="text-link" to="/demanda">
              Explorar <ArrowRight size={13} />
            </Link>
          }
        >
          <DemandChart forecast={forecast} />
          <div className="chart-footnote">
            <Badge>{forecast.selected ?? 'Base insuficiente'}</Badge>
            <span>
              {forecast.uncertainty.kind === 'exploratory'
                ? 'Faixa exploratória de erros históricos, sem cobertura garantida.'
                : 'Sem amostra suficiente para uma faixa de erros.'}
            </span>
          </div>
        </Panel>
        <Panel
          title="Insights automáticos"
          subtitle="Dos indicadores para a decisão"
          className="insights-panel"
        >
          <div className="insights-list">
            {insights.map((insight, i) => (
              <article className="insight" key={insight.title}>
                <span className={`insight-number ${insight.tone}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3>{insight.title}</h3>
                  <p>{insight.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="insight-disclaimer">
            <Lightbulb size={13} /> Gerados por regras sobre os dados filtrados.
          </div>
        </Panel>
      </div>
      <IntelligencePanel
        forecast={forecast}
        analysis={analysis}
        operationalCritical={critical.length}
      />
      <div className="overview-secondary">
        <Panel
          title="Receita e custos"
          subtitle="Por mês da viagem · histórico"
          action={
            <Link className="text-link" to="/financeiro">
              Ver financeiro <ArrowRight size={13} />
            </Link>
          }
        >
          <FinancialChart rows={view.monthly} />
        </Panel>
        <Panel
          title="Roteiros em destaque"
          subtitle="Viajantes com reserva confirmada"
          action={<CompassIcon />}
        >
          <div className="route-ranking">
            {view.routeStats.filter((r) => r.travelers > 0).length ? (
              view.routeStats
                .filter((r) => r.travelers > 0)
                .slice(0, 5)
                .map((r, i) => (
                  <Link to={`/roteiros?roteiro=${r.id}`} className="ranking-row" key={r.id}>
                    <span className="rank-index">0{i + 1}</span>
                    <div>
                      <div className="ranking-label">
                        <strong>{r.shortName}</strong>
                        <span>
                          {r.travelers} <small>viajantes</small>
                        </span>
                      </div>
                      <Progress value={(r.travelers / maxTravelers) * 100} />
                    </div>
                    <ArrowRight size={14} />
                  </Link>
                ))
            ) : (
              <Empty />
            )}
          </div>
        </Panel>
      </div>
      <Panel
        title="No radar da operação"
        subtitle="Pontos que merecem atenção nas próximas saídas"
        action={
          <Link className="text-link" to="/operacoes">
            Todos os alertas <ArrowRight size={13} />
          </Link>
        }
      >
        {activeAlerts.length ? (
          <div className="alert-preview">
            {activeAlerts.slice(0, 3).map((a) => (
              <Link key={a.id} to="/operacoes">
                <span className="alert-icon">
                  <CircleAlert size={17} />
                </span>
                <div>
                  <strong>{a.type}</strong>
                  <p>{a.cause}</p>
                </div>
                <div className="alert-preview-meta">
                  <Badge tone="orange">{a.severity === 'critical' ? 'Crítico' : 'Atenção'}</Badge>
                  <small>{dateLabel(a.date)}</small>
                </div>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-compact">Nenhum alerta aberto no período selecionado.</div>
        )}
      </Panel>
    </>
  );
}
function CompassIcon() {
  return (
    <span className="panel-mini-icon">
      <Users size={17} />
    </span>
  );
}
