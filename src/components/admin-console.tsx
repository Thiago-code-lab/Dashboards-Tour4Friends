import { useState } from 'react';
import { useApp } from '../app/context';
import { api } from '../services/api';
import type { AuditRecord, Paginated, SessionUser } from '../types/api';
import { Dialog } from './dialog';

export function AdminConsole() {
  const { mode, user, data } = useApp();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [events, setEvents] = useState<Paginated<AuditRecord> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SessionUser['role']>('viewer');
  if (mode !== 'api' || user?.role !== 'admin' || !data) return null;
  async function load(page = 1) {
    const [people, audit] = await Promise.all([
      api.get<Paginated<SessionUser>>('/admin/users?page_size=100'),
      api.get<Paginated<AuditRecord>>(`/admin/audit?page_size=10&page=${page}`),
    ]);
    setUsers(people.items);
    setEvents(audit);
  }
  async function operate(action: () => Promise<unknown>, reloadAfter = true) {
    setBusy(true);
    setError('');
    try {
      await action();
      if (reloadAfter) await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operação administrativa não concluída.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="text-link"
        onClick={() => {
          setOpen(true);
          void operate(() => load(), false);
        }}
      >
        Usuários e auditoria
      </button>
      {open && (
        <Dialog
          title="Usuários e auditoria"
          busy={busy}
          onClose={() => {
            setOpen(false);
            setPassword('');
          }}
        >
          <p className="panel-prose">
            A autorização é aplicada pelo servidor. Desativar um usuário ou mudar seu perfil revoga
            as sessões ativas.
          </p>
          {error && (
            <div className="notice error-notice" role="alert">
              {error}
            </div>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Estado</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {users.map((person) => (
                  <tr key={person.id}>
                    <td>
                      {person.name}
                      <small className="block">{person.email}</small>
                    </td>
                    <td>{person.role}</td>
                    <td>{person.active ? 'Ativo' : 'Inativo'}</td>
                    <td>
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() =>
                          void operate(() =>
                            api.patch(`/admin/users/${person.id}`, {
                              expectedVersion: person.version,
                              active: !person.active,
                            }),
                          )
                        }
                      >
                        {person.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="admin-subtitle">Criar usuário</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void operate(async () => {
                await api.post('/admin/users', { email, name, password, role });
                setPassword('');
                setEmail('');
                setName('');
              });
            }}
          >
            <div className="editor-fields">
              <label>
                Nome
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                E-mail
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Senha inicial
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label>
                Perfil
                <select
                  aria-label="Perfil"
                  value={role}
                  onChange={(e) => setRole(e.target.value as SessionUser['role'])}
                >
                  <option value="viewer">Visualizador</option>
                  <option value="analyst">Analista</option>
                  <option value="manager">Gestor</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
            </div>
            <div className="dialog-actions">
              <button className="button primary" disabled={busy}>
                Criar usuário no banco
              </button>
            </div>
          </form>
          <h3 className="admin-subtitle">Eventos de auditoria</h3>
          <div className="audit-history">
            {events?.items.map((event) => (
              <details key={event.id}>
                <summary>
                  {new Date(event.occurredAt).toLocaleString('pt-BR')} · {event.entityType} ·{' '}
                  {event.entityId} · {event.action}
                </summary>
                <pre>
                  {JSON.stringify(
                    {
                      responsavel: event.actorUserId,
                      antes: event.beforeData,
                      depois: event.afterData,
                      requestId: event.requestId,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            ))}
          </div>
          <div className="pagination">
            <span>
              {events?.total ?? 0} eventos · página {events?.page ?? 1}
            </span>
            <div>
              <button
                className="button small"
                disabled={busy || !events || events.page === 1}
                onClick={() => void operate(() => load((events?.page ?? 1) - 1), false)}
              >
                Anteriores
              </button>
              <button
                className="button small"
                disabled={busy || !events || events.page * events.pageSize >= events.total}
                onClick={() => void operate(() => load((events?.page ?? 1) + 1), false)}
              >
                Próximos
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
