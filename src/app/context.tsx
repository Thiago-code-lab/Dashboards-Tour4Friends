import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { repository } from '../services/data';
import { analyze, DEFAULT_FILTERS, DEFAULT_THRESHOLDS } from '../lib/analytics/metrics';
import { deriveAlerts } from '../lib/analytics/alerts';
import { buildInsights } from '../lib/analytics/insights';
import type { AlertStatus, Dataset, Filters, Thresholds } from '../types/domain';

const storedSchema = z.object({
  filters: z.object({
    start: z.iso.date(),
    end: z.iso.date(),
    route: z.string(),
    modality: z.string(),
    category: z.string(),
  }),
  thresholds: z.object({
    attention: z.number().min(1).max(99),
    critical: z.number().min(2).max(100),
    costOverrun: z.number().min(1).max(100),
  }),
  statuses: z.record(z.string(), z.enum(['open', 'reviewed', 'resolved'])),
});
const defaultState = {
  filters: DEFAULT_FILTERS,
  thresholds: DEFAULT_THRESHOLDS,
  statuses: {} as Record<string, AlertStatus>,
};
function readPreferences(): typeof defaultState {
  try {
    const raw = localStorage.getItem('t4f-preferences-v1');
    if (!raw) return defaultState;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    if (
      !parsed.success ||
      parsed.data.filters.start > parsed.data.filters.end ||
      parsed.data.thresholds.attention >= parsed.data.thresholds.critical
    )
      return defaultState;
    return parsed.data;
  } catch {
    return defaultState; /* A corrupt/blocked store never prevents access to the public demo. */
  }
}

function useAppState() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [imported, setImported] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    repository
      .load(controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Erro ao carregar os dados.');
      });
    return () => controller.abort();
  }, [loadAttempt]);
  useEffect(() => {
    try {
      localStorage.setItem('t4f-preferences-v1', JSON.stringify(preferences));
      setStorageError('');
    } catch {
      setStorageError(
        'Armazenamento do navegador indisponível. As alterações permanecem somente nesta sessão.',
      );
    }
  }, [preferences]);
  const view = useMemo(
    () => (data ? analyze(data, preferences.filters) : null),
    [data, preferences.filters],
  );
  const alerts = useMemo(
    () => (data ? deriveAlerts(data, preferences.filters, preferences.thresholds) : []),
    [data, preferences.filters, preferences.thresholds],
  );
  const activeAlerts = useMemo(
    () => alerts.filter((a) => preferences.statuses[a.id] !== 'resolved'),
    [alerts, preferences.statuses],
  );
  const insights = useMemo(
    () => (view ? buildInsights(view, activeAlerts) : []),
    [view, activeAlerts],
  );
  const setFilters = (filters: Filters) => setPreferences((p) => ({ ...p, filters }));
  const setThresholds = (thresholds: Thresholds) => setPreferences((p) => ({ ...p, thresholds }));
  const setAlertStatus = (id: string, status: AlertStatus) =>
    setPreferences((p) => ({ ...p, statuses: { ...p.statuses, [id]: status } }));
  return {
    data,
    view,
    error,
    storageError,
    filters: preferences.filters,
    thresholds: preferences.thresholds,
    statuses: preferences.statuses,
    imported,
    alerts,
    activeAlerts,
    insights,
    setFilters,
    setThresholds,
    setAlertStatus,
    replaceData: (next: Dataset) => {
      setData(next);
      setImported(true);
    },
    retry: () => setLoadAttempt((v) => v + 1),
    restoreData: () => {
      setImported(false);
      setLoadAttempt((v) => v + 1);
    },
  };
}
type AppState = ReturnType<typeof useAppState>;
const AppContext = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('Provider de dados ausente');
  return state;
}
export function useAnalysis() {
  const state = useApp();
  if (!state.data || !state.view) throw new Error('Dados ainda não carregados');
  return { ...state, data: state.data, view: state.view };
}
