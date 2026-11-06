import { Eye, EyeOff, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Sun, WifiOff, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import { useAuth } from '../../auth/AuthProvider';
import { TransactionDialogProvider, useTransactionDialog } from '../../features/transactions/TransactionDialog';
import { cn } from '../../lib/cn';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Skeleton } from '../ui/StateView';
import { CommandPalette } from './CommandPalette';
import { InvitationBanner } from './InvitationBanner';
import { useInboxCount } from '../../hooks/useInbox';
import { MORE_PAGES, PLAN_TABS, SECTIONS, SETTINGS, WAITING, WEALTH_TABS, sectionOwns } from './nav';
import { useDashboard } from '../../hooks/useInsights';
import { monthKey } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { useRefunds } from '../../hooks/useRefunds';
import { usePrefetch } from '../../lib/prefetch';
import { usePrivacy } from '../../lib/privacy';
import { ShortcutHelp, useShortcuts } from './Shortcuts';

export default function AppLayout() {
  return (
    <TransactionDialogProvider>
      <Shell />
    </TransactionDialogProvider>
  );
}

const COLLAPSE_KEY = 'keeper.sidebar';

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** The icon-only sidebar, remembered on this device. */
function useCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const toggle = () => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* storage unavailable: still works this visit */ }
    return !c;
  });
  return [collapsed, toggle];
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const online = useOnline();
  const [privacy, togglePrivacy] = usePrivacy();
  const [collapsedPref, toggleCollapsed] = useCollapsed();
  const desktop = useMediaQuery('(min-width: 768px)');
  const collapsed = collapsedPref && desktop;
  useShortcuts(togglePrivacy);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex h-screen w-full bg-background text-primary font-sans">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:p-3 focus:bg-surface">Skip to content</a>

      {/* Desktop sidebar / mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-sidebar flex flex-col pt-5 pb-4 transition-[transform,width] duration-200 md:static md:translate-x-0 shadow-[1px_0_0_var(--border-color)]',
          collapsed ? 'w-[72px]' : 'w-[256px]',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar shadow-[0_1px_0_var(--border-color)]">
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold flex items-center gap-2"><img src={logo} alt="" className="w-6 h-6 rounded-md" />Keeper</span>
          <ViewControls privacy={privacy} onPrivacy={togglePrivacy} />
        </header>
        <header className="hidden md:flex items-center justify-between gap-3 px-8 lg:px-12 h-14 shrink-0">
          <button onClick={toggleCollapsed} aria-label={collapsed ? 'Expand menu' : 'Collapse menu'} title={collapsed ? 'Expand menu' : 'Collapse menu'} className="p-2 -ml-2 rounded-lg text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/10">
            {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => window.dispatchEvent(new Event('keeper:search'))} className="hidden lg:flex items-center gap-2 h-9 pl-3 pr-2 mr-1 rounded-xl bg-primary/[0.05] hover:bg-primary/[0.08] text-secondary text-body transition-colors">
              <Search className="w-4 h-4" /> Search
              <kbd className="ml-6 text-[11px] rounded-md bg-surface px-1.5 py-0.5 shadow-card tabular-nums">⌘K</kbd>
            </button>
            <ViewControls privacy={privacy} onPrivacy={togglePrivacy} />
          </div>
        </header>
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 py-1.5 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <WifiOff className="w-3.5 h-3.5" /> You're offline. Showing saved data; changes need a connection.
          </div>
        )}
        <main id="main" className="flex-1 overflow-y-auto page-glow">
          <div key={location.pathname.split('/')[1]} className="page-enter w-full max-w-[1180px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:pt-4 sm:pb-12 pb-28 md:pb-12">
            <InvitationBanner />
            <ErrorBoundary>
              <Suspense fallback={<div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /></div>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <TabBar />
        <AddFab />
      </div>
      <CommandPalette />
      <ShortcutHelp />
    </div>
  );
}

/** Hide amounts and light/dark, together in one tidy spot at the top right. */
function ViewControls({ privacy, onPrivacy }: { privacy: boolean; onPrivacy: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const btn = 'p-2 rounded-lg text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors';
  return (
    <div className="flex items-center">
      <button onClick={onPrivacy} aria-pressed={privacy} aria-label={privacy ? 'Show amounts' : 'Hide amounts'} title={privacy ? 'Show amounts (P)' : 'Hide amounts (P)'} className={cn(btn, privacy && 'text-accent bg-accent/10')}>
        {privacy ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
      </button>
      <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'} className={btn}>
        {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>
    </div>
  );
}

const linkClass = (active: boolean) =>
  cn('flex items-center gap-3 px-3 py-2 text-body font-medium rounded-xl transition-colors', active ? 'bg-accent/10 text-accent' : 'text-primary/75 hover:bg-black/5 dark:hover:bg-white/5');

function Badge({ n, label }: { n: number; label: string }) {
  return <span className="ml-auto text-[11px] font-semibold rounded-full px-1.5 py-0.5 bg-accent text-white tabular-nums" aria-label={label}>{n}</span>;
}

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { workspaces, workspace, selectWorkspace, user, logout } = useAuth();
  const location = useLocation();
  const waiting = useInboxCount().data ?? 0;
  const refunds = useRefunds().data?.pendingCount ?? 0;
  const safe = useDashboard(monthKey(new Date())).data;
  const prefetch = usePrefetch();
  const link = (active: boolean) => cn(linkClass(active), collapsed && 'justify-center px-0');
  const subTabs = (path: string) => (path === '/plan' ? PLAN_TABS : path === '/wealth' ? WEALTH_TABS : null);

  return (
    <>
      <div className={cn('mb-5 flex items-center', collapsed ? 'justify-center' : 'px-5')}>
        <h1 className="text-[19px] font-bold tracking-tight flex items-center gap-2.5">
          <img src={logo} alt="Keeper" className="w-8 h-8 rounded-[10px]" />
          {!collapsed && 'Keeper'}
        </h1>
      </div>

      {/* Everyone has one personal ledger; the switcher only appears for older accounts with more. */}
      {workspaces.length > 1 && !collapsed && (
        <div className="px-4 mb-3">
          <label className="sr-only" htmlFor="ws-switch">Workspace</label>
          <select id="ws-switch" value={workspace?.id} onChange={(e) => selectWorkspace(e.target.value)} className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      <div className={cn('mb-4 hidden md:block', collapsed ? 'px-3' : 'px-4')}><AddButton compact={collapsed} /></div>

      <nav className={cn('flex-1 flex flex-col gap-0.5 overflow-y-auto', collapsed ? 'px-3' : 'px-4')} aria-label="Main">
        {SECTIONS.map((item) => {
          const active = sectionOwns(item, location.pathname);
          const tabs = subTabs(item.path);
          return (
            <div key={item.path}>
              <NavLink to={item.path} title={collapsed ? item.label : undefined} aria-label={item.label} onPointerEnter={() => prefetch(item.path)} onFocus={() => prefetch(item.path)} className={() => link(active)}>
                <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} />
                {!collapsed && item.label}
              </NavLink>
              {/* The section you are in opens up to show what is inside it. */}
              {active && tabs && !collapsed && (
                <ul className="ml-[22px] pl-3 my-1 border-l border-border space-y-0.5">
                  {tabs.map((t) => (
                    <li key={t.key}>
                      <NavLink to={`${item.path}/${t.key}`} className={({ isActive }) => cn('flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors', isActive ? 'text-accent bg-accent/10' : 'text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/5')}>
                        <t.icon className="w-4 h-4" />{t.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {(waiting > 0 || refunds > 0) && (
          <div className="mt-4 flex flex-col gap-0.5">
            {!collapsed && <p className="px-3 mb-1 text-caption font-semibold uppercase tracking-wider text-secondary">Waiting for you</p>}
            {waiting > 0 && (
              <NavLink to={WAITING.inbox.path} title={collapsed ? WAITING.inbox.label : undefined} className={({ isActive }) => link(isActive)}>
                <WAITING.inbox.icon className="w-[18px] h-[18px] shrink-0" />{!collapsed && <>{WAITING.inbox.label}<Badge n={waiting} label={`${waiting} to review`} /></>}
              </NavLink>
            )}
            {refunds > 0 && (
              <NavLink to={WAITING.refunds.path} title={collapsed ? WAITING.refunds.label : undefined} className={({ isActive }) => link(isActive)}>
                <WAITING.refunds.icon className="w-[18px] h-[18px] shrink-0" />{!collapsed && <>{WAITING.refunds.label}<Badge n={refunds} label={`${refunds} refunds waiting`} /></>}
              </NavLink>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-0.5">
          {!collapsed && <p className="px-3 mb-1 text-caption font-semibold uppercase tracking-wider text-secondary">More</p>}
          {MORE_PAGES.map((p) => (
            <NavLink key={p.path} to={p.path} title={collapsed ? p.label : undefined} aria-label={p.label} className={({ isActive }) => link(isActive)}>
              <p.icon className="w-[18px] h-[18px] shrink-0" />{!collapsed && p.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {!collapsed && safe && (
        <Link to="/dashboard" className="mx-4 mt-3 rounded-2xl p-3.5 bg-accent/[0.08] hover:bg-accent/[0.12] transition-colors">
          <p className="text-caption text-secondary">Safe to spend</p>
          <p className="text-[1.125rem] font-semibold tracking-[-0.02em] tabular-nums">{formatMoney(safe.safe.totalMinor, safe.currency)}</p>
          <p className="text-caption text-secondary">{safe.safe.daysLeft > 1 ? `${formatMoney(safe.safe.perDayMinor, safe.currency)} a day` : 'today'}</p>
        </Link>
      )}

      <div className={cn('mt-3 pt-3 flex flex-col gap-1', collapsed ? 'px-3' : 'px-4')}>
        <NavLink to={SETTINGS.path} title={collapsed ? SETTINGS.label : undefined} aria-label={SETTINGS.label} className={({ isActive }) => link(isActive)}>
          <SETTINGS.icon className="w-[18px] h-[18px] shrink-0" />{!collapsed && SETTINGS.label}
        </NavLink>
        <div className={cn('flex items-center gap-3 px-2 py-1 mt-1', collapsed && 'justify-center px-0')}>
          <span title={collapsed ? user?.email : undefined} className="w-8 h-8 rounded-full bg-accent/15 text-accent text-sm font-semibold flex items-center justify-center shrink-0" aria-hidden>{(user?.name || user?.email || '?').charAt(0).toUpperCase()}</span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate">{user?.name || 'Account'}</p>
                <p className="text-xs text-secondary truncate" title={user?.email}>{user?.email}</p>
              </div>
              <button onClick={() => void logout()} aria-label="Log out" title="Log out" className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/10">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Phone: the five sections along the bottom, where a thumb can reach them. */
function TabBar() {
  const location = useLocation();
  const prefetch = usePrefetch();
  return (
    <nav aria-label="Sections" className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur shadow-[0_-1px_0_var(--border-color)] safe-bottom">
      <ul className="grid grid-cols-5">
        {SECTIONS.map((item) => {
          const active = sectionOwns(item, location.pathname);
          return (
            <li key={item.path}>
              <NavLink to={item.path} onPointerDown={() => prefetch(item.path)} className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', active ? 'text-accent' : 'text-secondary')} aria-current={active ? 'page' : undefined}>
                <item.icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phone: the one action you do all day, always in reach above the tab bar. */
function AddFab() {
  const dialog = useTransactionDialog();
  return (
    <button
      onClick={() => dialog.open()}
      aria-label="Add transaction"
      className="md:hidden fixed right-4 bottom-[76px] z-30 w-14 h-14 rounded-full bg-accent text-white shadow-lift flex items-center justify-center active:scale-95 transition-transform"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Plus className="w-6 h-6" strokeWidth={2.4} />
    </button>
  );
}

function AddButton({ compact }: { compact?: boolean }) {
  const dialog = useTransactionDialog();
  return (
    <button
      onClick={() => dialog.open()}
      aria-label="Add transaction"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-background font-medium shadow-[0_1px_2px_rgb(0_0_0/0.25),inset_0_1px_0_rgb(255_255_255/0.14)] hover:opacity-90 active:scale-[0.98] transition-all',
        compact ? 'h-11 w-11 mx-auto' : 'w-full h-11 text-sm',
      )}
    >
      <Plus className="w-4 h-4" />
      {!compact && <>Add transaction <kbd className="ml-auto mr-1 text-[10px] font-medium opacity-60 border border-current/30 rounded px-1">N</kbd></>}
    </button>
  );
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
