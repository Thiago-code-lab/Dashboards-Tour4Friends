import { useRef, useState } from 'react';
import { Clock3, Filter, Ticket, TrendingUp, Upload } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { PageHeading, GlobalFilters } from '../components/layout';
import { Badge, DataTable, Kpi, Panel, Progress } from '../components/ui';
import { SimpleBarChart } from '../components/charts';
import { compactMoney, dateLabel, money, number, percent } from '../lib/format';
import { conversionRate } from '../lib/analytics/metrics';
import { exportCsv, importBookingsCsv } from '../lib/csv';
import { Management } from '../components/management';
import { Dialog } from '../components/dialog';
import type { ImportValidation } from '../types/api';
const statusLabels = { confirmed: 'Confirmada', pending: 'Pendente', cancelled: 'Cancelada' };

export default function Reservations() {
  const {
    data,
    view,
    replaceData,
    restoreData,
    imported,
    mode,
    canImport,
    validateImport,
    commitImport,
    saving,
  } = useAnalysis();
  const [batch, setBatch] = useState<ImportValidation | null>(null);
  const [status, setStatus] = useState('all');
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = view.bookingRows.filter((b) => status === 'all' || b.status === status);
  const channels = [...new Set(view.leads.map((l) => l.channel))].map((channel) => {
    const leads = view.leads.filter((l) => l.channel === channel);
    return {
      name: channel,
      value: leads.length,
      conversion: conversionRate(
        leads.map((l) => l.id),
        data.bookings,
      ),
    };
  });
  const leadIds = new Set(view.leads.map((l) => l.id));
  const linked = data.bookings.filter((b) => leadIds.has(b.leadId));
  const stages = [
    { name: 'Contatos', value: view.leads.length },
    {
      name: 'Qualificados ou além',
      value:
        view.leads.filter((l) => ['qualified', 'proposal', 'won'].includes(l.stage)).length +
        view.leads.filter((l) => l.stage === 'lost' && linked.some((b) => b.leadId === l.id))
          .length,
    },
    {
      name: 'Propostas ou além',
      value:
        view.leads.filter((l) => ['proposal', 'won'].includes(l.stage)).length +
        linked.filter((b) => b.status === 'cancelled').length,
    },
    { name: 'Confirmadas', value: linked.filter((b) => b.status === 'confirmed').length },
  ];
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('O arquivo deve ter até 1 MB.');
      if (mode === 'api') {
        setBatch(await validateImport(file));
        setFailed(false);
        setNotice('Lote validado pelo servidor. Confirme para gravar na base sintética.');
        return;
      }
      const next = importBookingsCsv(await file.text(), data);
      replaceData(next);
      setFailed(false);
      setNotice('Importação validada. Todos os indicadores foram recalculados em memória.');
    } catch (error) {
      setFailed(true);
      setNotice(error instanceof Error ? error.message : 'Falha ao importar o arquivo.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="RELACIONAMENTOS QUE VIRAM JORNADAS"
        title="Reservas e comercial"
        description="Acompanhe cada oportunidade, do primeiro contato à confirmação da viagem."
        action={
          <button
            className="button"
            disabled={!canImport || saving}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={15} /> {mode === 'api' ? 'Importar CSV no banco' : 'Importar CSV local'}
          </button>
        }
      />
      <input
        hidden
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Arquivo CSV de reservas"
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      <GlobalFilters />
      <Management resource="bookings" />
      {batch && (
        <Dialog title="Confirmar importação" busy={saving} onClose={() => setBatch(null)}>
          <p className="panel-prose">
            {batch.rows} reservas validadas. O lote será gravado em uma única transação, com
            auditoria e proteção contra duplicação. Nenhum registro foi alterado ainda.
          </p>
          <button
            className="button primary"
            disabled={saving}
            onClick={async () => {
              try {
                await commitImport(batch);
                setBatch(null);
                setNotice('Importação persistida no PostgreSQL.');
              } catch (err) {
                setFailed(true);
                setNotice(err instanceof Error ? err.message : 'A importação não foi concluída.');
              }
            }}
          >
            Confirmar importação no PostgreSQL
          </button>
        </Dialog>
      )}
      <div className="module-toolbar">
        <span className="muted text-xs">
          {mode === 'demo' ? 'Importação em memória' : 'Importação administrativa transacional'} ·
          somente dados demonstrativos
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            className="button small"
            disabled={!view.bookings.length}
            onClick={() => exportCsv('t4f-reservas-modelo-importacao.csv', view.bookings)}
          >
            Baixar modelo com reservas do recorte
          </button>
          {imported && (
            <button className="button small" onClick={restoreData}>
              Recarregar base original
            </button>
          )}
        </div>
      </div>
      {notice && (
        <div
          className={`notice ${failed ? 'error-notice' : ''}`}
          role={failed ? 'alert' : 'status'}
        >
          {notice}
        </div>
      )}
      <div className="kpi-grid">
        <Kpi
          label="Reservas no período"
          value={number(view.bookings.length)}
          detail={`${view.confirmed.length} confirmadas · ${view.bookings.filter((b) => b.status === 'pending').length} pendentes`}
          icon={Ticket}
          help="Reservas selecionadas pela data da viagem, incluindo todos os status."
        />
        <Kpi
          label="Conversão dos leads"
          value={percent(view.conversion)}
          detail={`${view.leads.length} leads no período de contato`}
          icon={TrendingUp}
          help="Leads criados no período com reserva confirmada vinculada / total de leads criados no período. Coorte por contato, independentemente da data da viagem."
        />
        <Kpi
          label="Pipeline potencial"
          value={compactMoney(view.pipeline)}
          detail="Oportunidades e reservas pendentes"
          icon={Filter}
          help="Potencial de leads abertos sem reserva ativa mais valor de reservas pendentes, sem contar duas vezes a mesma oportunidade."
        />
        <Kpi
          label="Tempo até fechamento"
          value={view.closingDays == null ? '—' : `${number(view.closingDays)} dias`}
          detail={`${view.confirmed.length} reservas confirmadas`}
          icon={Clock3}
          help="Média de dias entre primeiro contato do lead vinculado e contratação da reserva confirmada selecionada."
        />
      </div>
      <div className="two-column">
        <Panel title="Funil comercial" subtitle="Coorte de leads pela data do primeiro contato">
          <div className="funnel">
            {stages.map((s, i) => (
              <div key={s.name}>
                <span>0{i + 1}</span>
                <div>
                  <div>
                    <strong>{s.name}</strong>
                    <b>{s.value}</b>
                  </div>
                  <Progress
                    value={view.leads.length ? (s.value / view.leads.length) * 100 : 0}
                    tone={i === 3 ? 'green' : 'blue'}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="panel-note">
            Etapas cumulativas inferidas do estágio atual e do vínculo com reserva. Canceladas
            chegaram à proposta; leads perdidos sem reserva não têm passagem histórica inferida.
          </p>
        </Panel>
        <Panel title="Origem dos leads" subtitle="Volume de contatos por canal no período">
          <SimpleBarChart rows={channels} valueLabel="Leads" />
        </Panel>
      </div>
      <div className="two-column">
        <Panel
          title="Conversão por canal"
          subtitle="Somente contatos com vínculo válido para confirmação"
        >
          <DataTable
            rows={channels}
            rowKey={(r) => r.name}
            label="Canais"
            columns={[
              { key: 'name', label: 'Canal', value: (r) => r.name },
              { key: 'value', label: 'Leads', value: (r) => r.value },
              {
                key: 'conversion',
                label: 'Conversão',
                value: (r) => r.conversion,
                render: (r) => percent(r.conversion),
              },
            ]}
          />
        </Panel>
        <Panel title="Reservas por status" subtitle="Coorte pela data da viagem">
          <SimpleBarChart
            rows={Object.entries(statusLabels).map(([key, name]) => ({
              name,
              value: view.bookings.filter((b) => b.status === key).length,
            }))}
            valueLabel="Reservas"
          />
        </Panel>
      </div>
      <Panel
        title="Reservas demonstrativas"
        subtitle="Busca, ordenação e exportação do recorte selecionado"
        action={
          <select
            aria-label="Status das reservas"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        }
      >
        <DataTable
          rows={rows}
          rowKey={(b) => b.id}
          label="Reservas"
          searchText={(b) => `${b.id} ${b.customer} ${b.routeName} ${b.departureId}`}
          columns={[
            {
              key: 'id',
              label: 'Reserva',
              value: (b) => b.id,
              render: (b) => (
                <div>
                  <strong>{b.id}</strong>
                  <small className="block muted">{b.customer}</small>
                </div>
              ),
            },
            { key: 'route', label: 'Roteiro', value: (b) => b.routeName },
            {
              key: 'bookedAt',
              label: 'Contratação',
              value: (b) => b.bookedAt,
              render: (b) => dateLabel(b.bookedAt),
            },
            {
              key: 'travelDate',
              label: 'Viagem',
              value: (b) => b.travelDate,
              render: (b) => dateLabel(b.travelDate),
            },
            { key: 'travelers', label: 'Viajantes', value: (b) => b.travelers },
            {
              key: 'status',
              label: 'Status',
              value: (b) => b.status,
              render: (b) => (
                <Badge
                  tone={
                    b.status === 'confirmed' ? 'green' : b.status === 'pending' ? 'orange' : 'gray'
                  }
                >
                  {statusLabels[b.status]}
                </Badge>
              ),
            },
            {
              key: 'amount',
              label: 'Valor da reserva',
              value: (b) => b.totalAmount,
              render: (b) => money(b.totalAmount),
              align: 'right',
            },
          ]}
          onExport={(selected) => exportCsv('t4f-reservas-filtradas.csv', selected)}
        />
      </Panel>
      <div className="two-column">
        <Panel title="Evolução de reservas" subtitle="Volume por mês da viagem">
          <SimpleBarChart
            rows={view.monthly
              .slice(-12)
              .map((p) => ({ name: p.month.slice(2), value: p.reservations }))}
            valueLabel="Reservas"
          />
        </Panel>
        <Panel title="Ticket médio por roteiro" subtitle="Valor contratado por reserva confirmada">
          <DataTable
            rows={view.routeStats}
            rowKey={(r) => r.id}
            label="Roteiros"
            columns={[
              { key: 'name', label: 'Roteiro', value: (r) => r.shortName },
              {
                key: 'ticket',
                label: 'Ticket',
                value: (r) => r.ticket,
                render: (r) => (r.ticket == null ? '—' : money(r.ticket)),
              },
              { key: 'cancel', label: 'Canceladas', value: (r) => r.cancellations },
            ]}
          />
        </Panel>
      </div>
      <Panel
        title="Importação privada no navegador"
        subtitle="A base anterior é preservada se uma validação falhar"
      >
        <p className="panel-prose">
          O CSV técnico usa IDs já existentes de clientes, leads e saídas. Importe somente dados
          demonstrativos. O lote substitui reservas com o mesmo ID e adiciona novos IDs válidos.
          Pagamentos, feedbacks e estágio dos leads precisam continuar consistentes.{' '}
          {mode === 'demo'
            ? 'O arquivo permanece no navegador, sem envio externo.'
            : 'O arquivo é enviado somente à API configurada, após autenticação administrativa. Validação e confirmação são etapas separadas.'}
        </p>
        <p className="panel-note">
          Separador ; · viajantes separados por | · datas ISO · booleanos true/false · valor em BRL
          com ponto decimal. A exportação da tabela é analítica; o botão acima gera o formato exato
          para reimportação.
        </p>
      </Panel>
    </>
  );
}
