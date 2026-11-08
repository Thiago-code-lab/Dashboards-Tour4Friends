import { useState } from 'react';
import { CalendarRange, ChartNoAxesCombined, Target, TrendingUp } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { GlobalFilters, PageHeading } from '../components/layout';
import { Kpi, Panel } from '../components/ui';
import { DemandChart } from '../components/charts';
import { number, sum, monthLabel } from '../lib/format';
import { useForecast } from '../hooks/useForecast';
import { useIntelligence } from '../hooks/useIntelligence';
import { ForecastValidation } from '../components/forecast-validation';
import { AnalyticsLab } from '../components/analytics-lab';
import { CapacitySimulator } from '../components/capacity-simulator';
import { AnomalyPanel } from '../components/anomaly-panel';

export default function Demand() {
  const { filters } = useAnalysis();
  const [horizon, setHorizon] = useState(6);
  const [scenario, setScenario] = useState(0);
  const forecast = useForecast(horizon);
  const analysis = useIntelligence(forecast);
  const selectedMetrics = forecast.metrics.find((model) => model.modelId === forecast.selectedId);
  const total = sum(forecast.predictions, (point) => point.predicted * (1 + scenario / 100));
  return (
    <>
      <PageHeading
        eyebrow="PLANEJAR COM ANTECEDÊNCIA"
        title="Demanda e previsões"
        description="Validação temporal, incerteza exploratória e planejamento com dados reproduzíveis."
      />
      <GlobalFilters />
      <div className="kpi-grid">
        <Kpi
          label="Viajantes no histórico"
          value={number(sum(forecast.history, (point) => point.travelers))}
          detail={`${forecast.sample} meses completos`}
          icon={ChartNoAxesCombined}
          help="Somente meses completos no corte histórico; meses sem movimento são zero. Reservas futuras não entram no treinamento."
        />
        <Kpi
          label="Demanda projetada"
          value={forecast.selected ? number(Math.round(total)) : '—'}
          detail={`Viajantes · próximos ${horizon} meses`}
          icon={TrendingUp}
          help="Valores esperados fracionários são preservados nos cálculos. Uma previsão não representa reserva confirmada."
        />
        <Kpi
          label="MAE do modelo"
          value={number(selectedMetrics?.mae)}
          detail="Teste final · viajantes / mês"
          icon={Target}
          help="Erro absoluto nos seis meses finais, excluídos da seleção por rolling-origin. Ausente quando a separação não é viável."
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
          help="Projeção após o último mês completo filtrado. Acima de seis meses não há faixa de erros estimada."
        />
      </div>
      <Panel
        title="A próxima jornada começa nos dados"
        subtitle="Histórico azul · previsão cinza · faixa exploratória suave"
        action={
          <label className="inline-select">
            Horizonte
            <select
              aria-label="Horizonte da previsão"
              value={horizon}
              onChange={(event) => setHorizon(Number(event.target.value))}
            >
              {[1, 3, 6, 12].map((value) => (
                <option key={value} value={value}>
                  {value} meses
                </option>
              ))}
            </select>
          </label>
        }
      >
        <DemandChart forecast={forecast} scenario={scenario} full />
        <p className="panel-note">
          {forecast.uncertainty.kind === 'exploratory' && scenario === 0
            ? forecast.uncertainty.description
            : scenario !== 0
              ? 'Cenário de sensibilidade: ajuste percentual aplicado à previsão, sem novo treino ou faixa probabilística.'
              : 'Amostra insuficiente para estimar faixas a partir de erros fora da amostra.'}
        </p>
        <p className="panel-note">
          {forecast.uncertainty.coverage
            ? `No teste final, ${forecast.uncertainty.coverage.hits}/${forecast.uncertainty.coverage.count} valores ficaram nas faixas estimadas somente na validação. Seis meses não validam cobertura futura.`
            : 'Sem cobertura fora da calibração mensurável neste recorte.'}{' '}
          {filters.route !== 'all'
            ? 'Modelo específico deste roteiro; séries esparsas podem usar fallback. A soma de previsões independentes não é reconciliada ao total.'
            : 'O modelo agregado é ajustado diretamente à série total.'}
        </p>
        <details className="analysis-details">
          <summary>Erros disponíveis por passo de previsão</summary>
          <ul>
            {forecast.uncertainty.bands.map((band) => (
              <li key={band.lead}>
                Passo {band.lead}: {band.sample} erros ·{' '}
                {band.lowerError === null
                  ? 'sem faixa: mínimo de oito'
                  : `quantis dos resíduos ${number(band.lowerError)} a ${number(band.upperError)}`}
              </li>
            ))}
          </ul>
        </details>
        <p className="snapshot-id" data-testid="analytics-fingerprint">
          Versão analítica {forecast.metadata.model_version} · snapshot{' '}
          {forecast.metadata.fingerprint}
        </p>
      </Panel>
      <ForecastValidation forecast={forecast} />
      <CapacitySimulator forecast={forecast} scenario={scenario} setScenario={setScenario} />
      <AnalyticsLab analysis={analysis} />
      <AnomalyPanel anomalies={analysis.anomalies} />
    </>
  );
}
