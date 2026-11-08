import { useState } from 'react';
import type { StatisticalAnomaly } from '../lib/analytics/anomalies';
import { Badge, DataTable, Panel } from './ui';
import { number, dateLabel } from '../lib/format';
import { exportCsv } from '../lib/csv';

export function AnomalyPanel({ anomalies }: { anomalies: StatisticalAnomaly[] }) {
  const [indicator, setIndicator] = useState('all');
  const rows = anomalies.filter((row) => indicator === 'all' || row.indicator === indicator);
  return (
    <Panel
      title="Anomalias estatísticas"
      subtitle="Ocorrências investigáveis, separadas das violações de regras operacionais"
    >
      <p className="panel-prose">
        {anomalies.length} valores incomuns no recorte. MAD modificado &gt; 3,5 em módulo, mínimo de
        seis pares comparáveis; demanda usa somente previsões e erros anteriores. Grupos pequenos ou
        sem dispersão não são classificados. Nenhum achado estatístico recebe gravidade crítica
        automaticamente.
      </p>
      <label className="inline-select analysis-dimension">
        Indicador
        <select
          aria-label="Indicador da anomalia"
          value={indicator}
          onChange={(event) => setIndicator(event.target.value)}
        >
          <option value="all">Todos os indicadores</option>
          {[...new Set(anomalies.map((row) => row.indicator))].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        label="Ocorrências estatisticamente incomuns"
        columns={[
          {
            key: 'scope',
            label: 'Indicador / escopo',
            value: (row) => row.scope,
            render: (row) => (
              <>
                <strong>{row.indicator}</strong>
                <small className="block">
                  {row.scope} · {dateLabel(row.date)}
                </small>
              </>
            ),
          },
          {
            key: 'observed',
            label: 'Observado / referência',
            value: (row) => row.observed,
            render: (row) => (
              <>
                {number(row.observed)} / {number(row.reference)}
                <small className="block">{row.unit}</small>
              </>
            ),
          },
          {
            key: 'sample',
            label: 'Método / amostra',
            value: (row) => row.sample,
            render: (row) => (
              <>
                {row.method}
                <small className="block">
                  n={row.sample} · intensidade {number(row.intensity)}
                </small>
              </>
            ),
          },
          {
            key: 'explanation',
            label: 'O que investigar',
            value: (row) => row.explanation,
            render: (row) => (
              <details>
                <summary>
                  <Badge tone="orange">Atenção exploratória</Badge>
                </summary>
                <p>{row.explanation}</p>
                <p>{row.investigation}</p>
              </details>
            ),
          },
        ]}
        onExport={(exported) => exportCsv('t4f-anomalias.csv', exported)}
      />
      {!rows.length && (
        <p className="panel-note">
          Nenhum valor ultrapassa os critérios com amostra e dispersão adequadas. Isso não comprova
          ausência de problemas operacionais.
        </p>
      )}
    </Panel>
  );
}
