import { useEffect, useState, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  Compass,
  FileChartColumn,
  LayoutDashboard,
  Menu,
  Mountain,
  RotateCcw,
  SlidersHorizontal,
  Smile,
  Ticket,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../app/context';
import { dateLabel } from '../lib/format';
import { DEFAULT_FILTERS } from '../lib/analytics/metrics';
import type { Filters } from '../types/domain';
import { ConnectionBar } from './connection';

export const NAVIGATION = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/demanda', label: 'Demanda e previsões', icon: TrendingUp },
  { to: '/reservas', label: 'Reservas e comercial', icon: Ticket },
  { to: '/roteiros', label: 'Roteiros e destinos', icon: Compass },
  { to: '/catalogo', label: 'Catálogo e orçamento', icon: Compass },
  { to: '/hospedagens', label: 'Hospedagens', icon: Building2 },
  { to: '/operacoes', label: 'Operações e alertas', icon: Activity },
  { to: '/experiencia', label: 'Experiência do cliente', icon: Smile },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/relatorios', label: 'Relatório executivo', icon: FileChartColumn },
  { to: '/metodologia', label: 'Sobre e metodologia', icon: BookOpen },
];
export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const closeMenu = () => {
    setOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  };
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    const update = () => {
      setCompact(query.matches);
      setOpen(false);
    };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (compact && open) sidebar.current?.querySelector<HTMLElement>('button, a')?.focus();
  }, [open, compact]);
  const { data, activeAlerts, storageError, imported, mode } = useApp();
  useEffect(() => {
    setOpen(false);
    if (compact && open)
      requestAnimationFrame(() => document.getElementById('main-content')?.focus());
    window.scrollTo({ top: 0 });
  }, [pathname]);
  const current = NAVIGATION.find((n) => n.to === pathname)?.label ?? 'Página não encontrada';
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={closeMenu}
          tabIndex={-1}
        />
      )}
      <aside
        ref={sidebar}
        className={`sidebar ${open ? 'is-open' : ''}`}
        aria-label="Menu principal"
        inert={compact && !open}
        onKeyDown={(event) => {
          if (!compact || !open) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu();
          }
          if (event.key !== 'Tab') return;
          const controls = [
            ...sidebar.current!.querySelectorAll<HTMLElement>('a, button:not([disabled])'),
          ];
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        {compact && (
          <button
            className="icon-button sidebar-close"
            aria-label="Fechar navegação"
            onClick={closeMenu}
          >
            <X size={20} />
          </button>
        )}
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Mountain size={26} strokeWidth={1.8} />
          </span>
          <span>
            <b>
              T4F<span className="brand-dot">.</span>
            </b>
            <small>PERFORMANCE</small>
          </span>
        </Link>
        <div className="workspace-tag">
          <span className="workspace-avatar">T4</span>
          <div>
            <strong>Tour4Friends</strong>
            <small>Inteligência de negócios</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <p className="nav-section">WORKSPACE</p>
        <nav aria-label="Módulos">
          {NAVIGATION.slice(0, 9).map((item) => (
            <NavLink end={item.to === '/'} to={item.to} key={item.to}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.to === '/operacoes' && activeAlerts.length > 0 && (
                <span className="nav-count">{activeAlerts.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <p className="nav-section resources-label">RECURSOS</p>
        <nav aria-label="Recursos">
          {NAVIGATION.slice(9).map((item) => (
            <NavLink to={item.to} key={item.to}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="academic-box">
            <ChartNoAxesCombined size={19} />
            <strong>Conhecimento que move.</strong>
            <p>
              Projeto Integrador V<br />
              Fatec Ipiranga
            </p>
            <Link to="/metodologia">
              Conheça o projeto <ArrowRight size={13} />
            </Link>
          </div>
          <div className="sidebar-status">
            <i /> {mode === 'api' ? 'Modo laboratório' : 'Ambiente demonstrativo'}{' '}
            <CircleHelp size={13} />
          </div>
        </div>
      </aside>
      <div className="workspace" inert={compact && open}>
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button
              ref={menuButton}
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={13} className="breadcrumb-root" />
            <span className="breadcrumb-current">{current}</span>
          </div>
          <div className="topbar-right">
            <span className="scenario-date">
              <CalendarDays size={14} /> Cenário ·{' '}
              {data ? dateLabel(data.metadata.referenceDate) : 'Novembro de 2026'}
            </span>
            <Link
              to="/operacoes"
              className="icon-button notification"
              aria-label={`${activeAlerts.length} alertas operacionais`}
            >
              <Bell size={18} />
              {activeAlerts.length > 0 && <i />}
            </Link>
            <span className="user-avatar" title="Workspace acadêmico Tour4Friends">
              T4
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <ConnectionBar />
          {(storageError || imported) && (
            <div className="notice" role="status">
              {storageError ||
                'Reservas importadas nesta sessão. Recarregue a base para retornar ao cenário original.'}
            </div>
          )}
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <i /> Dados demonstrativos — cenário acadêmico simulado.
          </span>
          <Link to="/metodologia">
            Fonte, definições e metodologia <ArrowRight size={12} />
          </Link>
        </footer>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function GlobalFilters() {
  const { data, filters, setFilters } = useApp();
  const [draft, setDraft] = useState<Filters>(filters);
  const [error, setError] = useState('');
  useEffect(() => setDraft(filters), [filters]);
  const change = (key: keyof Filters, value: string) => setDraft((p) => ({ ...p, [key]: value }));
  return (
    <form
      className="filter-bar"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.start || !draft.end || draft.start > draft.end) {
          setError('Informe um período válido: início anterior ao fim.');
          return;
        }
        setError('');
        setFilters(draft);
      }}
    >
      <span className="filter-icon" title="Filtros globais">
        <SlidersHorizontal size={17} />
      </span>
      <label className="date-filter">
        <span>Período da viagem</span>
        <div>
          <input
            type="date"
            min="2024-01-01"
            max="2027-12-31"
            aria-label="Data inicial"
            value={draft.start}
            onChange={(e) => change('start', e.target.value)}
          />
          <span>—</span>
          <input
            type="date"
            min="2024-01-01"
            max="2027-12-31"
            aria-label="Data final"
            value={draft.end}
            onChange={(e) => change('end', e.target.value)}
          />
        </div>
      </label>
      <label>
        <span>Roteiro</span>
        <select
          aria-label="Filtrar roteiro"
          value={draft.route}
          onChange={(e) => change('route', e.target.value)}
        >
          <option value="all">Todos os roteiros</option>
          {data?.routes.map((r) => (
            <option value={r.id} key={r.id}>
              {r.shortName}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Modalidade</span>
        <select
          aria-label="Filtrar modalidade"
          value={draft.modality}
          onChange={(e) => change('modality', e.target.value)}
        >
          <option value="all">Todas</option>
          {['A pé', 'Bicicleta', 'Cultural'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Hospedagem</span>
        <select
          aria-label="Filtrar categoria"
          value={draft.category}
          onChange={(e) => change('category', e.target.value)}
        >
          <option value="all">Todas as categorias</option>
          {['Premium', 'Conforto', 'Alternativa'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="filter-actions">
        <button className="button small primary" type="submit">
          Aplicar
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Limpar filtros"
          title="Limpar filtros"
          onClick={() => {
            setFilters(DEFAULT_FILTERS);
            setError('');
          }}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      {error && (
        <p role="alert" className="filter-error">
          {error}
        </p>
      )}
    </form>
  );
}
