import { Panel, Badge } from './ui';
import type { ForecastResult } from '../lib/forecasting/models';
import type { Intelligence } from './analytics-lab';
import { number } from '../lib/format';

export function IntelligencePanel({
  forecast,
  analysis,
  operationalCritical = 0,
}: {
  forecast: ForecastResult;
  analysis: Intelligence;
  operationalCritical?: number;
}) {
  const selected = forecast.metrics.find((row) => row.modelId === forecast.selectedId);
  const recent = forecast.history.slice(-6);
  const lastMean = recent.length
    ? recent.reduce((sum, row) => sum + row.travelers, 0) / recent.length
    : 0;
  const futureMean = forecast.predictions.length
    ? forecast.predictions.reduce((sum, row) => sum + row.predicted, 0) /
      forecast.predictions.length
    : 0;
  const change = lastMean > 0 ? (100 * (futureMean - lastMean)) / lastMean : null;
  const costCount = analysis.anomalies.filter(
    (row) => row.indicator === 'Custo por viajante-dia',
  ).length;
  const cards = [
    {
      title: 'Qualidade da previsão',
      level: selected && lastMean > 0 && selected.mae / lastMean > 0.5 ? 'Atenção' : 'Informação',
      detected: selected
        ? `${forecast.selected}: MAE final ${number(selected.mae)} viajantes em seis meses de teste.`
        : 'Sem avaliação final independente neste recorte.',
      impact: 'Erros de demanda afetam o volume mensal negociado.',
      action: selected
        ? 'Compare erro, amostra e faixa exploratória antes de contratar capacidade.'
        : 'Amplie o histórico; use o fallback apenas como sensibilidade.',
    },
    {
      title: 'Tendência de planejamento',
      level: change !== null && Math.abs(change) >= 25 ? 'Atenção' : 'Informação',
      detected:
        change === null
          ? 'Sem média recente positiva para calcular variação.'
          : `Média projetada ${number(futureMean)} contra ${number(lastMean)} nos seis meses recentes (${number(change)}%).`,
      impact: 'A diferença pode refletir sazonalidade e não demonstra crescimento estrutural.',
      action: 'Confira saídas programadas e compromissos por etapa no simulador.',
    },
    {
      title: 'Custos comparáveis',
      level: costCount ? 'Atenção' : 'Informação',
      detected: `${costCount} custos normalizados superam o critério robusto no recorte.`,
      impact: 'Despesas fora do padrão podem exigir revisão dos contratos.',
      action: costCount
        ? 'Investigue rubricas e escala das saídas em Operações; não há causalidade comprovada.'
        : 'Ausência de sinal não substitui revisão financeira; grupos pequenos não são classificados.',
    },
    {
      title: 'Qualidade da amostra',
      level: 'Informação',
      detected: `${analysis.satisfaction.groups.filter((row) => row.dimension === 'Roteiro' && row.lowSample).length} roteiros têm menos de 12 respostas de satisfação.`,
      impact: 'NPS em amostras pequenas pode variar muito entre períodos.',
      action:
        'Leia a distribuição e as dimensões da experiência; amplie a coleta antes de comparar desempenho.',
    },
    ...(operationalCritical
      ? [
          {
            title: 'Prioridade operacional',
            level: 'Crítico',
            detected: `${operationalCritical} violações críticas de regras ainda abertas.`,
            impact: 'Compromissos concretos exigem ação antes da saída.',
            action:
              'Revise fichas, transfer e contratos em Operações. Gravidade operacional é distinta da anomalia estatística.',
          },
        ]
      : []),
  ];
  return (
    <Panel
      title="Inteligência Gerencial"
      subtitle="O que foi detectado · por que importa · o que avaliar"
    >
      <div className="intelligence-grid">
        {cards.map((card) => (
          <article key={card.title} className="intelligence-card">
            <Badge tone={card.level === 'Informação' ? 'blue' : 'orange'}>{card.level}</Badge>
            <h3>{card.title}</h3>
            <p>{card.detected}</p>
            <p className="muted">{card.impact}</p>
            <p>
              <strong>O que avaliar:</strong> {card.action}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}
