import { useState } from 'react';
import { useAnalysis } from '../app/context';
import { Dialog } from './dialog';
import type { AlertStatus } from '../types/domain';

export function AlertReview({ id }: { id: string }) {
  const { apiStatuses, updateAlert, canManage, saving } = useAnalysis();
  const [open, setOpen] = useState(false);
  const current = apiStatuses[id];
  const [status, setStatus] = useState<AlertStatus>(current?.status ?? 'open');
  const [note, setNote] = useState(current?.note ?? '');
  const [error, setError] = useState('');
  return (
    <div className="alert-review">
      <p>
        {current?.updatedAt
          ? `${current.updatedByName} · ${new Date(current.updatedAt).toLocaleString('pt-BR')}`
          : 'Sem revisão persistida'}
      </p>
      {current?.note && <p>{current.note}</p>}
      {canManage && (
        <button
          className="button small"
          disabled={saving}
          onClick={() => {
            setStatus(current?.status ?? 'open');
            setNote(current?.note ?? '');
            setError('');
            setOpen(true);
          }}
        >
          Revisar alerta
        </button>
      )}
      {open && (
        <Dialog title="Revisar alerta" busy={saving} onClose={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              try {
                await updateAlert(id, status, note);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Falha ao salvar revisão.');
              }
            }}
          >
            <div className="editor-fields">
              <label>
                Status
                <select
                  aria-label="Status da revisão"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AlertStatus)}
                >
                  <option value="open">Aberto / reabrir</option>
                  <option value="reviewed">Revisado</option>
                  <option value="resolved">Resolvido administrativamente</option>
                </select>
              </label>
              <label>
                Observação
                <textarea
                  aria-label="Observação do alerta"
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
            <p className="panel-note">
              A revisão não elimina a regra detectada. A condição continuará visível enquanto a
              causa operacional permanecer.
            </p>
            {error && (
              <div className="notice error-notice" role="alert">
                {error}
              </div>
            )}
            <button className="button primary" disabled={saving}>
              Salvar revisão
            </button>
          </form>
        </Dialog>
      )}
    </div>
  );
}
