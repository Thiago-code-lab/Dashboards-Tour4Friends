import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { z } from 'zod';
import { ApiDataRepository, repository } from '../services/data';
import { api, ApiError } from '../services/api';
import { authenticate, endSession } from '../services/auth';
import { analyze, DEFAULT_FILTERS, DEFAULT_THRESHOLDS } from '../lib/analytics/metrics';
import { deriveAlerts } from '../lib/analytics/alerts';
import { buildInsights } from '../lib/analytics/insights';
import type { AlertStatus, Dataset, Filters, Thresholds } from '../types/domain';
import type {
  AlertRecord,
  AlertResponse,
  ImportValidation,
  ResourceName,
  SessionUser,
} from '../types/api';
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
    return parsed.success &&
      parsed.data.filters.start <= parsed.data.filters.end &&
      parsed.data.thresholds.attention < parsed.data.thresholds.critical
      ? parsed.data
      : defaultState;
  } catch {
    return defaultState; /* Invalid preferences revert to the documented demo defaults. */
  }
}
const connectedRepository = new ApiDataRepository(api);
function initialMode(): 'demo' | 'api' {
  try {
    const stored = sessionStorage.getItem('t4f-data-mode');
    if (stored === 'demo' || stored === 'api') return stored;
  } catch {
    /* Session storage is optional; the configured source remains explicit. */
  }
  return import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'demo';
}
function useAppState() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [mode, setMode] = useState<'demo' | 'api'>(initialMode);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [imported, setImported] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [apiStatuses, setApiStatuses] = useState<Record<string, AlertRecord>>({});
  const generation = useRef(0);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++generation.current;
      if (mode === 'api' && !user) return;
      try {
        const [next, alertState] = await Promise.all([
          mode === 'demo' ? repository.load(signal) : connectedRepository.load(signal),
          mode === 'api' ? api.get<AlertResponse>('/alerts', signal) : Promise.resolve(null),
        ]);
        if (current !== generation.current) return;
        setData(next);
        setError('');
        setApiStatuses(Object.fromEntries((alertState?.statuses ?? []).map((a) => [a.id, a])));
      } catch (err) {
        if (signal?.aborted || current !== generation.current) return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Erro ao carregar os dados.');
        throw err;
      }
    },
    [mode, user],
  );
  useEffect(() => {
    try {
      sessionStorage.setItem('t4f-data-mode', mode);
    } catch {
      setStorageError('A escolha da fonte não será preservada após recarregar esta página.');
    }
  }, [mode]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    setImported(false);
    void refresh(controller.signal).catch(() => {
      /* Error is displayed and demo fallback is explicit. */
    });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [refresh]);
  useEffect(() => {
    api.onUnauthorized = () => {
      setUser(null);
      setData(null);
      setNotice('Sua sessão expirou ou foi revogada. Entre novamente.');
    };
    return () => {
      api.onUnauthorized = null;
    };
  }, []);
  useEffect(() => {
    if (mode !== 'api' || !user) return;
    const reload = () => {
      if (!document.hidden && !saving) void refresh().catch(() => {});
    };
    const interval = window.setInterval(reload, 30000);
    window.addEventListener('focus', reload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', reload);
    };
  }, [mode, user, saving, refresh]);
  useEffect(() => {
    try {
      localStorage.setItem('t4f-preferences-v1', JSON.stringify(preferences));
      setStorageError('');
    } catch {
      setStorageError(
        'Armazenamento do navegador indisponível. As preferências permanecem somente nesta sessão.',
      );
    }
  }, [preferences]);
  const thresholds = mode === 'api' ? DEFAULT_THRESHOLDS : preferences.thresholds;
  const statuses =
    mode === 'api'
      ? Object.fromEntries(Object.values(apiStatuses).map((a) => [a.id, a.status]))
      : preferences.statuses;
  const view = useMemo(
    () => (data ? analyze(data, preferences.filters) : null),
    [data, preferences.filters],
  );
  const alerts = useMemo(
    () => (data ? deriveAlerts(data, preferences.filters, thresholds) : []),
    [data, preferences.filters, thresholds],
  );
  const activeAlerts = useMemo(
    () => alerts.filter((a) => statuses[a.id] !== 'resolved'),
    [alerts, statuses],
  );
  const insights = useMemo(
    () => (view ? buildInsights(view, activeAlerts) : []),
    [view, activeAlerts],
  );
  const canManage = mode === 'api' && (user?.role === 'admin' || user?.role === 'manager');
  async function persist(operation: () => Promise<unknown>): Promise<void> {
    setSaving(true);
    setNotice('');
    let saved = false;
    try {
      await operation();
      saved = true;
      await refresh();
      setNotice('Alteração salva no PostgreSQL. Indicadores atualizados.');
    } catch (err) {
      const message = saved
        ? 'Gravação concluída, mas não foi possível atualizar o painel. Recarregue os dados.'
        : err instanceof Error
          ? err.message
          : 'A gravação falhou.';
      setNotice(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }
  const setFilters = (filters: Filters) => setPreferences((p) => ({ ...p, filters }));
  const setThresholds = (value: Thresholds) => {
    if (mode === 'api') return;
    setPreferences((p) => ({ ...p, thresholds: value }));
  };
  const setAlertStatus = (id: string, status: AlertStatus) => {
    if (mode === 'demo') {
      setPreferences((p) => ({ ...p, statuses: { ...p.statuses, [id]: status } }));
      return;
    }
    void persist(() =>
      api.patch(`/alerts/${encodeURIComponent(id)}/status`, {
        status,
        note: apiStatuses[id]?.note ?? '',
        expectedVersion: apiStatuses[id]?.version ?? 0,
      }),
    ).catch(() => {});
  };
  return {
    data,
    view,
    mode,
    user,
    canManage,
    canImport: mode === 'demo' || user?.role === 'admin',
    apiConfigured: api.configured,
    error,
    storageError,
    filters: preferences.filters,
    thresholds,
    statuses,
    apiStatuses,
    imported,
    alerts,
    activeAlerts,
    insights,
    saving,
    notice,
    setFilters,
    setThresholds,
    setAlertStatus,
    refresh,
    retry: () => {
      void refresh().catch(() => {});
    },
    login: async (email: string, password: string) => {
      const next = await authenticate(email, password);
      setUser(next);
      setMode('api');
      setNotice('');
    },
    logout: async () => {
      setSaving(true);
      try {
        await endSession();
        setNotice('Sessão encerrada e revogada.');
      } catch {
        setNotice(
          'Não foi possível confirmar a revogação. O token foi removido desta sessão e expirará no prazo configurado.',
        );
      } finally {
        api.setSession(null);
        setUser(null);
        setData(null);
        setSaving(false);
      }
    },
    chooseDemo: () => {
      if (mode === 'api' && user)
        void api.post('/auth/logout').catch(() => {
          setNotice(
            'Demonstração ativada. A revogação remota não foi confirmada; a sessão anterior expirará no prazo configurado.',
          );
        });
      api.setSession(null);
      setUser(null);
      setMode('demo');
      setNotice('Modo demonstração ativado explicitamente.');
    },
    chooseApi: () => {
      setMode('api');
      setNotice('');
    },
    saveRecord: (resource: ResourceName, id: string | null, payload: unknown) =>
      persist(() =>
        id
          ? api.patch(`/${resource}/${encodeURIComponent(id)}`, payload)
          : api.post(`/${resource}`, payload),
      ),
    updateAlert: (id: string, status: AlertStatus, note: string) =>
      persist(() =>
        api.patch(`/alerts/${encodeURIComponent(id)}/status`, {
          status,
          note,
          expectedVersion: apiStatuses[id]?.version ?? 0,
        }),
      ),
    validateImport: async (file: File): Promise<ImportValidation> => {
      const form = new FormData();
      form.set('file', file);
      return api.post('/imports/bookings/validate', form);
    },
    commitImport: (batch: ImportValidation) =>
      persist(() =>
        api.post('/imports/bookings/commit', {
          batchId: batch.batchId,
          validationToken: batch.validationToken,
        }),
      ),
    replaceData: (next: Dataset) => {
      if (mode !== 'demo')
        throw new ApiError('Use a importação autenticada para alterar o PostgreSQL.', 403);
      setData(next);
      setImported(true);
    },
    restoreData: () => {
      setImported(false);
      void refresh().catch(() => {});
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
