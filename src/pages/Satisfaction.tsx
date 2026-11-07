import { MessageSquare, Smile, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { Badge, DataTable, Kpi, Panel, Progress } from '../components/ui';
import { SimpleBarChart } from '../components/charts';
import { dateLabel, mean, monthLabel, number, percent } from '../lib/format';
import { nps } from '../lib/analytics/metrics';
import { exportCsv } from '../lib/csv';

export default function Satisfaction() {
  const { view } = useAnalysis();
  const feedback = view.feedback;
  const promoters = feedback.filter((f) => f.nps >= 9).length;
  const detractors = feedback.filter((f) => f.nps <= 6).length;
  const neutrals = feedback.length - promoters - detractors;
  const dimensions = [
    { name: 'Atendimento', value: mean(feedback.map((f) => f.service)) },
    { name: 'Hospedagem', value: mean(feedback.map((f) => f.accommodation)) },
    { name: 'Logística', value: mean(feedback.map((f) => f.logistics)) },
  ];
  const weakest = [...dimensions]
    .filter((d) => d.value !== null)
    .sort((a, b) => a.value! - b.value!)[0];
  const categoryRows = ['Premium', 'Conforto', 'Alternativa'].map((category) => {
    const ids = new Set(view.bookings.filter((b) => b.category === category).map((b) => b.id));
    const rows = feedback.filter((f) => ids.has(f.bookingId));
    return {
      category,
      nps: nps(rows.map((f) => f.nps)),
      responses: rows.length,
      accommodation: mean(rows.map((f) => f.accommodation)),
    };
  });
  return (
    <>
      <PageHeading
        eyebrow="OUVIR PARA EVOLUIR"
        title="Experiência do cliente"
        description="A percepção dos viajantes, com o tamanho da amostra sempre em perspectiva."
      />
      <GlobalFilters />
      <div className="kpi-grid">
        <Kpi
          label="NPS geral"
          value={number(view.nps)}
          detail={`${feedback.length} respostas · escala −100 a 100`}
          icon={Smile}
          tone="green"
          help="100 × (promotores − detratores) / respostas válidas. Promotores: 9–10; neutros: 7–8; detratores: 0–6."
        />
        <Kpi
          label="Promotores"
          value={number(promoters)}
          detail="Notas 9 e 10"
          icon={ThumbsUp}
          tone="green"
          help="Respostas com nota explícita de recomendação igual a 9 ou 10."
        />
        <Kpi
          label="Neutros"
          value={number(neutrals)}
          detail="Notas 7 e 8"
          icon={MessageSquare}
          help="Respostas com nota 7 ou 8; entram no denominador do NPS."
        />
        <Kpi
          label="Detratores"
          value={number(detractors)}
          detail="Notas de 0 a 6"
          icon={ThumbsDown}
          tone={detractors ? 'orange' : 'gray'}
          help="Respostas de 0 a 6. O contexto de feedback deve orientar as melhorias."
        />
      </div>
      <div className="two-column">
        <Panel
          title="Como foi a experiência?"
          subtitle={`${feedback.length} respostas vinculadas a reservas confirmadas e viagens concluídas`}
        >
          <div className="experience-dimensions">
            {dimensions.map((d) => (
              <div key={d.name}>
                <div>
                  <strong>{d.name}</strong>
                  <span>
                    {number(d.value)} <small>/ 10</small>
                  </span>
                </div>
                <Progress value={(d.value ?? 0) * 10} tone="green" />
              </div>
            ))}
          </div>
          <div className="improvement-box">
            <MessageSquare size={18} />
            <div>
              <h3>
                {weakest
                  ? `Prioridade de escuta: ${weakest.name.toLowerCase()}`
                  : 'Aguardando avaliações'}
              </h3>
              <p>
                {weakest
                  ? `Com média ${number(weakest.value)}/10, é a dimensão de menor nota neste recorte. Analise os comentários e valide ações antes da próxima saída.`
                  : 'Não há amostra de satisfação para este período.'}
              </p>
            </div>
          </div>
          <p className="panel-note">
            Amostra pequena e não probabilística. Associação entre notas e categoria não demonstra
            causalidade nem representa toda a base de clientes.
          </p>
        </Panel>
        <Panel
          title="Distribuição das notas NPS"
          subtitle="Notas explícitas de recomendação · 0 a 10"
        >
          <SimpleBarChart
            rows={Array.from({ length: 11 }, (_, i) => ({
              name: String(i),
              value: feedback.filter((f) => f.nps === i).length,
            }))}
            valueLabel="Respostas"
          />
        </Panel>
      </div>
      <div className="two-column">
        <Panel title="NPS por roteiro" subtitle="Exiba a amostra junto a qualquer comparação">
          <DataTable
            rows={view.routeStats}
            rowKey={(r) => r.id}
            label="Roteiros"
            columns={[
              { key: 'name', label: 'Roteiro', value: (r) => r.shortName },
              { key: 'nps', label: 'NPS', value: (r) => r.nps, render: (r) => number(r.nps) },
              { key: 'responses', label: 'Respostas', value: (r) => r.responses },
            ]}
          />
        </Panel>
        <Panel
          title="Experiência por categoria"
          subtitle="Notas de hospedagem e NPS da mesma coorte"
        >
          <DataTable
            rows={categoryRows}
            rowKey={(r) => r.category}
            label="Categorias"
            columns={[
              { key: 'category', label: 'Categoria', value: (r) => r.category },
              { key: 'nps', label: 'NPS', value: (r) => r.nps, render: (r) => number(r.nps) },
              {
                key: 'accommodation',
                label: 'Hospedagem / 10',
                value: (r) => r.accommodation,
                render: (r) => number(r.accommodation),
              },
              { key: 'responses', label: 'Amostra', value: (r) => r.responses },
            ]}
          />
        </Panel>
      </div>
      <Panel
        title="Evolução do NPS"
        subtitle="Meses com respostas · agrupamento pela data da avaliação, limitado à coorte de viagens selecionada"
      >
        <SimpleBarChart
          rows={view.monthly
            .filter((m) => m.nps !== null)
            .slice(-12)
            .map((m) => ({ name: monthLabel(m.month), value: m.nps! }))}
          valueLabel="NPS"
        />
      </Panel>
      <Panel
        title="O que os viajantes disseram"
        subtitle="Comentários inteiramente sintéticos, vinculados às reservas da simulação"
      >
        <DataTable
          rows={feedback}
          rowKey={(f) => f.id}
          label="Feedbacks"
          searchText={(f) => `${f.comment} ${f.bookingId}`}
          columns={[
            { key: 'date', label: 'Data', value: (f) => f.date, render: (f) => dateLabel(f.date) },
            { key: 'booking', label: 'Reserva', value: (f) => f.bookingId },
            {
              key: 'nps',
              label: 'Nota NPS',
              value: (f) => f.nps,
              render: (f) => (
                <Badge tone={f.nps >= 9 ? 'green' : f.nps <= 6 ? 'orange' : 'gray'}>
                  {f.nps} / 10
                </Badge>
              ),
            },
            { key: 'comment', label: 'Feedback demonstrativo', value: (f) => f.comment },
          ]}
          onExport={(rows) => exportCsv('t4f-satisfacao.csv', rows)}
        />
        <p className="panel-note">
          Promotores: {percent(feedback.length ? (100 * promoters) / feedback.length : null)} ·
          neutros: {percent(feedback.length ? (100 * neutrals) / feedback.length : null)} ·
          detratores: {percent(feedback.length ? (100 * detractors) / feedback.length : null)}.
        </p>
      </Panel>
    </>
  );
}
