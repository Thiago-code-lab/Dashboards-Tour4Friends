import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useAnalysis } from '../app/context';
import { api, ApiError } from '../services/api';
import { Dialog } from './dialog';
import type { AuditRecord, ResourceName } from '../types/api';
import type { Dataset } from '../types/domain';

type Option = { value: string; label: string };
type Field = {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'date' | 'checkbox' | 'select';
  required?: boolean;
  options?: Option[];
};
const names: Record<ResourceName, string> = {
  bookings: 'reservas',
  allocations: 'hospedagens',
  costs: 'custos',
  departures: 'saídas',
};
const categories = ['Premium', 'Conforto', 'Alternativa'].map((value) => ({ value, label: value }));
function fieldsFor(resource: ResourceName, data: Dataset, creating: boolean): Field[] {
  const common: Field[] = creating
    ? [{ key: 'id', label: 'Identificador', kind: 'text', required: true }]
    : [];
  const departures = data.departures.map((d) => ({
    value: d.id,
    label: `${d.id} · ${d.date} · ${data.routes.find((r) => r.id === d.routeId)!.shortName}`,
  }));
  if (resource === 'bookings')
    return [
      ...common,
      ...(creating
        ? [
            {
              key: 'departureId',
              label: 'Saída',
              kind: 'select' as const,
              required: true,
              options: departures,
            },
            {
              key: 'customerId',
              label: 'Titular',
              kind: 'select' as const,
              required: true,
              options: data.customers.map((c) => ({ value: c.id, label: c.label })),
            },
            {
              key: 'leadId',
              label: 'Lead sem reserva',
              kind: 'select' as const,
              required: true,
              options: data.leads
                .filter((l) => !data.bookings.some((b) => b.leadId === l.id))
                .map((l) => ({ value: l.id, label: `${l.id} · ${l.routeId} · ${l.category}` })),
            },
            { key: 'bookedAt', label: 'Contratação', kind: 'date' as const, required: true },
          ]
        : []),
      { key: 'category', label: 'Categoria', kind: 'select', options: categories },
      {
        key: 'status',
        label: 'Status da reserva',
        kind: 'select',
        options: [
          { value: 'pending', label: 'Pendente' },
          { value: 'confirmed', label: 'Confirmada' },
          { value: 'cancelled', label: 'Cancelada' },
        ],
      },
      { key: 'totalAmount', label: 'Valor total (BRL)', kind: 'number', required: true },
      { key: 'formComplete', label: 'Ficha pré-viagem completa', kind: 'checkbox' },
      { key: 'cancellationReason', label: 'Motivo do cancelamento', kind: 'text' },
    ];
  if (resource === 'departures')
    return [
      ...common,
      ...(creating
        ? [
            {
              key: 'routeId',
              label: 'Roteiro',
              kind: 'select' as const,
              options: data.routes.map((r) => ({ value: r.id, label: r.name })),
            },
          ]
        : []),
      { key: 'date', label: 'Data da saída', kind: 'date', required: true },
      { key: 'endDate', label: 'Fim da viagem', kind: 'date', required: true },
      { key: 'capacity', label: 'Capacidade do grupo', kind: 'number', required: true },
      { key: 'transferDue', label: 'Prazo do transfer', kind: 'date', required: true },
      { key: 'transferConfirmed', label: 'Transfer confirmado', kind: 'checkbox' },
    ];
  if (resource === 'allocations')
    return [
      ...common,
      ...(creating
        ? [
            { key: 'departureId', label: 'Saída', kind: 'select' as const, options: departures },
            {
              key: 'partnerId',
              label: 'Hospedagem demonstrativa',
              kind: 'select' as const,
              options: data.partners.map((p) => ({
                value: p.id,
                label: `${p.name} · ${p.routeId}`,
              })),
            },
            { key: 'locality', label: 'Etapa do roteiro', kind: 'text' as const, required: true },
            { key: 'date', label: 'Utilização', kind: 'date' as const, required: true },
            { key: 'category', label: 'Categoria', kind: 'select' as const, options: categories },
          ]
        : []),
      { key: 'capacity', label: 'Vagas contratadas', kind: 'number', required: true },
      { key: 'confirmed', label: 'Contratação confirmada', kind: 'checkbox' },
    ];
  return [
    ...common,
    ...(creating
      ? [
          { key: 'departureId', label: 'Saída', kind: 'select' as const, options: departures },
          { key: 'date', label: 'Data da saída', kind: 'date' as const, required: true },
        ]
      : []),
    { key: 'category', label: 'Categoria do custo', kind: 'text', required: true },
    { key: 'budget', label: 'Orçamento (BRL)', kind: 'number', required: true },
    { key: 'amount', label: 'Custo (BRL)', kind: 'number', required: true },
    {
      key: 'status',
      label: 'Status financeiro',
      kind: 'select',
      options: [
        { value: 'estimated', label: 'Estimado' },
        { value: 'realized', label: 'Realizado' },
      ],
    },
  ];
}

