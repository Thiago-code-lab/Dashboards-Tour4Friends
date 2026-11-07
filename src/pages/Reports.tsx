import { FileDown, Mountain, Printer, Ticket, Users, Wallet, Smile } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { Badge, Kpi, Panel } from '../components/ui';
import { ReportDemandChart, ReportFinancialChart } from '../components/report-charts';
import { useForecast } from '../hooks/useForecast';
import { useIntelligence } from '../hooks/useIntelligence';
import { MEMBERS, PROJECT_URL } from '../lib/project';
import { capacityPlan } from '../lib/forecasting/capacity';
import { compactMoney, dateLabel, monthLabel, number } from '../lib/format';

export default function Reports() {
  const { data, view, filters, insights, activeAlerts, mode } = useAnalysis();
  const forecast = useForecast(6);
  const analysis = useIntelligence(forecast);
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
          <p>
            {forecast.uncertainty.kind === 'exploratory'
              ? forecast.uncertainty.description
              : 'Neste recorte faltam erros fora da amostra para estimar uma faixa.'}{' '}
            {forecast.uncertainty.coverage
              ? `No teste final, ${forecast.uncertainty.coverage.hits} de ${forecast.uncertainty.coverage.count} observações ficaram nas faixas, sem garantia de repetição futura.`
              : ''}
          </p>
          <p>
            {forecast.baselineImprovement === null
              ? 'Não há comparação percentual válida com o baseline.'
              : `Redução do MAE frente ao sazonal nas mesmas origens de validação a três meses: ${number(forecast.baselineImprovement)}%.`}{' '}
            Valores negativos indicam piora. As métricas abaixo pertencem ao teste final e não
            selecionam o vencedor.
          </p>
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>MAE</th>
                <th>RMSE</th>
                <th>Viés</th>
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
                  <td>{number(m.bias)}</td>
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
                <th>Viajantes a planejar no mês</th>
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
            O volume mensal considera o maior valor entre projeção arredondada e viajantes futuros
            já confirmados. Não equivalem a capacidade simultânea nem a contratos por localidade.
            Reservas futuras não entram no treinamento.
          </p>
        </section>
        <section className="report-section">
          <div className="report-section-label">03 / LABORATÓRIO ANALÍTICO</div>
          <h2>O que os dados sugerem</h2>
          <h3>Sazonalidade da demanda</h3>
          <p>{analysis.seasonality.conclusion}</p>
          <p>
            {forecast.history.length} meses completos, média{' '}
            {number(analysis.seasonality.distribution.mean)}, mediana{' '}
            {number(analysis.seasonality.distribution.median)}, desvio padrão{' '}
            {number(analysis.seasonality.distribution.sd)} viajantes/mês. Poucas repetições anuais;
            sem prova inferencial de sazonalidade.
          </p>
          <h3>Cancelamentos e comportamento comercial</h3>
          <p>{analysis.cancellations.conclusion}</p>
          <p>
            Foram analisadas {analysis.cancellations.n} reservas históricas, sendo{' '}
            {analysis.cancellations.cancelled} canceladas. Os intervalos Wilson usam aproximação
            binomial; respostas e reservas repetidas podem não ser independentes.
          </p>
          <h3>Satisfação e experiência</h3>
          <p>{analysis.satisfaction.conclusion}</p>
          <p>
            {analysis.satisfaction.n} respostas no corte; NPS e notas de atendimento, hospedagem e
            logística são comparados por grupo. Bootstrap por cliente é exploratório, com 500
            reamostragens e mínimo de 12 respostas e oito clientes; não comprova superioridade.
          </p>
          <h3>Anomalias para investigação</h3>
          <p>
            {analysis.anomalies.length} ocorrências ultrapassaram os critérios robustos. São
            indícios estatísticos, distintos de violações operacionais; não comprovam causa.
          </p>
          <div className="report-alerts">
            {analysis.anomalies.slice(0, 5).map((row) => (
              <div key={row.id}>
                <strong>
                  {row.indicator} · {row.scope}
                </strong>
                <p>
                  {number(row.observed)} {row.unit}, referência {number(row.reference)};{' '}
                  {row.method}, n={row.sample}, intensidade {number(row.intensity)}.{' '}
                  {row.investigation}
                </p>
              </div>
            ))}
          </div>
          <p>
            Versão do modelo {forecast.metadata.model_version}; identificação do snapshot analítico{' '}
            {forecast.metadata.fingerprint}. Dados sintéticos demonstram os métodos, sem comprovar
            desempenho real da Tour4Friends.
          </p>
        </section>
        <section className="report-section">
          <div className="report-section-label">04 / AÇÃO E METODOLOGIA</div>
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
            Ridge usa tendência e harmônicos anuais (λ=4), comparado ao sazonal, média ponderada e
            tendência amortecida. Origens expansivas de três meses selecionam o método; os seis
            meses finais ficam separados quando viável. Métodos a até 1% do menor MAE favorecem
            simplicidade. RMSE penaliza erros grandes; viés positivo indica superestimação. Sem
            histórico suficiente há fallback explícito.
          </p>
          <p>
            Fonte: gerador sintético, versão {data.metadata.version}, seed {data.metadata.seed}.
            Histórico até {dateLabel(data.metadata.historyEnd)}. {data.customers.length} clientes,{' '}
            {data.bookings.length} reservas, {data.leads.length} leads, {data.routes.length}{' '}
            roteiros e {data.feedback.length} avaliações na base completa. Validação por schema,
            chaves únicas e integridade referencial.{' '}
            {mode === 'api'
              ? 'Fonte: API autenticada e PostgreSQL do laboratório.'
              : 'Fonte: JSON estático da demonstração.'}{' '}
            Sem dados operacionais reais. Custos por categoria usam rateio de receita. Não há
            inferência causal ou garantia de cobertura das faixas exploratórias.
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
