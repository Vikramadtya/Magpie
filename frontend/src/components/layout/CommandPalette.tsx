import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '../../auth/AuthProvider';
import type { SearchHit } from '../../api/types';
import { useTransactionDialog } from '../../features/transactions/TransactionDialog';
import { useGlobalSearch } from '../../hooks/useSearch';
import { NAV_ITEMS } from './nav';

/** ⌘K / Ctrl+K: jump anywhere or start an entry without touching the mouse. */
const KIND_LABEL: Record<SearchHit['kind'], string> = {
  transaction: 'Transactions', account: 'Accounts', payee: 'Payees', category: 'Categories', tag: 'Tags', trip: 'Trips', loan: 'Loans', goal: 'Goals', holding: 'Investments',
};
const KIND_ORDER = Object.keys(KIND_LABEL) as SearchHit['kind'][];

/** Where a search result leads. */
function destination(h: SearchHit): string {
  const q = encodeURIComponent;
  switch (h.kind) {
    case 'transaction': return `/transactions?q=${q(h.title)}`;
    case 'account': return `/transactions?account=${h.id}`;
    case 'payee': return `/transactions?payee=${h.id}`;
    case 'category': return `/transactions?category=${h.id}`;
    case 'tag': return `/transactions?tag=${h.id}`;
    case 'trip': return `/trips/${h.id}`;
    case 'loan': return '/loans';
    case 'goal': return '/goals';
    default: return '/investments';
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const found = useGlobalSearch(query);
  const navigate = useNavigate();
  const dialog = useTransactionDialog();
  const { workspaces, workspace, selectWorkspace } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input,textarea,select,[contenteditable]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        dialog.open();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    setQuery('');
    fn();
  };

  const hits = found.data ?? [];

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command palette" className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <Command.Input value={query} onValueChange={setQuery} placeholder="Search everything, or type a command…" className="w-full px-4 py-3 bg-transparent border-b border-border text-sm outline-none" />
        <Command.List className="max-h-80 overflow-y-auto p-2 text-sm">
          {hits.length === 0 && <Command.Empty className="px-3 py-6 text-center text-secondary">{found.isFetching ? 'Searching…' : 'No results'}</Command.Empty>}
          {KIND_ORDER.filter((k) => hits.some((h) => h.kind === k)).map((kind) => (
            <Command.Group key={kind} forceMount heading={KIND_LABEL[kind]} className="text-xs text-secondary [&_[cmdk-item]]:text-primary">
              {hits.filter((h) => h.kind === kind).map((h) => (
                <Command.Item key={`${h.kind}-${h.id}`} forceMount value={`${h.kind}-${h.id}`} onSelect={run(() => navigate(destination(h)))} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-accent data-[selected=true]:text-white">
                  <span className="truncate">{h.title}</span>
                  {h.subtitle && <span className="text-xs opacity-60 shrink-0 truncate max-w-[45%]">{h.subtitle}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
          <Command.Group heading="Actions" className="text-xs text-secondary [&_[cmdk-item]]:text-primary">
            <Item onSelect={run(() => dialog.open())} hint="N">Add transaction</Item>
            <Item onSelect={run(() => dialog.open(null, { type: 'TRANSFER' }))}>Add transfer</Item>
            <Item onSelect={run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>Toggle dark mode</Item>
          </Command.Group>
          <Command.Group heading="Go to" className="text-xs text-secondary [&_[cmdk-item]]:text-primary">
            {NAV_ITEMS.map((n) => (
              <Item key={n.path} onSelect={run(() => navigate(n.path))}>{n.label}</Item>
            ))}
          </Command.Group>
          {workspaces.length > 1 && (
            <Command.Group heading="Switch workspace" className="text-xs text-secondary [&_[cmdk-item]]:text-primary">
              {workspaces.filter((w) => w.id !== workspace?.id).map((w) => (
                <Item key={w.id} onSelect={run(() => selectWorkspace(w.id))}>{w.name}</Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function Item({ children, onSelect, hint }: { children: React.ReactNode; onSelect: () => void; hint?: string }) {
  return (
    <Command.Item onSelect={onSelect} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-accent data-[selected=true]:text-white">
      {children}
      {hint && <kbd className="text-xs opacity-60">{hint}</kbd>}
    </Command.Item>
  );
}