export function Management({ resource }: { resource: ResourceName }) {
  const { mode, canManage } = useAnalysis();
  const [open, setOpen] = useState(false);
  if (mode !== 'api') return null;
  return (
    <div className="management-bar">
      <span>
        {canManage
          ? 'Operações persistentes com controle de versão e auditoria.'
          : 'Perfil de consulta · alterações operacionais não permitidas.'}
      </span>
      {canManage && (
        <button className="button small" onClick={() => setOpen(true)}>
          <Pencil size={13} /> Gerenciar {names[resource]}
        </button>
      )}
      {open && <ResourceEditor resource={resource} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ResourceEditor({ resource, onClose }: { resource: ResourceName; onClose: () => void }) {
  const { data, saveRecord, saving } = useAnalysis();
  const records = data[resource];
  const [identifier, setIdentifier] = useState('');
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const pendingRequest = useRef<AbortController | null>(null);
  useEffect(() => () => pendingRequest.current?.abort(), []);
  const [history, setHistory] = useState<AuditRecord[] | null>(null);
  const fields = fieldsFor(resource, data, creating);
  async function selectRecord(id: string) {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    setIdentifier(id);
    setCreating(false);
    setRecord(null);
    setHistory(null);
    setError('');
    setFieldErrors({});
    setLoading(false);
    if (!id) return;
    setLoading(true);
    try {
      const next = await api.get<Record<string, unknown>>(
        `/${resource}/${encodeURIComponent(id)}`,
        controller.signal,
      );
      if (!controller.signal.aborted) setRecord(next);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o registro.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function startNew() {
    pendingRequest.current?.abort();
    setLoading(false);
    setFieldErrors({});
    setCreating(true);
    setIdentifier('');
    setHistory(null);
    setError('');
    setRecord({
      id: `${resource === 'bookings' ? 'T4F' : resource === 'departures' ? 'DEP' : resource === 'allocations' ? 'ALC' : 'CST'}-${crypto.randomUUID().slice(0, 8)}`,
      category: resource === 'costs' ? 'Hospedagem' : 'Conforto',
      status: resource === 'bookings' ? 'pending' : 'estimated',
      totalAmount: 0,
      amount: 0,
      budget: 0,
      capacity: 1,
      formComplete: false,
      confirmed: false,
      transferConfirmed: false,
      bookedAt: data.metadata.referenceDate,
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    setError('');
    setFieldErrors({});
    const payload: Record<string, unknown> = Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.kind === 'checkbox'
          ? Boolean(record[field.key])
          : field.kind === 'number'
            ? Number(record[field.key])
            : (record[field.key] ?? ''),
      ]),
    );
    if (resource === 'bookings') {
      payload.cancellationReason = payload.cancellationReason || null;
      if (creating) {
        payload.travelerIds = [payload.customerId];
        payload.confirmedAt = payload.status === 'confirmed' ? data.metadata.referenceDate : null;
      }
    }
    if (!creating) payload.expectedVersion = record.version;
    try {
      await saveRecord(resource, creating ? null : identifier, payload);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.validation);
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    }
  }
  return (
    <Dialog title={`Gerenciar ${names[resource]}`} onClose={onClose} busy={saving}>
      <div className="editor-selector">
        <label>
          Registro
          <select
            aria-label="Selecionar registro"
            value={identifier}
            onChange={(e) => void selectRecord(e.target.value)}
            disabled={saving}
          >
            <option value="">Selecione para editar</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id}
                {'date' in r ? ` · ${r.date}` : 'bookedAt' in r ? ` · ${r.bookedAt}` : ''}
                {'locality' in r ? ` · ${r.locality} · ${r.category}` : ''}
              </option>
            ))}
          </select>
        </label>
        <button className="button small" disabled={saving} onClick={startNew}>
          <Plus size={13} /> Novo registro
        </button>
      </div>
      {loading && <p role="status">Carregando registro…</p>}
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
        </div>
      )}
      {record && (
        <form onSubmit={(event) => void submit(event)}>
          <div className="editor-fields">
            {fields.map((field) => (
              <label key={field.key} className={field.kind === 'checkbox' ? 'checkbox-label' : ''}>
                {field.label}
                {field.kind === 'select' ? (
                  <select
                    aria-label={field.label}
                    aria-invalid={Boolean(fieldErrors[field.key])}
                    aria-describedby={
                      fieldErrors[field.key] ? `error-${resource}-${field.key}` : undefined
                    }
                    required
                    value={String(record[field.key] ?? '')}
                    onChange={(e) => setRecord({ ...record, [field.key]: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.kind === 'checkbox' ? (
                  <input
                    type="checkbox"
                    aria-label={field.label}
                    checked={Boolean(record[field.key])}
                    onChange={(e) => setRecord({ ...record, [field.key]: e.target.checked })}
                  />
                ) : (
                  <input
                    aria-label={field.label}
                    aria-invalid={Boolean(fieldErrors[field.key])}
                    aria-describedby={
                      fieldErrors[field.key] ? `error-${resource}-${field.key}` : undefined
                    }
                    type={field.kind}
                    required={field.required}
                    min={field.kind === 'number' ? (field.key === 'capacity' ? 1 : 0) : undefined}
                    step={
                      field.kind === 'number' ? (field.key === 'capacity' ? 1 : 0.01) : undefined
                    }
                    maxLength={field.kind === 'text' ? 600 : undefined}
                    value={String(record[field.key] ?? '')}
                    onChange={(e) => setRecord({ ...record, [field.key]: e.target.value })}
                  />
                )}
                {fieldErrors[field.key] && (
                  <small className="field-error" id={`error-${resource}-${field.key}`}>
                    {fieldErrors[field.key]}
                  </small>
                )}
              </label>
            ))}
          </div>
          <p className="panel-note">
            {creating
              ? 'IDs e vínculos são validados pelo servidor. Nova reserva inicia com o titular como único viajante.'
              : `Versão ${record.version}. Alterações concorrentes exigem recarregar o registro.`}{' '}
            Confirmações são bloqueadas quando faltam vagas físicas ou ficha obrigatória. Alterar
            datas de saídas com vínculos incompatíveis exige corrigir os contratos antes.
          </p>
          <div className="dialog-actions">
            {resource === 'bookings' && !creating && (
              <button
                className="button"
                type="button"
                onClick={async () => {
                  try {
                    setHistory(
                      await api.get(`/bookings/${encodeURIComponent(identifier)}/history`),
                    );
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Histórico indisponível.');
                  }
                }}
              >
                Consultar histórico
              </button>
            )}
            <button className="button primary" type="submit" disabled={saving || loading}>
              {saving ? 'Salvando…' : 'Salvar no PostgreSQL'}
            </button>
          </div>
        </form>
      )}
      {history && (
        <div className="audit-history">
          <h3>Histórico de alterações</h3>
          {history.length ? (
            history.map((h) => (
              <details key={h.id}>
                <summary>
                  {new Date(h.occurredAt).toLocaleString('pt-BR')} · {h.action} · {h.actorUserId}
                </summary>
                <pre>{JSON.stringify({ antes: h.before, depois: h.after }, null, 2)}</pre>
              </details>
            ))
          ) : (
            <p>Nenhuma alteração registrada após a seed.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
