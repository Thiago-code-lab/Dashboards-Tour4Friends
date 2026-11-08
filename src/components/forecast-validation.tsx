import { useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ForecastResult } from '../lib/forecasting/models';
import { number, monthLabel, percent } from '../lib/format';
import { Badge, DataTable, Panel, Empty } from './ui';
import { exportCsv } from '../lib/csv';

export function ForecastValidation({ forecast }: { forecast: ForecastResult }) {
  const [horizon, setHorizon] = useState(3);
  const [origin, setOrigin] = useState('');
  const scores = forecast.validation.filter((score) => score.horizon === horizon);
  const windows = forecast.windows.filter(
    (window) => window.horizon === horizon && window.modelId === forecast.selectedId,
  );
  const window = windows.find((row) => row.origin === origin) ?? windows.at(-1);
  const selectedScore = scores.find((score) => score.modelId === forecast.selectedId);
  const finalScore = forecast.metrics.find((score) => score.modelId === forecast.selectedId);
  return (
    <Panel
      title="Validação temporal"
      subtitle="Seleção por origens expansivas; teste final separado quando elegível"
    >
      <div className="method-summary">
        <Badge tone="blue">{forecast.selected ?? 'Sem estimativa'}</Badge>
        <p>{forecast.reason}</p>
      </div>
      <div className="local-filters">
        <label>
          Comparar horizonte
          <select
            aria-label="Horizonte da validação"
            value={horizon}
            onChange={(event) => setHorizon(Number(event.target.value))}
          >
            {[1, 3, 6].map((value) => (
              <option value={value} key={value}>
                {value} {value === 1 ? 'mês' : 'meses'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Origem da previsão
          <select
            aria-label="Origem da validação"
            value={window?.origin ?? ''}
            onChange={(event) => setOrigin(event.target.value)}
            disabled={!window}
          >
            {windows.map((row) => (
              <option key={row.origin} value={row.origin}>
                {monthLabel(row.origin)} · treino n={row.trainingSize}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DataTable
        rows={scores}
        rowKey={(row) => row.modelId}
        label="Comparação de modelos na validação"
        columns={[
          { key: 'model', label: 'Modelo', value: (row) => row.model },
          { key: 'mae', label: 'MAE', value: (row) => row.mae, render: (row) => number(row.mae) },
          {
            key: 'rmse',
            label: 'RMSE',
            value: (row) => row.rmse,
            render: (row) => number(row.rmse),
          },
          {
            key: 'bias',
            label: 'Viés',
            value: (row) => row.bias,
            render: (row) => number(row.bias),
          },
          {
            key: 'wape',
            label: 'WAPE',
            value: (row) => row.wape,
            render: (row) => percent(row.wape),
          },
          { key: 'windows', label: 'Origens', value: (row) => row.windows },
          { key: 'count', label: 'Pares', value: (row) => row.count },
        ]}
        onExport={(rows) => exportCsv('t4f-validacao-modelos.csv', rows)}
      />
      <p className="panel-note">
        Seleção fixa em H=3; mudar esta comparação não escolhe outro modelo. Origens sobrepostas não
        são amostras independentes. Viés = previsto − observado: positivo indica superestimação.
        WAPE fica ausente com demanda total zero.
      </p>
      {window ? (
        <>
          <p className="analysis-kicker">
            Origem {monthLabel(window.origin)} · {window.trainingSize} meses de treino · próximos{' '}
            {horizon} meses · {window.model}
          </p>
          <div
            className="chart validation-chart"
            role="img"
            aria-label="Observado e previsto em uma única origem de validação"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={window.pairs} margin={{ left: -20, right: 15, top: 20 }}>
                <CartesianGrid stroke="#e9edf2" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(value) => monthLabel(String(value))}
                  formatter={(value, name) => [
                    number(Number(value)),
                    name === 'observed' ? 'Observado' : 'Previsto na origem',
                  ]}
                />
                <Line
                  dataKey="observed"
                  stroke="#8FA6DE"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="predicted"
                  stroke="#4A4A4A"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                {window.pairs
                  .filter(
                    (pair) =>
                      selectedScore &&
                      Math.abs(pair.predicted - pair.observed) > 2 * selectedScore.mae,
                  )
                  .map((pair) => (
                    <ReferenceDot
                      key={pair.month}
                      x={pair.month}
                      y={pair.observed}
                      r={5}
                      fill="#F29A1F"
                      stroke="white"
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="panel-note">
            Azul: observado. Cinza: previsão emitida nesta origem. Laranja: erro absoluto acima de
            duas vezes o MAE de validação; destaque diagnóstico, sem classificação de causa.
          </p>
        </>
      ) : (
        <Empty message="Faltam origens comuns para comparar este horizonte." />
      )}
      <div className="evaluation-summary" data-testid="final-evaluation">
        <h3>Teste final independente da seleção</h3>
        {finalScore ? (
          <p>
            {monthLabel(forecast.testStart!)} a {monthLabel(forecast.backtest.at(-1)!.month)} ·{' '}
            {finalScore.count} meses: MAE <strong>{number(finalScore.mae)}</strong>, RMSE{' '}
            {number(finalScore.rmse)}, viés {number(finalScore.bias)}, WAPE{' '}
            {percent(finalScore.wape)}.{' '}
            {finalScore.bias > 0
              ? 'Houve superestimação média.'
              : finalScore.bias < 0
                ? 'Houve subestimação média.'
                : 'O erro médio com sinal foi zero.'}{' '}
            Apenas seis pontos: a estimativa é instável.
          </p>
        ) : (
          <p>
            Histórico insuficiente para seleção e avaliação final separadas. Nenhuma métrica
            independente é apresentada.
          </p>
        )}
        <p>
          Comparação sazonal nas mesmas origens H=3:{' '}
          {forecast.baselineImprovement === null
            ? 'sem denominador válido.'
            : `${percent(forecast.baselineImprovement)} de redução do MAE (valor negativo indica piora).`}
        </p>
      </div>
      <details className="analysis-details">
        <summary>Ver meses finais e metadados do cálculo</summary>
        <DataTable
          rows={forecast.backtest}
          rowKey={(row) => row.month}
          label="Meses do teste final"
          columns={[
            { key: 'month', label: 'Mês', value: (row) => row.month },
            { key: 'observed', label: 'Observado', value: (row) => row.observed },
            {
              key: 'selected',
              label: 'Selecionado',
              value: (row) => row.selected,
              render: (row) => number(row.selected),
            },
            {
              key: 'baseline',
              label: 'Sazonal',
              value: (row) => row.baseline,
              render: (row) => number(row.baseline),
            },
            {
              key: 'ridge',
              label: 'Ridge',
              value: (row) => row.ridge,
              render: (row) => number(row.ridge),
            },
          ]}
        />
        <pre className="metadata-block">{JSON.stringify(forecast.metadata, null, 2)}</pre>
      </details>
    </Panel>
  );
}
