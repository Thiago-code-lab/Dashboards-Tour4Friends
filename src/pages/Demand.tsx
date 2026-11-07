import { useState } from 'react';
import { BedDouble, CalendarRange, ChartNoAxesCombined, Target, TrendingUp } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { GlobalFilters, PageHeading } from '../components/layout';
import { Badge, DataTable, Kpi, Panel } from '../components/ui';
import { DemandChart, SimpleBarChart } from '../components/charts';
import { monthLabel, number, sum } from '../lib/format';
import { useForecast } from '../hooks/useForecast';
import { exportCsv } from '../lib/csv';

export default function Demand() {
  const { view } = useAnalysis();
  const [horizon, setHorizon] = useState(6);
  const [scenario, setScenario] = useState(0);
  const forecast = useForecast(horizon);
  const selectedMetrics = forecast.metrics.find((m) => m.model === forecast.selected);
  const total = sum(forecast.predictions, (p) => p.predicted * (1 + scenario / 100));
  const seasonal = Array.from({ length: 12 }, (_, i) => {
    const rows = view.monthly.filter((p) => Number(p.month.slice(5, 7)) === i + 1);
    return {
      name: monthLabel(`2026-${String(i + 1).padStart(2, '0')}`).split(' ')[0],
      value: rows.length ? sum(rows, (p) => p.travelers) / rows.length : 0,
    };
  });
  return (
    <>
      <PageHeading
        eyebrow="PLANEJAR COM ANTECEDÊNCIA"
        title="Demanda e previsões"
        description="Do histórico ao planejamento de vagas. Modelos reais, com limites transparentes."
      />
      <GlobalFilters />
      <div className="kpi-grid">
        <Kpi
          label="Viajantes no histórico"
          value={number(sum(forecast.history, (p) => p.travelers))}
          detail={`${forecast.sample} meses completos`}
          icon={ChartNoAxesCombined}
          help="Somatório de viajantes confirmados nos meses completos do recorte histórico. Meses sem movimento são zero."
        />
        <Kpi
          label="Demanda projetada"
          value={forecast.selected ? number(Math.round(total)) : '—'}
          detail={`Viajantes · próximos ${horizon} meses`}
          icon={TrendingUp}
          help="Soma das previsões mensais. Valores esperados podem ser fracionários; o total é arredondado para apresentação."
        />
        <Kpi
          label="MAE do modelo"
          value={number(selectedMetrics?.mae)}
          detail="Viajantes de erro médio / mês"
          icon={Target}
          help="Erro absoluto médio no teste dos últimos seis meses; quanto menor, melhor. Ausente quando não há validação suficiente."
        />
        <Kpi
          label="Meses projetados"
          value={number(horizon)}
          detail={
            forecast.predictions[0]
              ? `A partir de ${monthLabel(forecast.predictions[0].month)}`
              : 'Sem histórico suficiente'
          }
          icon={CalendarRange}
          help="Horizonte futuro em relação ao último mês completo incluído no recorte."
        />
      </div>
      <Panel
        title="A próxima jornada começa nos dados"
        subtitle="Observado em azul · previsão em cinza tracejado"
        action={
          <label className="inline-select">
            Horizonte
            <select
              aria-label="Horizonte da previsão"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
            >
              {[3, 6, 12].map((n) => (
                <option value={n} key={n}>
                  {n} meses
                </option>
              ))}
            </select>
          </label>
        }
      >
        <DemandChart forecast={forecast} scenario={scenario} full />
        <div className="scenario-control">
          <span className="scenario-icon">
            <BedDouble size={21} />
          </span>
          <div>
            <h3>E se a demanda mudar?</h3>
            <p>Simule a necessidade de vagas. O ajuste não executa um novo treinamento.</p>
          </div>
          <label>
            <span>
              Variação:{' '}
              <strong>
                {scenario > 0 ? '+' : ''}
                {scenario}%
              </strong>
            </span>
            <input
              type="range"
              aria-label="Variação do cenário"
              min={-30}
              max={30}
              step={5}
              value={scenario}
              onChange={(e) => setScenario(Number(e.target.value))}
            />
          </label>
          <button className="button small" onClick={() => setScenario(10)}>
            Simular +10%
          </button>
        </div>
      </Panel>
      <div className="two-column">
        <Panel title="Validação temporal" subtitle="Treino cronológico e teste de seis meses">
          <div className="method-summary">
            <Badge tone="blue">{forecast.selected ?? 'Sem estimativa'}</Badge>
            <p>{forecast.reason}</p>
            {forecast.trainEnd && (
              <p className="muted">
                Treino até {monthLabel(forecast.trainEnd)} · teste a partir de{' '}
                {monthLabel(forecast.testStart!)}. Nenhum valor do teste é usado no ajuste inicial.
              </p>
            )}
          </div>
          {forecast.metrics.length > 0 && (
            <DataTable
              rows={forecast.metrics}
              rowKey={(m) => m.model}
              label="Modelos"
              columns={[
                { key: 'model', label: 'Modelo', value: (r) => r.model },
                { key: 'mae', label: 'MAE', value: (r) => r.mae, render: (r) => number(r.mae) },
                { key: 'rmse', label: 'RMSE', value: (r) => r.rmse, render: (r) => number(r.rmse) },
              ]}
            />
          )}
          <p className="panel-note">
            Ridge: tendência + harmônicos anuais, penalização λ=4 fixa. Baseline: repete o mesmo mês
            do ano anterior. Sem volume, usamos média dos 3 últimos meses com pesos 1, 2 e 3.
            Nenhuma chamada a IA externa.
          </p>
        </Panel>
        <Panel
          title="Sazonalidade mensal"
          subtitle="Média de viajantes por mês do calendário no recorte"
        >
          <SimpleBarChart rows={seasonal} valueLabel="Viajantes / mês" />
          <p className="panel-note">
            A média inclui meses completos sem movimento. Com amostra pequena, sazonalidade pode
            variar bastante.
          </p>
        </Panel>
      </div>
      <Panel
        title="Planejamento de capacidade"
        subtitle="Uma vaga de hospedagem por viajante, por noite/etapa; não representa contratação confirmada"
      >
        <DataTable
          rows={forecast.predictions.map((p) => ({
            ...p,
            scenario: p.predicted * (1 + scenario / 100),
            beds: Math.ceil(p.predicted * (1 + scenario / 100)),
          }))}
          rowKey={(p) => p.month}
          label="Meses projetados"
          columns={[
            {
              key: 'month',
              label: 'Mês',
              value: (p) => p.month,
              render: (p) => monthLabel(p.month),
            },
            {
              key: 'predicted',
              label: 'Previsão base',
              value: (p) => p.predicted,
              render: (p) => number(p.predicted),
            },
            {
              key: 'scenario',
              label: `Cenário ${scenario > 0 ? '+' : ''}${scenario}%`,
              value: (p) => p.scenario,
              render: (p) => number(p.scenario),
            },
            { key: 'beds', label: 'Vagas / noite a planejar', value: (p) => p.beds },
          ]}
          onExport={(rows) => exportCsv('t4f-previsao.csv', rows)}
        />
        <p className="panel-note">
          Arredondamento de vagas para cima em cada mês. A previsão não define a simultaneidade das
          saídas nem a distribuição por localidade.
        </p>
      </Panel>
      <div className="two-column">
        <Panel title="Demanda por roteiro" subtitle="Viajantes confirmados no período">
          <SimpleBarChart
            rows={view.routeStats.map((r) => ({ name: r.shortName, value: r.travelers }))}
            valueLabel="Viajantes"
          />
        </Panel>
        <Panel
          title="Observado versus previsto no teste"
          subtitle="Previsões calculadas a partir do treino, antes de observar o teste"
        >
          <DataTable
            rows={forecast.backtest}
            rowKey={(p) => p.month}
            label="Meses de teste"
            columns={[
              {
                key: 'month',
                label: 'Mês',
                value: (p) => p.month,
                render: (p) => monthLabel(p.month),
              },
              { key: 'observed', label: 'Observado', value: (p) => p.observed },
              {
                key: 'baseline',
                label: 'Sazonal',
                value: (p) => p.baseline,
                render: (p) => number(p.baseline),
              },
              {
                key: 'ridge',
                label: 'Ridge',
                value: (p) => p.ridge,
                render: (p) => number(p.ridge),
              },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
