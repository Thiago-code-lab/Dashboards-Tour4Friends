import { useState } from 'react';
import { Database, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '../app/context';
import { AdminConsole } from './admin-console';
const roleLabels = {
  admin: 'Administrador',
  manager: 'Gestor',
  analyst: 'Analista',
  viewer: 'Visualizador',
};
export function ConnectionBar() {
  const { mode, user, apiConfigured, chooseApi, chooseDemo, logout, retry, saving, notice } =
    useApp();
  return (
    <div className="connection-area no-print">
      <div className={`connection-bar ${mode}`}>
        <span>
          <Database size={14} />
          <strong>
            {mode === 'demo'
              ? 'Modo demonstração · dados sintéticos'
              : user
                ? 'Ambiente conectado · base sintética persistente'
                : 'Laboratório · aguardando autenticação'}
          </strong>
        </span>
        <div>
          {mode === 'demo' ? (
            <button
              className="text-link"
              disabled={!apiConfigured}
              title={
                apiConfigured
                  ? 'Entrar na API configurada'
                  : 'Disponível quando uma API segura estiver configurada neste build'
              }
              onClick={chooseApi}
            >
              Entrar no laboratório
            </button>
          ) : (
            <>
              <span className="connection-user">
                {user ? `${user.name} · ${roleLabels[user.role]}` : 'Autenticação necessária'}
              </span>
              <AdminConsole />
              {user && (
                <>
                  <button
                    className="icon-button"
                    aria-label="Atualizar dados da API"
                    disabled={saving}
                    onClick={retry}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button className="button small" disabled={saving} onClick={() => void logout()}>
                    <LogOut size={13} /> Sair
                  </button>
                </>
              )}
              <button className="text-link" disabled={saving} onClick={chooseDemo}>
                Usar demonstração
              </button>
            </>
          )}
        </div>
      </div>
      {notice && (
        <div className="notice" role="status">
          {saving ? 'Salvando… ' : ''}
          {notice}
        </div>
      )}
    </div>
  );
}
export function LoginPanel() {
  const { login, chooseDemo, apiConfigured } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="login-panel">
      <ShieldCheck size={32} />
      <p className="eyebrow">LABORATÓRIO COM PERSISTÊNCIA</p>
      <h1>Entre no ambiente conectado</h1>
      <p>
        Reservas, capacidade, custos e revisões compartilhados no PostgreSQL. Os dados continuam
        sintéticos.
      </p>
      {!apiConfigured ? (
        <div className="notice" role="alert">
          A API não está configurada neste build. A demonstração continua disponível.
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await login(email, password);
              setPassword('');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Falha de autenticação.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            E-mail
            <input
              autoComplete="username"
              type="email"
              aria-label="E-mail de acesso"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              autoComplete="current-password"
              type="password"
              aria-label="Senha de acesso"
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <div role="alert" className="notice error-notice">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy} type="submit">
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      )}
      <button className="text-link" onClick={chooseDemo}>
        Voltar ao modo demonstração
      </button>
      <small>A sessão fica somente em memória. Após atualizar a página, entre novamente.</small>
    </section>
  );
}
