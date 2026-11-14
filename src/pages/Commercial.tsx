import { useState } from 'react';
import { PageHeading } from '../components/layout';
import { DataTable, Empty, Panel } from '../components/ui';
import { OperationalRoutePanel } from '../components/operational-route';
import { exportCsv } from '../lib/csv';
import {
  accommodationReferences,
  commercialCategories,
  commercialRoutes,
  commercialSource,
} from '../lib/commercial/catalog';
import {
  calculateQuote,
  euro,
  type ManualLodgingCost,
  type QuoteSelection,
} from '../lib/commercial/quote';

function CostEditor({
  costs,
  onChange,
}: {
  costs: ManualLodgingCost[];
  onChange: (costs: ManualLodgingCost[]) => void;
}) {
  const update = (id: string, field: keyof ManualLodgingCost, value: string) =>
    onChange(costs.map((cost) => (cost.id === id ? { ...cost, [field]: value } : cost)));
  return (
    <div className="space-y-4">
      {costs.map((cost, index) => (
        <fieldset key={cost.id} className="rounded-lg border border-slate-200 p-4">
          <legend>Hospedagem {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              Cidade
              <input
                className="w-full"
                maxLength={120}
                aria-label={`Cidade ${index + 1}`}
                value={cost.city}
                onChange={(e) => update(cost.id, 'city', e.target.value)}
              />
            </label>
            <label>
              Etapa
              <input
                className="w-full"
                maxLength={120}
                aria-label={`Etapa ${index + 1}`}
                value={cost.stage}
                onChange={(e) => update(cost.id, 'stage', e.target.value)}
              />
            </label>
            <label>
              Custo total (EUR)
              <input
                className="w-full"
                inputMode="decimal"
                placeholder="0,00"
                maxLength={11}
                aria-label={`Custo EUR ${index + 1}`}
                value={cost.amount}
                onChange={(e) => update(cost.id, 'amount', e.target.value)}
              />
            </label>
            <button
              type="button"
              className="button self-end"
              aria-label={`Remover hospedagem ${index + 1}`}
              onClick={() => onChange(costs.filter((entry) => entry.id !== cost.id))}
            >
              Remover
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="button"
        disabled={costs.length >= 200}
        onClick={() =>
          onChange([...costs, { id: crypto.randomUUID(), city: '', stage: '', amount: '' }])
        }
      >
        Adicionar hospedagem
      </button>
    </div>
  );
}

function Catalog() {
  return (
    <Panel
      title="Catálogo comercial 2027"
      subtitle="Caminhadas autoguiadas · valores por pessoa · EUR · maio, junho, setembro e outubro"
    >
      <DataTable
        label="Preços comerciais 2027"
        rows={[...commercialRoutes]}
        rowKey={(entry) => entry.id}
        columns={[
          { key: 'way', label: 'Caminho', value: (entry) => entry.way },
          { key: 'start', label: 'Partida autorizada', value: (entry) => entry.start },
          { key: 'variant', label: 'Variante', value: (entry) => entry.variant ?? 'Não informada' },
          ...(['Superior', 'Standard'] as const).flatMap((category) =>
            ([0, 1] as const).map((index) => ({
              key: `${category}-${index}`,
              label: `${category} ${index === 0 ? 'individual' : 'duplo'}`,
              value: (entry: (typeof commercialRoutes)[number]) =>
                entry.rates?.[category][index] ?? -1,
              render: (entry: (typeof commercialRoutes)[number]) =>
                euro(entry.rates ? entry.rates[category][index] * 100 : null),
            })),
          ),
        ]}
      />
      <p className="mt-4">
        Econômico: Preço não informado em todos os roteiros. A linha comercial “Tui/Valença/Baiona”
        é referência para Tui/Valença; Baiona não foi adicionada como partida autorizada.
      </p>
    </Panel>
  );
}

function QuoteForm() {
  const [way, setWay] = useState('Francês');
  const [selection, setSelection] = useState<QuoteSelection>({
    routeId: 'sarria',
    startDate: '',
    category: 'Standard',
    occupancy: 'individual',
    travelers: 1,
  });
  const [costs, setCosts] = useState<ManualLodgingCost[]>([]);
  const [complete, setComplete] = useState(false);
  const quote = calculateQuote(selection, costs, complete);
  const change = (patch: Partial<QuoteSelection>) => {
    setSelection({ ...selection, ...patch });
    setComplete(false);
  };
  const changeWay = (value: string) => {
    setWay(value);
    change({ routeId: commercialRoutes.find((entry) => entry.way === value)!.id });
    setCosts([]);
  };
  return (
    <Panel
      title="Orçamento demonstrativo"
      subtitle="Preliminar, sem reserva ou compromisso comercial. Valores por pessoa; informe a quantidade total de pessoas."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label>
          Caminho
          <select
            aria-label="Caminho"
            className="w-full"
            value={way}
            onChange={(e) => changeWay(e.target.value)}
          >
            <option>Francês</option>
            <option>Português</option>
          </select>
        </label>
        <label>
          Ponto de partida
          <select
            aria-label="Ponto de partida"
            className="w-full"
            value={selection.routeId}
            onChange={(e) => {
              change({ routeId: e.target.value });
              setCosts([]);
            }}
          >
            {commercialRoutes
              .filter((entry) => entry.way === way)
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.start}
                </option>
              ))}
          </select>
        </label>
        <label>
          Data de início
          <input
            className="w-full"
            type="date"
            min="2027-01-01"
            max="2027-12-31"
            value={selection.startDate}
            onChange={(e) => change({ startDate: e.target.value })}
          />
        </label>
        <label>
          Categoria comercial
          <select
            className="w-full"
            value={selection.category}
            aria-label="Categoria comercial"
            onChange={(e) => change({ category: e.target.value as QuoteSelection['category'] })}
          >
            {commercialCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Ocupação
          <select
            className="w-full"
            value={selection.occupancy}
            aria-label="Ocupação"
            onChange={(e) => change({ occupancy: e.target.value as QuoteSelection['occupancy'] })}
          >
            <option value="individual">Individual</option>
            <option value="duplo">Dupla</option>
          </select>
        </label>
        <label>
          Pessoas
          <input
            className="w-full"
            type="number"
            min={1}
            max={100}
            step={1}
            value={selection.travelers || ''}
            onChange={(e) => change({ travelers: e.target.valueAsNumber })}
          />
        </label>
      </div>
      <p className="my-4">
        Custos manuais em EUR para o grupo inteiro, considerando todas as noites de cada item. São
        valores informados pelo usuário, sem consulta automática de preços. Ocupação dupla usa
        tarifa por pessoa em quarto compartilhado.
      </p>
      <CostEditor
        costs={costs}
        onChange={(next) => {
          setCosts(next);
          setComplete(false);
        }}
      />
      <label className="my-4 flex items-start gap-2">
        <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} />
        Conferi e informei todos os custos de hospedagem desta viagem.
      </label>
      <QuoteSummary selection={selection} costs={costs} quote={quote} />
      <div className="mt-6">
        <OperationalRoutePanel routeId={selection.routeId} />
      </div>
    </Panel>
  );
}

function QuoteSummary({
  selection,
  costs,
  quote,
}: {
  selection: QuoteSelection;
  costs: ManualLodgingCost[];
  quote: ReturnType<typeof calculateQuote>;
}) {
  return (
    <div className="space-y-4" aria-live="polite">
      <h3>{quote.status}</h3>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt>Venda por pessoa</dt>
          <dd>{euro(quote.unitSaleCents)}</dd>
        </div>
        <div>
          <dt>Valor total de venda</dt>
          <dd data-testid="commercial-sale">{euro(quote.totalSaleCents)}</dd>
        </div>
        <div>
          <dt>Custos registrados (usuário)</dt>
          <dd>
            {euro(quote.lodgingCents)} · {costs.length} itens · soma dos valores válidos
          </dd>
        </div>
        <div>
          <dt>Resultado parcial</dt>
          <dd data-testid="commercial-result">
            {quote.partialResultCents === null
              ? 'Aguardando dados completos'
              : `${euro(quote.partialResultCents)} (${quote.partialPercent!.toFixed(2)}%)`}
          </dd>
        </div>
      </dl>
      {quote.issues.length > 0 && (
        <ul className="list-disc pl-5">
          {quote.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
      <p>
        Resultado parcial = venda total − hospedagens informadas. Percentual sobre a venda. Outros
        custos diretos e despesas podem existir; este resultado não representa lucro apurado.
      </p>
      <button
        type="button"
        className="button primary"
        disabled={quote.status !== 'Orçamento preliminar'}
        onClick={() =>
          exportCsv('t4f-orcamento-preliminar-eur.csv', [
            {
              tipo: 'Orçamento preliminar — demonstrativo',
              id: '',
              city: '',
              stage: '',
              amount: '',
              moeda: 'EUR',
              ...selection,
              ...quote,
              fonte: commercialSource.document,
              origem: commercialSource.provenance,
              referencia: commercialSource.referenceYear,
              registro: commercialSource.recordedAt,
              unidade: 'Valores monetários em centavos de EUR',
              custos:
                'Manuais, informados e conferidos pelo usuário; outros custos e despesas não incluídos',
            },
            ...costs.map((cost) => ({
              tipo: 'Custo manual de hospedagem',
              ...cost,
              moeda: 'EUR',
              unidade: 'Valor informado em euros',
            })),
          ])
        }
      >
        Exportar orçamento preliminar
      </button>
      <p>Rascunho mantido apenas nesta página; sair ou recarregar descarta os valores.</p>
    </div>
  );
}

export default function Commercial() {
  return (
    <>
      <PageHeading
        eyebrow="CATÁLOGO DOCUMENTAL · EUR"
        title="Catálogo e orçamento"
        description="Referência comercial de 2027 e orçamento preliminar independentes dos indicadores históricos em BRL. Os filtros dos dashboards não se aplicam a este módulo."
      />
      <div className="notice">
        Fonte: {commercialSource.document} · referência 2027 · registro 14/11/2026.{' '}
        {commercialSource.provenance}. Nenhuma disponibilidade ou parceria comercial verificada.
      </div>
      <Catalog />
      <QuoteForm />
      <Panel
        title="Hospedagens de referência"
        subtitle="Estrutura por cidade, etapa e categoria comercial: Econômico, Standard e Superior."
      >
        {accommodationReferences.length === 0 && (
          <Empty message="Importação pendente: planilhas de etapas dos Caminhos Francês e Português não disponíveis. Nenhuma hospedagem foi inventada. Futuras importações terão o status Sugestão de referência — não verificada." />
        )}
      </Panel>
      <Panel title="Fontes e decisões pendentes">
        <p>
          Documento acadêmico principal: Projeto_Integrador_5_-_2026_2 1.docx, versão 2.2, ainda não
          disponível para conferência. T4F.txt, basic promt.txt, as duas planilhas de etapas e o PDF
          comercial original também estão pendentes. Quatro PDFs operacionais foram conferidos nesta
          implementação.
        </p>
        <p className="mt-3">
          Dias, distâncias e etapas operacionais de Astorga, Sarria, Porto Central e Porto Costa
          estão disponíveis acima, conforme o ponto de partida selecionado no orçamento. SJPP,
          Lisboa e Tui/Valença continuam com cadastro pendente. A comparação com o pacote comercial
          aguarda o PDF de 2027; nenhuma equivalência foi forçada.
        </p>
      </Panel>
    </>
  );
}
