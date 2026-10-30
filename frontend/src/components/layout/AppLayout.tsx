import { LogOut, Menu, Moon, Plus, Sun, WifiOff, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import { useAuth } from '../../auth/AuthProvider';
import { TransactionDialogProvider, useTransactionDialog } from '../../features/transactions/TransactionDialog';
import { cn } from '../../lib/cn';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Skeleton } from '../ui/StateView';
import { CommandPalette } from './CommandPalette';
import { InvitationBanner } from './InvitationBanner';
import { useInboxCount } from '../../hooks/useInbox';
import { NAV_GROUPS } from './nav';

export default function AppLayout() {
  return (
    <TransactionDialogProvider>
      <Shell />
    </TransactionDialogProvider>
  );
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const online = useOnline();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex h-screen w-full bg-background text-primary font-sans">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:p-3 focus:bg-surface">Skip to content</a>

      {/* Desktop sidebar / mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[256px] border-r border-border bg-sidebar flex flex-col pt-6 pb-4 transition-transform md:static md:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent />
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold flex items-center gap-2"><img src={logo} alt="" className="w-5 h-5" />Keeper</span>
          <AddButton compact />
        </header>
        {!online && (
          <div role="status" className="flex items-center justify-center gap-2 py-1.5 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <WifiOff className="w-3.5 h-3.5" /> You're offline. Showing saved data; changes need a connection.
          </div>
        )}
        <main id="main" className="flex-1 overflow-y-auto page-glow">
          <div key={location.pathname} className="page-enter w-full max-w-[1180px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
            <InvitationBanner />
            <ErrorBoundary>
              <Suspense fallback={<div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40" /></div>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}

function SidebarContent() {
  const { workspaces, workspace, selectWorkspace, user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const waiting = useInboxCount().data ?? 0;
  return (
    <>
      <div className="px-5 mb-4 flex items-center justify-between">
        <h1 className="text-[19px] font-bold tracking-tight flex items-center gap-2">
          <img src={logo} alt="" className="w-6 h-6" />
          Keeper
        </h1>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle dark mode"
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-secondary"
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Everyone has one personal ledger; the switcher only appears for older accounts with more. */}
      {workspaces.length > 1 && (
      <div className="px-4 mb-3">
        <label className="sr-only" htmlFor="ws-switch">Workspace</label>
        <select
          id="ws-switch"
          value={workspace?.id}
          onChange={(e) => selectWorkspace(e.target.value)}
          className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>
      )}

      <div className="px-4 mb-3 hidden md:block"><AddButton /></div>

      <nav className="flex-1 px-4 flex flex-col gap-4 overflow-y-auto" aria-label="Main">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.label && <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-secondary">{group.label}</p>}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[7px] text-[14px] font-medium rounded-lg transition-colors',
                    isActive ? 'bg-accent/10 text-accent' : 'text-primary/80 hover:bg-black/5 dark:hover:bg-white/5',
                  )
                }
              >
                <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
                {item.label}
                {item.path === '/inbox' && waiting > 0 && (
                  <span className="ml-auto text-[11px] font-semibold rounded-full px-1.5 py-0.5 bg-accent text-white" aria-label={`${waiting} to review`}>{waiting}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-4 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-1">
          <span className="w-8 h-8 rounded-full bg-accent/15 text-accent text-sm font-semibold flex items-center justify-center shrink-0" aria-hidden>{(user?.name || user?.email || '?').charAt(0).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">{user?.name || 'Account'}</p>
            <p className="text-xs text-secondary truncate" title={user?.email}>{user?.email}</p>
          </div>
          <button onClick={() => void logout()} aria-label="Log out" title="Log out" className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/10">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
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
        compact ? 'h-9 w-9' : 'w-full h-11 text-sm',
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
