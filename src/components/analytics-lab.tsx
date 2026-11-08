import { useState } from 'react';
import type { useIntelligence } from '../hooks/useIntelligence';
import { number, percent } from '../lib/format';
import { DataTable, Panel } from './ui';
import { SimpleBarChart } from './charts';
import { exportCsv } from '../lib/csv';

export type Intelligence = ReturnType<typeof useIntelligence>;
export function AnalyticsLab({ analysis }: { analysis: Intelligence }) {
  const [tab, setTab] = useState('seasonality');
  const [dimension, setDimension] = useState('Roteiro');
  const { seasonality, cancellations, satisfaction } = analysis;
  return (
    <Panel
      title="Laboratório analítico"
      subtitle="Três perguntas de negócio · evidências sintéticas, métodos e limites"
    >
      <div className="analysis-tabs" role="group" aria-label="Análises estatísticas">
        {[
          ['seasonality', 'Sazonalidade'],
          ['cancellation', 'Cancelamentos'],
          ['satisfaction', 'Satisfação'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`button ${tab === id ? 'primary' : ''}`}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setDimension('Roteiro');
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'seasonality' && (
        <div data-testid="seasonality-analysis">
          <h3>Existem meses com maior concentração de viagens?</h3>
          <p className="panel-prose">
            Somente meses completos, inclusive zeros, no histórico filtrado. Estatística descritiva
            por mês do calendário; nenhum teste inferencial de sazonalidade.
          </p>
          <SimpleBarChart
            rows={seasonality.months.map((row) => ({
              name: String(row.month).padStart(2, '0'),
              value: row.mean ?? 0,
            }))}
            valueLabel="Média de viajantes"
          />
          <DataTable
            rows={seasonality.months}
            rowKey={(row) => String(row.month)}
            label="Sazonalidade por mês"
            columns={[
              { key: 'month', label: 'Mês', value: (row) => row.month },
              { key: 'n', label: 'Anos observados', value: (row) => row.n },
              ...(['mean', 'median', 'sd', 'min', 'max'] as const).map((key, index) => ({
                key,
                label: ['Média', 'Mediana', 'Desvio padrão', 'Mínimo', 'Máximo'][index],
                value: (row: (typeof seasonality.months)[number]) => row[key],
                render: (row: (typeof seasonality.months)[number]) => number(row[key]),
              })),
            ]}
            onExport={(rows) => exportCsv('t4f-sazonalidade.csv', rows)}
          />
          <p className="analysis-conclusion">{seasonality.conclusion}</p>
          <h3>Distribuição dos volumes mensais</h3>
          <SimpleBarChart
            rows={seasonality.histogram}
            valueLabel="Meses em cada faixa de viajantes"
          />
          <p className="panel-note">
            Distribuição mensal: n={seasonality.distribution.n}, mediana{' '}
            {number(seasonality.distribution.median)}, quartis {number(seasonality.distribution.q1)}
            –{number(seasonality.distribution.q3)}, desvio padrão{' '}
            {number(seasonality.distribution.sd)}. A base pequena e sintética não sustenta
            generalização para a agência real.
          </p>
        </div>
      )}
      {tab !== 'seasonality' && (
        <label className="inline-select analysis-dimension">
          Agrupar por
          <select
            aria-label="Agrupar análise por"
            value={dimension}
            onChange={(event) => setDimension(event.target.value)}
          >
            <option>Roteiro</option>
            {tab === 'cancellation' && <option>Canal</option>}
            <option>Categoria</option>
          </select>
        </label>
      )}
      {tab === 'cancellation' && (
        <div data-testid="cancellation-analysis">
          <h3>Quais roteiros ou canais têm maior taxa de cancelamento?</h3>
          <p className="panel-prose">
            {cancellations.n} reservas históricas; {cancellations.cancelled} canceladas.
            Denominador: todas as reservas do grupo, pela data da viagem. Wilson 95% pressupõe
            ensaios binomiais; dependência entre clientes e comparações múltiplas limitam
            inferência.
          </p>
          <SimpleBarChart
            rows={cancellations.groups
              .filter((row) => row.dimension === dimension)
              .map((row) => ({ name: row.name, value: row.rate }))}
            valueLabel="Cancelamento (%)"
          />
          <DataTable
            rows={cancellations.groups.filter((row) => row.dimension === dimension)}
            rowKey={(row) => row.name}
            label="Taxas e intervalos de cancelamento"
            columns={[
              { key: 'name', label: dimension, value: (row) => row.name },
              { key: 'n', label: 'Reservas', value: (row) => row.n },
              { key: 'cancelled', label: 'Canceladas', value: (row) => row.cancelled },
              {
                key: 'rate',
                label: 'Taxa',
                value: (row) => row.rate,
                render: (row) => percent(row.rate),
              },
              {
                key: 'lower',
                label: 'Wilson inferior',
                value: (row) => row.lower,
                render: (row) => percent(row.lower),
              },
              {
                key: 'upper',
                label: 'Wilson superior',
                value: (row) => row.upper,
                render: (row) => percent(row.upper),
              },
              {
                key: 'sample',
                label: 'Leitura',
                value: (row) => (row.lowSample ? 'Amostra baixa' : 'Descritiva'),
              },
            ]}
            onExport={(rows) => exportCsv('t4f-cancelamentos-estatistica.csv', rows)}
          />
          <p className="analysis-conclusion">{cancellations.conclusion}</p>
        </div>
      )}
      {tab === 'satisfaction' && (
        <div data-testid="satisfaction-analysis">
          <h3>A experiência varia por roteiro ou hospedagem?</h3>
          <p className="panel-prose">
            {satisfaction.n} respostas históricas até o corte. NPS = promotores (9–10) menos
            detratores (0–6), em %. Bootstrap exploratório de 500 reamostragens por cliente, quantis
            10/90; mínimo de 12 respostas e 8 clientes. Ausência de faixa significa amostra
            insuficiente.
          </p>
          <SimpleBarChart
            rows={satisfaction.groups
              .filter((row) => row.dimension === dimension)
              .map((row) => ({ name: row.name, value: row.nps }))}
            valueLabel="NPS"
          />
          <DataTable
            rows={satisfaction.groups.filter((row) => row.dimension === dimension)}
            rowKey={(row) => row.name}
            label="Satisfação e dispersão por grupo"
            columns={[
              { key: 'name', label: dimension, value: (row) => row.name },
              { key: 'n', label: 'Respostas', value: (row) => row.n },
              {
                key: 'nps',
                label: 'NPS',
                value: (row) => row.nps,
                render: (row) => number(row.nps),
              },
              {
                key: 'notes',
                label: 'Nota média / DP',
                value: (row) => `${number(row.scores.mean)} / ${number(row.scores.sd)}`,
              },
              {
                key: 'service',
                label: 'Atendimento',
                value: (row) => row.service.mean,
                render: (row) => number(row.service.mean),
              },
              {
                key: 'accommodation',
                label: 'Hospedagem',
                value: (row) => row.accommodation.mean,
                render: (row) => number(row.accommodation.mean),
              },
              {
                key: 'logistics',
                label: 'Logística',
                value: (row) => row.logistics.mean,
                render: (row) => number(row.logistics.mean),
              },
              {
                key: 'bootstrap',
                label: 'Faixa exploratória NPS',
                value: (row) =>
                  row.bootstrap
                    ? `${number(row.bootstrap.lower)} a ${number(row.bootstrap.upper)} · ${row.bootstrap.clusters} clientes`
                    : 'Amostra insuficiente',
              },
            ]}
            onExport={(rows) => exportCsv('t4f-satisfacao-estatistica.csv', rows)}
          />
          <SimpleBarChart
            rows={satisfaction.distribution.map((row) => ({
              name: String(row.score),
              value: row.count,
            }))}
            valueLabel="Respostas por nota NPS"
          />
          <p className="analysis-conclusion">{satisfaction.conclusion}</p>
          <p className="panel-note">
            Não há teste de superioridade, ajuste para perfil dos viajantes ou garantia de
            representatividade. Distribuição por nota acima; notas dimensionais e dispersão são
            exibidas na tabela.
          </p>
        </div>
      )}
    </Panel>
  );
}
