import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context';
import { Layout } from '../components/layout';
import Overview from '../pages/Overview';
import { LoginPanel } from '../components/connection';

const Demand = lazy(() => import('../pages/Demand'));
const Reservations = lazy(() => import('../pages/Reservations'));
const RoutesPage = lazy(() => import('../pages/Routes'));
const Accommodations = lazy(() => import('../pages/Accommodations'));
const Operations = lazy(() => import('../pages/Operations'));
const Satisfaction = lazy(() => import('../pages/Satisfaction'));
const Finance = lazy(() => import('../pages/Finance'));
const Reports = lazy(() => import('../pages/Reports'));
const Methodology = lazy(() => import('../pages/Methodology'));
const Commercial = lazy(() => import('../pages/Commercial'));
function Loading() {
  return (
    <div aria-label="Carregando dashboard" role="status" className="loading-state">
      <div className="skeleton skeleton-title" />
      <div className="kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
      <div className="skeleton skeleton-chart" />
      <p>Preparando os indicadores…</p>
    </div>
  );
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* The error state is visible; no private dataset is sent to telemetry. */
  }
  render() {
    return this.state.failed ? (
      <div className="fatal-error">
        <h1>Não foi possível abrir o painel</h1>
        <p>Recarregue a aplicação para tentar novamente.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Workspace() {
  const { data, error, retry, mode, user, chooseDemo } = useApp();
  return (
    <Layout>
      {mode === 'api' && !user ? (
        <LoginPanel />
      ) : error ? (
        <div className="fatal-error" role="alert">
          <h1>A base não pôde ser validada</h1>
          <p>{error}</p>
          <button className="button primary" onClick={retry}>
            Tentar novamente
          </button>
          {mode === 'api' && (
            <button className="button" onClick={chooseDemo}>
              Retornar à demonstração
            </button>
          )}
        </div>
      ) : !data ? (
        <Loading />
      ) : (
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/demanda" element={<Demand />} />
            <Route path="/reservas" element={<Reservations />} />
            <Route path="/roteiros" element={<RoutesPage />} />
            <Route path="/catalogo" element={<Commercial />} />
            <Route path="/hospedagens" element={<Accommodations />} />
            <Route path="/operacoes" element={<Operations />} />
            <Route path="/experiencia" element={<Satisfaction />} />
            <Route path="/financeiro" element={<Finance />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/metodologia" element={<Methodology />} />
            <Route
              path="*"
              element={
                <div className="fatal-error">
                  <h1>Página não encontrada</h1>
                  <Link to="/" className="button primary">
                    Voltar à visão geral
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      )}
    </Layout>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppProvider>
          <Workspace />
        </AppProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
