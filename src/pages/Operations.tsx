import { useState } from 'react';
import { Activity, CheckCheck, CircleAlert, ClipboardCheck } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { GlobalFilters, PageHeading } from '../components/layout';
import { Badge, Empty, Kpi, Panel } from '../components/ui';
import { dateLabel, number } from '../lib/format';
import { exportCsv } from '../lib/csv';
import type { AlertStatus } from '../types/domain';
import { AlertReview } from '../components/alert-review';

export default function Operations() {
  const { alerts, statuses, setAlertStatus, data, mode } = useAnalysis();
  const [severity, setSeverity] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const rows = alerts.filter(
    (a) =>
      (severity === 'all' || a.severity === severity) &&
      (type === 'all' || a.type === type) &&
      (status === 'all' || (statuses[a.id] ?? 'open') === status),
  );
  return (
    <>
      <PageHeading
        eyebrow="CUIDADO EM CADA ETAPA"
        title="Operações e alertas"
        description="Antecipe os pontos de atenção e acompanhe a revisão das próximas saídas."
        action={
          <button
            className="button"
            disabled={!rows.length}
            onClick={() =>
              exportCsv(
                't4f-alertas.csv',
                rows.map((a) => ({ ...a, status: statuses[a.id] ?? 'open' })),
              )
            }
          >
            Exportar alertas
          </button>
        }
      />
      <GlobalFilters />
      <div className="kpi-grid">
        <Kpi
          label="Alertas no escopo"
          value={number(alerts.length)}
          detail="Gerados por regras de negócio"
          icon={Activity}
          help="Alertas calculados a partir das datas e registros selecionados; não são uma lista fixa."
        />
        <Kpi
          label="Críticos abertos"
          value={number(
            alerts.filter((a) => a.severity === 'critical' && statuses[a.id] !== 'resolved').length,
          )}
          detail="Prioridade para a operação"
          icon={CircleAlert}
          tone="orange"
          help="Alertas críticos ainda não marcados como resolvidos no navegador."
        />
        <Kpi
          label="Revisados"
          value={number(alerts.filter((a) => statuses[a.id] === 'reviewed').length)}
          detail="Em acompanhamento"
          icon={ClipboardCheck}
          help="Estado local de acompanhamento; não altera os registros de origem."
        />
        <Kpi
          label="Resolvidos"
          value={number(alerts.filter((a) => statuses[a.id] === 'resolved').length)}
          detail={mode === 'api' ? 'Persistidos no PostgreSQL' : 'Neste navegador'}
          icon={CheckCheck}
          tone="green"
          help="Resoluções demonstrativas persistidas somente no localStorage do navegador."
        />
      </div>
      <Panel
        title="Fila de acompanhamento"
        subtitle={`Referência do cenário: ${dateLabel(data.metadata.referenceDate)} · revisão local, sem envio de mensagens`}
      >
        <div className="local-filters">
          <label>
            Gravidade
            <select
              aria-label="Gravidade do alerta"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="critical">Crítica</option>
              <option value="attention">Atenção</option>
            </select>
          </label>
          <label>
            Tipo
            <select
              aria-label="Tipo do alerta"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              {[...new Set(alerts.map((a) => a.type))].sort().map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              aria-label="Filtrar status do alerta"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="open">Aberto</option>
              <option value="reviewed">Revisado</option>
              <option value="resolved">Resolvido</option>
            </select>
          </label>
          <span>{rows.length} ocorrências</span>
        </div>
        {rows.length ? (
          <div className="operations-list">
            {rows.map((a) => (
              <article
                className={`operation-card ${statuses[a.id] === 'resolved' ? 'resolved' : ''}`}
                key={a.id}
              >
                <div className="operation-symbol">
                  <CircleAlert size={21} />
                </div>
                <div className="operation-body">
                  <div className="operation-heading">
                    <h3>{a.type}</h3>
                    <Badge tone={statuses[a.id] === 'resolved' ? 'green' : 'orange'}>
                      {statuses[a.id] === 'resolved'
                        ? 'Resolvido'
                        : a.severity === 'critical'
                          ? 'Crítico'
                          : 'Atenção'}
                    </Badge>
                  </div>
                  <p className="operation-meta">
                    {data.routes.find((r) => r.id === a.routeId)!.name} · {a.departureId} ·{' '}
                    {dateLabel(a.date)}
                  </p>
                  <p>{a.cause}</p>
                  {mode === 'api' && statuses[a.id] === 'resolved' && (
                    <p className="notice">
                      Resolvido administrativamente — condição operacional ainda detectada.
                    </p>
                  )}
                  <div className="recommended-action">
                    <strong>Ação recomendada</strong> {a.action}
                  </div>
                </div>
                {mode === 'api' ? (
                  <AlertReview id={a.id} />
                ) : (
                  <label className="status-control">
                    Acompanhamento
                    <select
                      aria-label={`Status ${a.id}`}
                      value={statuses[a.id] ?? 'open'}
                      onChange={(e) => setAlertStatus(a.id, e.target.value as AlertStatus)}
                    >
                      <option value="open">Aberto</option>
                      <option value="reviewed">Revisado</option>
                      <option value="resolved">Resolvido</option>
                    </select>
                  </label>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty message="Nenhuma ocorrência corresponde aos filtros locais e globais." />
        )}
      </Panel>
      <div className="notice">
        <strong>Como os alertas são gerados:</strong> ficha incompleta até 7 dias da saída; contrato
        de hospedagem sem confirmação; ocupação acima dos limites configurados; transfer vencido;
        custo acima do orçamento em mais de 20%; e viajantes acima da capacidade da saída. Marcar
        como resolvido registra a revisão e não corrige a causa na base.
      </div>
    </>
  );
}
