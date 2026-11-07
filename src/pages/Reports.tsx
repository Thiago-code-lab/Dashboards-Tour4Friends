import { FileDown, Mountain, Printer, Ticket, Users, Wallet, Smile } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { Badge, Kpi, Panel } from '../components/ui';
import { ReportDemandChart, ReportFinancialChart } from '../components/report-charts';
import { useForecast } from '../hooks/useForecast';
import { MEMBERS, PROJECT_URL } from '../lib/project';
import { capacityPlan } from '../lib/forecasting/capacity';
import { compactMoney, dateLabel, monthLabel, number } from '../lib/format';

export default function Reports() {
  const { data, view, filters, insights, activeAlerts } = useAnalysis();
  const forecast = useForecast(6);
  const plan = capacityPlan(data, filters, forecast.predictions);
  const generated = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  return (
    <div className="report-screen">
      <div className="no-print">
        <PageHeading
          eyebrow="EVIDÊNCIAS PARA COMPARTILHAR"
          title="Relatório executivo"
          description="Uma leitura do cenário selecionado, pronta para imprimir ou salvar em um único PDF."
          action={
            <button className="button primary" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir / salvar PDF
            </button>
          }
        />
        <GlobalFilters />
        <div className="notice">
          <FileDown size={17} /> A primeira página identifica o projeto e todos os integrantes. Na
          janela de impressão, escolha “Salvar como PDF”, papel A4 e desative cabeçalhos e rodapés
          do navegador.
        </div>
      </div>
      <article className="report-document">
        <section className="report-cover">
          <div className="report-cover-brand">
            <Mountain size={34} />
            <strong>
              T4F<span>PERFORMANCE</span>
            </strong>
          </div>
          <div className="report-cover-main">
            <p className="eyebrow">PROJETO INTEGRADOR V</p>
            <h1>
              Informação que orienta.
              <br />
              Decisões que movem.
            </h1>
            <p>Relatório executivo de desempenho corporativo</p>
            <div className="report-cover-period">
              {dateLabel(filters.start)} — {dateLabel(filters.end)}
            </div>
            <Badge>Dados demonstrativos — cenário acadêmico simulado.</Badge>
          </div>
          <div className="report-cover-bottom">
            <h2>Fatec Ipiranga “Pastor Enéas Tognini”</h2>
            <ul>
              {MEMBERS.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p>Gerado em {generated} · America/Sao_Paulo</p>
            <a href={PROJECT_URL}>{PROJECT_URL}</a>
          </div>
        </section>
        <section className="report-section">
          <div className="report-section-label">01 / PANORAMA</div>
          <h2>Resumo executivo</h2>
          <p>
            Este relatório consolida o cenário sintético de referência em{' '}
            {dateLabel(data.metadata.referenceDate)}, filtrado por data da viagem de{' '}
            {dateLabel(filters.start)} a {dateLabel(filters.end)}. Roteiro:{' '}
            {filters.route === 'all'
              ? 'todos'
              : data.routes.find((r) => r.id === filters.route)?.name}
            . Modalidade: {filters.modality === 'all' ? 'todas' : filters.modality}. Categoria:{' '}
            {filters.category === 'all' ? 'todas' : filters.category}.
          </p>
          <div className="kpi-grid">
            <Kpi
              label="Confirmadas"
              value={number(view.confirmed.length)}
              detail="Reservas"
              icon={Ticket}
              help="Confirmadas pela data da viagem"
            />
            <Kpi
              label="Atendidos"
              value={number(view.servedTravelers)}
              detail="Participações concluídas"
              icon={Users}
              help="Viajantes de saídas concluídas"
            />
            <Kpi
              label="Receita realizada"
              value={compactMoney(view.realizedRevenue)}
              detail="Viagens concluídas"
              icon={Wallet}
              help="Receita gerencial simulada"
            />
            <Kpi
              label="NPS"
              value={number(view.nps)}
              detail={`${view.feedback.length} respostas`}
              icon={Smile}
              help="Promotores menos detratores em percentual"
            />
          </div>
          <div className="report-insights">
            {insights.map((i) => (
              <div key={i.title}>
                <h3>{i.title}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
          <Panel title="Receita e custos" subtitle="Histórico por mês da viagem">
            <ReportFinancialChart rows={view.monthly} />
          </Panel>
        </section>
        <section className="report-section">
          <div className="report-section-label">02 / PLANEJAMENTO</div>
          <h2>Demanda e validação temporal</h2>
          <p>{forecast.reason}</p>
          <ReportDemandChart forecast={forecast} />
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>MAE</th>
                <th>RMSE</th>
              </tr>
            </thead>
            <tbody>
              {forecast.metrics.map((m) => (
                <tr key={m.model}>
                  <td>
                    {m.model}
                    {m.model === forecast.selected ? ' · selecionado' : ''}
                  </td>
                  <td>{number(m.mae)}</td>
                  <td>{number(m.rmse)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            {forecast.trainEnd
              ? `Treino até ${monthLabel(forecast.trainEnd)}. Teste de ${monthLabel(forecast.testStart!)} a ${monthLabel(forecast.history.at(-1)!.month)}.`
              : 'Sem métricas de teste: histórico insuficiente para comparação temporal.'}
          </p>
          <table>
            <thead>
              <tr>
                <th>Mês projetado</th>
                <th>Viajantes esperados</th>
                <th>Já confirmados</th>
                <th>Vagas / noite a planejar</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((p) => (
                <tr key={p.month}>
                  <td>{monthLabel(p.month)}</td>
                  <td>{number(p.predicted)}</td>
                  <td>{p.committed}</td>
                  <td>{p.beds}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Vagas consideram o maior valor entre projeção arredondada e viajantes futuros já
            confirmados. Não equivalem a capacidade simultânea nem a contratos por localidade.
            Reservas futuras não entram no treinamento.
          </p>
        </section>
        <section className="report-section">
          <div className="report-section-label">03 / AÇÃO E METODOLOGIA</div>
          <h2>Prioridades operacionais</h2>
          <p>
            {activeAlerts.length} alertas não resolvidos no recorte. Os primeiros{' '}
            {Math.min(6, activeAlerts.length)} estão resumidos abaixo.
          </p>
          <div className="report-alerts">
            {activeAlerts.slice(0, 6).map((a) => (
              <div key={a.id}>
                <strong>
                  {a.severity === 'critical' ? 'Crítico' : 'Atenção'} · {a.type} ·{' '}
                  {dateLabel(a.date)} · {a.departureId}
                </strong>
                <p>
                  {a.cause} {a.action}
                </p>
              </div>
            ))}
          </div>
          <h2>Conclusões e limites</h2>
          <p>
            Priorize as ações operacionais acima, revise a disponibilidade por data e etapa antes de
            ampliar vendas e use a projeção para negociação antecipada de vagas. Compare os
            resultados com o tamanho da amostra e a incerteza de um cenário sintético.
          </p>
          <p>
            Receita é contabilizada uma vez por reserva confirmada. Realizada gerencial corresponde
            a viagens concluídas; contratada inclui viagens futuras. Ocupação agrega os mesmos slots
            em vagas-noite, sem compensar faltas em datas diferentes. NPS = 100 × (promotores −
            detratores) ÷ respostas.
          </p>
          <p>
            Ridge usa tendência e harmônicos anuais (λ=4). O teste temporal preserva seis meses; o
            menor MAE seleciona o método. RMSE penaliza erros grandes. A mesma janela serve para
            seleção, portanto não é uma avaliação independente posterior. Sem histórico suficiente
            há fallback estatístico explícito.
          </p>
          <p>
            Fonte: gerador sintético, versão {data.metadata.version}, seed {data.metadata.seed}.
            Histórico até {dateLabel(data.metadata.historyEnd)}. {data.customers.length} clientes,{' '}
            {data.bookings.length} reservas, {data.leads.length} leads, {data.routes.length}{' '}
            roteiros e {data.feedback.length} avaliações na base completa. Validação por schema,
            chaves únicas e integridade referencial. Sem integração ativa com banco de dados ou
            dados operacionais reais. Custos por categoria usam rateio de receita. Não há inferência
            causal ou intervalo de incerteza calibrado.
          </p>
          <p className="report-final">
            T4F Performance — Projeto Integrador V · Fatec Ipiranga
            <br />
            Dados demonstrativos — cenário acadêmico simulado.
          </p>
        </section>
      </article>
    </div>
  );
}
