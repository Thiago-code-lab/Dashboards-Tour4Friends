import { useState } from 'react';
import { potentialDemand } from '../lib/market-demand';
import { Panel } from './ui';

export function MarketScenario() {
  const [brazilians, setBrazilians] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [source, setSource] = useState('');
  const [scope, setScope] = useState('Francês e Português');
  const result =
    brazilians.trim() === ''
      ? null
      : potentialDemand({ brazilianPilgrims: Number(brazilians), start, end, source, scope });
  return (
    <Panel
      title="Público brasileiro e premissa de captura de 0,5%"
      subtitle="Cenário comercial separado da previsão da carteira sintética. Não representa market share conquistado."
    >
      <p className="mb-5">
        Fonte de referência:{' '}
        <a
          className="underline"
          href="https://oficinadelperegrino.com/estadisticas-2/"
          target="_blank"
          rel="noreferrer"
        >
          Oficina del Peregrino
        </a>
        . A série brasileira de 2025/2026 não foi importada. Informe um recorte conferido para
        simular; entradas manuais não se tornam dados oficiais pelo uso deste formulário.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label>
          Brasileiros considerados / projetados
          <input
            aria-label="Brasileiros considerados"
            className="w-full"
            type="number"
            min="0"
            max="100000000"
            value={brazilians}
            onChange={(event) => setBrazilians(event.target.value)}
          />
        </label>
        <label>
          Início do período
          <input
            aria-label="Início do recorte brasileiro"
            className="w-full"
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          Fim do período
          <input
            aria-label="Fim do recorte brasileiro"
            className="w-full"
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <label>
          Recorte de caminhos
          <select
            aria-label="Recorte de caminhos brasileiros"
            className="w-full"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
            <option>Francês e Português</option>
            <option>Todos os caminhos; recorte indisponível</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          Origem, filtros e método da projeção
          <input
            aria-label="Origem do recorte brasileiro"
            className="w-full"
            value={source}
            maxLength={500}
            onChange={(event) => setSource(event.target.value)}
          />
        </label>
      </div>
      <div className="notice mt-5" role="status">
        Demanda potencial T4F = brasileiros considerados × 0,005:{' '}
        <strong>
          {result == null
            ? 'Preencha quantidade, período e origem válidos'
            : `${result.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} pessoas no cenário`}
        </strong>
      </div>
      <p className="mt-4 text-sm">
        0,5% é uma meta comercial. Não é previsão estatística validada. A fração representa valor
        esperado, sem arredondamento para reservas. Um recorte parcial não deve ser comparado a um
        ano completo; a projeção requer método próprio documentado. Registros de peregrinos da
        Oficina não comprovam procura por pacotes T4F.
      </p>
    </Panel>
  );
}
