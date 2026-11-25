import { DataTable, Empty, Panel } from './ui';
import { commercialRoutes } from '../lib/commercial/catalog';
import { operationalItineraries } from '../lib/commercial/operational-data';
import {
  activityLabels,
  commercialItineraryReference,
  compareItineraries,
  summarizeItinerary,
  type DocumentedItinerary,
} from '../lib/commercial/operational';

const km = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

function DaySequence({ route }: { route: DocumentedItinerary }) {
  return (
    <DataTable
      key={route.routeId}
      label="Sequência operacional documentada"
      rows={route.days}
      rowKey={(day) => String(day.order)}
      columns={[
        { key: 'order', label: 'Ordem', value: (day) => day.order },
        { key: 'day', label: 'Dia do pacote', value: (day) => day.day },
        {
          key: 'stage',
          label: 'Etapa de caminhada',
          value: (day) => day.walkingStage,
          render: (day) => day.walkingStage ?? 'Não se aplica',
        },
        {
          key: 'activity',
          label: 'Atividade',
          value: (day) => day.activities.map((activity) => activityLabels[activity]).join(' + '),
        },
        { key: 'start', label: 'Início', value: (day) => day.startCity ?? 'Não informado' },
        { key: 'end', label: 'Fim', value: (day) => day.endCity ?? 'Não informado' },
        {
          key: 'distance',
          label: 'Distância (km)',
          value: (day) => day.distanceKm,
          render: (day) => (day.distanceKm === null ? 'Não informada' : km.format(day.distanceKm)),
        },
        {
          key: 'lodging',
          label: 'Hospedagem prevista',
          value: (day) => day.accommodation?.city ?? 'Não informada',
          render: (day) =>
            day.accommodation
              ? `${day.accommodation.city} · ${day.accommodation.name ?? 'hotel não informado'}`
              : 'Não informada',
        },
        { key: 'description', label: 'Descrição da fonte', value: (day) => day.description },
        {
          key: 'evidence',
          label: 'Referência na fonte',
          value: (day) => `p. ${day.evidence.page} · ${day.evidence.location}`,
        },
      ]}
    />
  );
}

function DocumentaryComparison({ route }: { route: DocumentedItinerary }) {
  const issues = compareItineraries(route);
  return (
    <div className="mt-4 space-y-3">
      <h3>Conferência documental</h3>
      <p>
        Pacote comercial: {commercialItineraryReference.source}. A transcrição de preços do PR #4
        não contém duração, etapas ou quilometragem; o PDF original não foi localizado.
      </p>
      <ul className="list-disc pl-5">
        {issues.map((issue) => (
          <li key={issue.message}>
            {issue.kind === 'divergence' ? 'Divergência' : 'Pendente'}: {issue.message}
          </li>
        ))}
      </ul>
      <ul className="list-disc pl-5">
        {route.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

export function OperationalRoutePanel({ routeId }: { routeId: string }) {
  const route = operationalItineraries.find((entry) => entry.routeId === routeId);
  const name =
    commercialRoutes.find((entry) => entry.id === routeId)?.start ?? 'Roteiro não identificado';
  if (!route || route.status === 'pending')
    return (
      <Panel title="Percurso operacional" subtitle={name}>
        <p>Cadastro pendente · duração, etapas e quilometragem não informadas.</p>
        <Empty
          message={`Fonte pendente: ${route?.expectedSources.join('; ') ?? 'roteiro sem fonte documental vinculada'}. Nenhuma etapa foi criada para substituir a documentação ausente.`}
        />
      </Panel>
    );
  const total = summarizeItinerary(route);
  return (
    <Panel title="Percurso operacional" subtitle={name}>
      <p data-testid="operational-totals">
        {total.durationDays} dias de pacote · {total.walkingStages} etapas de caminhada ·{' '}
        {total.walkingKm === null
          ? 'Quilometragem incompleta'
          : `${km.format(total.walkingKm)} km de caminhada`}
      </p>
      <p className="my-4">
        Fonte: {route.source.document}, p. 1 · conferida em 14/11/2026 · data de emissão não
        informada. Totais calculados da sequência; declaração da fonte: {route.declaredDurationDays}{' '}
        dias, {route.declaredWalkingStages} etapas, {km.format(route.declaredDistanceKm)} km.
      </p>
      <p className="my-4">
        Cidades de hospedagem são previsões do roteiro. Hotéis não foram nomeados nestes PDFs. Não
        indicam parceria, preço ou disponibilidade. Passeios, inclusive FreeWalkingTour, e
        transportes ficam fora da distância de caminhada.
      </p>
      <DaySequence route={route} />
      <DocumentaryComparison route={route} />
    </Panel>
  );
}
