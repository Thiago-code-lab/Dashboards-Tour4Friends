import { useState } from 'react';
import { commercialRoutes } from '../lib/commercial/catalog';
import { operationalItineraries } from '../lib/commercial/operational-data';
import { Empty, Panel } from './ui';
import { WayGeography } from './way-geography';

export function RouteRiskMap() {
  const [routeId, setRouteId] = useState('sarria');
  const selected = commercialRoutes.find((route) => route.id === routeId)!;
  const itinerary = operationalItineraries.find((route) => route.routeId === routeId)!;
  const stages =
    itinerary.status === 'documented'
      ? itinerary.days.filter((day) => day.walkingStage !== null)
      : [];
  return (
    <Panel
      title="Mapa dos caminhos e riscos por etapa"
      subtitle="Partidas geográficas e ligações generalizadas; não é um trajeto GPS. Disponibilidade real não verificada."
    >
      <label className="inline-select">
        Ponto de partida
        <select
          aria-label="Roteiro do mapa"
          value={routeId}
          onChange={(event) => setRouteId(event.target.value)}
        >
          {commercialRoutes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.way} · {route.start}
            </option>
          ))}
        </select>
      </label>
      <WayGeography onSelect={setRouteId} />
      <div
        className="my-5 grid gap-6 lg:grid-cols-2"
        aria-label="Mapa esquemático dos dois caminhos"
      >
        {(['Francês', 'Português'] as const).map((way) => (
          <div key={way} className="border-l-2 border-slate-300 pl-5">
            <h3 className="mb-3 font-semibold">Caminho {way}</h3>
            <div className="flex flex-wrap gap-3">
              {commercialRoutes
                .filter((route) => route.way === way)
                .map((route) => (
                  <button
                    type="button"
                    aria-pressed={routeId === route.id}
                    className={`button ${routeId === route.id ? 'primary' : ''}`}
                    key={route.id}
                    onClick={() => setRouteId(route.id)}
                  >
                    {route.start} → Santiago
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mb-4 text-sm">
        Convergência em Santiago de Compostela. Os botões representam partidas alternativas; sua
        posição não define a ordem das cidades.
      </p>
      <div className="mb-5 flex flex-wrap gap-4 text-sm" aria-label="Legenda do semáforo">
        <span>🟢 Favorável: abaixo de 75%</span>
        <span>🟡 Atenção: 75–85%</span>
        <span>🔴 Risco elevado: acima de 85%</span>
        <span>⚪ Cinza: desconhecida</span>
      </div>
      <h3 className="mb-3 font-semibold">{selected.start} · sequência documentada</h3>
      {stages.length ? (
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Riscos das etapas">
          {stages.map((day) => (
            <li key={day.order} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold">
                {day.walkingStage}. {day.startCity} → {day.endCity}
              </p>
              <p className="my-2 text-sm">
                {day.distanceKm == null
                  ? 'Distância não informada'
                  : `${day.distanceKm.toLocaleString('pt-BR')} km`}{' '}
                · dia {day.day}
              </p>
              <p className="text-sm text-slate-600">
                <span aria-hidden="true">● </span>Disponibilidade desconhecida
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {itinerary.status === 'documented' ? itinerary.source.document : ''} · p.{' '}
                {day.evidence.page}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <Empty message="Sequência operacional ainda não importada nesta branch. A seleção da partida não comprova etapas, hotéis ou vagas." />
      )}
      <details className="mt-5 text-sm">
        <summary>Regras e origem do semáforo</summary>
        <p className="mt-3">
          As cores exigem capacidade e comprometimento verificados na mesma data, roteiro, etapa e
          categoria, com fonte e conferência no dia da consulta. Ocupação = vagas-noite
          comprometidas / capacidade comparável × 100. Sem evidência, com dados vencidos ou de outro
          recorte, o status é cinza. Limites são uma política de gestão, não uma probabilidade
          estatística.
        </p>
        <p className="mt-3">
          Não há inventário verificado nesta entrega. Demanda projetada, eventos locais e nomes de
          hotéis não foram usados para inferir vagas. O histórico sintético de hospedagens permanece
          separado deste mapa documental.
        </p>
      </details>
    </Panel>
  );
}
