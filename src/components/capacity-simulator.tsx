import { useMemo, useState } from 'react';
import { useAnalysis } from '../app/context';
import type { ForecastResult } from '../lib/forecasting/models';
import { capacityPlan, concreteCapacity } from '../lib/forecasting/capacity';
import { monthLabel, number } from '../lib/format';
import { DataTable, Panel } from './ui';
import { exportCsv } from '../lib/csv';

export function CapacitySimulator({
  forecast,
  scenario,
  setScenario,
}: {
  forecast: ForecastResult;
  scenario: number;
  setScenario: (value: number) => void;
}) {
  const { data, filters } = useAnalysis();
  const [extra, setExtra] = useState(0);
  const [contracted, setContracted] = useState(0);
  const [shortagesOnly, setShortagesOnly] = useState(true);
  const plan = useMemo(
    () =>
      capacityPlan(data, filters, forecast.predictions, scenario, {
        extraPerDeparture: extra,
        contractedPercent: contracted,
      }),
    [data, filters, forecast.predictions, scenario, extra, contracted],
  );
  const slots = useMemo(
    () =>
      concreteCapacity(
        data,
        filters,
        forecast.predictions.map((point) => point.month),
        contracted,
      ),
    [data, filters, forecast.predictions, contracted],
  );
  const shortageNights = slots.reduce((sum, slot) => sum + slot.shortage, 0);
  const additional = plan.reduce((sum, row) => sum + row.additionalTravelers, 0);
  return (
    <Panel
      title="Planejamento de capacidade"
      subtitle="Simulação mensal de demanda e verificação dos compromissos por data/etapa"
    >
      <div className="simulation-grid">
        <label>
          Variação da demanda:{' '}
          <strong>
            {scenario > 0 ? '+' : ''}
            {scenario}%
          </strong>
          <input
            type="range"
            aria-label="Variação do cenário"
            min={-30}
            max={30}
            step={5}
            value={scenario}
            onChange={(event) => setScenario(Number(event.target.value))}
          />
        </label>
        <label>
          Vagas extras por saída
          <select
            aria-label="Vagas extras por saída"
            value={extra}
            onChange={(event) => setExtra(Number(event.target.value))}
          >
            {[0, 2, 5, 10].map((value) => (
              <option key={value} value={value}>
                {value} vagas de grupo
              </option>
            ))}
          </select>
        </label>
        <label>
          Capacidade contratada simulada
          <select
            aria-label="Alteração de capacidade contratada"
            value={contracted}
            onChange={(event) => setContracted(Number(event.target.value))}
          >
            {[-30, -15, 0, 15, 30].map((value) => (
              <option key={value} value={value}>
                {value > 0 ? '+' : ''}
                {value}% dos slots contratados
              </option>
            ))}
          </select>
        </label>
        <button className="button small" onClick={() => setScenario(10)}>
          Simular +10%
        </button>
      </div>
      <p className="analysis-conclusion" data-testid="capacity-scenario-result">
        Cenário {scenario > 0 ? '+' : ''}
        {scenario}%: {additional >= 0 ? '+' : ''}
        {number(additional)} viajantes a planejar frente à base; {number(shortageNights)}{' '}
        vagas-noite de insuficiência nos compromissos concretos após a simulação contratual. Nenhuma
        alteração é gravada.
      </p>
      <DataTable
        rows={plan}
        rowKey={(row) => row.month}
        label="Meses projetados"
        columns={[
          {
            key: 'month',
            label: 'Mês',
            value: (row) => row.month,
            render: (row) => monthLabel(row.month),
          },
          {
            key: 'predicted',
            label: 'Previsão base',
            value: (row) => row.predicted,
            render: (row) => number(row.predicted),
          },
          {
            key: 'simulated',
            label: 'Cenário',
            value: (row) => row.simulated,
            render: (row) => number(row.simulated),
          },
          { key: 'committed', label: 'Confirmados', value: (row) => row.committed },
          { key: 'beds', label: 'Viajantes a planejar', value: (row) => row.beds },
          {
            key: 'scheduled',
            label: 'Cap. saída base / cenário',
            value: (row) => row.simulatedCapacity,
            render: (row) => `${row.scheduledCapacity} / ${row.simulatedCapacity}`,
          },
          { key: 'gap', label: 'Além das saídas', value: (row) => row.scheduledGap },
          {
            key: 'nights',
            label: 'Vagas-noite contratadas',
            value: (row) => row.contractedBedNights,
          },
        ]}
        onExport={(rows) => exportCsv('t4f-previsao.csv', rows)}
      />
      <p className="panel-note">
        Máximo entre previsão simulada arredondada para cima e confirmados. Viajantes/mês e
        vagas-noite têm unidades diferentes: não são subtraídos. Capacidade das saídas é
        compartilhada entre categorias; não representa reserva por categoria. Sem calendário futuro,
        “além das saídas” indica necessidade de programar viagens. A projeção não aloca hóspedes em
        hotéis. A soma de modelos individuais pode diferir do modelo agregado; não há reconciliação
        hierárquica.
      </p>
      <h3 className="admin-subtitle">Compromissos concretos por data e etapa</h3>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={shortagesOnly}
          onChange={(event) => setShortagesOnly(event.target.checked)}
        />{' '}
        Mostrar somente insuficiências
      </label>
      <DataTable
        rows={slots.filter((slot) => !shortagesOnly || slot.shortage > 0)}
        rowKey={(row) => row.id}
        label="Capacidade por data e etapa"
        columns={[
          {
            key: 'departure',
            label: 'Saída / data',
            value: (row) => row.date,
            render: (row) => `${row.departureId} · ${row.date}`,
          },
          {
            key: 'stage',
            label: 'Etapa / categoria',
            value: (row) => `${row.stage} · ${row.category}`,
          },
          { key: 'committed', label: 'Confirmados', value: (row) => row.committed },
          { key: 'contracted', label: 'Contratadas', value: (row) => row.contracted },
          { key: 'simulated', label: 'Cap. simulada', value: (row) => row.simulated },
          { key: 'shortage', label: 'Insuficiência', value: (row) => row.shortage },
          {
            key: 'confirmed',
            label: 'Contrato',
            value: (row) => (row.confirmed ? 'Confirmado' : 'Pendente de negociação'),
          },
        ]}
        onExport={(rows) => exportCsv('t4f-capacidade-etapas.csv', rows)}
      />
      <p className="panel-note">
        Um slot sem contrato confirmado contribui com zero vagas contratadas. Somente reservas
        futuras confirmadas são verificadas por data/etapa. Vagas extras na saída não aumentam
        automaticamente hospedagens; negociar os slots continua sendo uma decisão operacional.
      </p>
    </Panel>
  );
}
