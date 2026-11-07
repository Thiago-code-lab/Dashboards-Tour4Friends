import type { Alert } from '../../types/domain';
import type { Analysis } from './metrics';
import { money, number, percent } from '../format';

export function buildInsights(
  view: Analysis,
  alerts: Alert[],
): { title: string; text: string; tone: 'blue' | 'green' | 'orange' }[] {
  const insights: ReturnType<typeof buildInsights> = [];
  const critical = alerts.filter((a) => a.severity === 'critical');
  const first = view.routeStats.find((r) => r.revenue > 0);
  if (critical.length)
    insights.push({
      title: 'Prioridade na operação',
      text: `${critical.length} alertas críticos no escopo. ${critical[0].cause} ${critical[0].action}`,
      tone: 'orange',
    });
  else
    insights.push({
      title: 'Operação no escopo',
      text: alerts.length
        ? `${alerts.length} pontos de atenção para acompanhar antes das próximas saídas.`
        : 'Nenhum alerta operacional pelas regras e pelo período selecionados.',
      tone: 'green',
    });
  if (first && view.totalRevenue > 0)
    insights.push({
      title: 'Concentração de receita',
      text: `${first.shortName} reúne ${percent((first.revenue / view.totalRevenue) * 100)} da receita contratada (${money(first.revenue)}). Acompanhe a diversificação do portfólio.`,
      tone: 'blue',
    });
  else
    insights.push({
      title: 'Sem receita no recorte',
      text: 'Não há reservas confirmadas neste escopo. Amplie o período ou revise os filtros para comparar resultados.',
      tone: 'blue',
    });
  if (view.feedback.length)
    insights.push({
      title: 'A voz de quem viajou',
      text: `NPS ${number(view.nps)} em ${view.feedback.length} respostas. ${view.nps! < 50 ? 'Investigue as notas de hospedagem e logística para priorizar melhorias.' : 'Preserve os fatores bem avaliados; acompanhe a amostra antes de generalizar.'}`,
      tone: view.nps! < 50 ? 'orange' : 'green',
    });
  else
    insights.push({
      title: 'Escutar antes de concluir',
      text: 'Sem respostas de satisfação no período. Colete avaliações após as viagens para medir a experiência.',
      tone: 'blue',
    });
  return insights;
}
