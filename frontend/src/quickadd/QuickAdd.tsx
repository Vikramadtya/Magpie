import { Banknote, CalendarDays, Check, CloudOff, CreditCard, Landmark, LogOut, PiggyBank, Store, StickyNote, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '../lib/cn';
import { exponent } from '../lib/money';
import { enqueue, flush, readOutbox, type Entry } from './outbox';

interface Choices {
  name: string;
  accounts: { id: string; name: string; type: string; currency: string }[];
  categories: { id: string; name: string; kind: 'INCOME' | 'EXPENSE'; parentId: string | null }[];
}

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out'; clientId: string | null; message?: string }
  | { kind: 'ready'; data: Choices; offline: boolean };

const CACHE = 'keeper.quickadd.choices';
const LAST_ACCOUNT = 'keeper.quickadd.account';
const RECENT = 'keeper.quickadd.recent.';
const HEADERS = { 'Content-Type': 'application/json', 'X-Quickadd': '1' };

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private mode: the page still works, it just forgets
  }
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface GoogleId {
  accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void } };
}
declare global {
  interface Window {
    google?: GoogleId;
  }
}

function loadGoogle(): Promise<void> {
  if (window.google) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google sign-in could not load'));
    document.head.appendChild(s);
  });
}

export default function QuickAdd() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const adopt = useCallback((data: Choices, offline = false) => {
    write(CACHE, JSON.stringify(data));
    setState({ kind: 'ready', data, offline });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/quickadd/session', { credentials: 'same-origin' });
      if (res.ok) return adopt((await res.json()) as Choices);
      if (res.status === 401) {
        const body = (await res.json().catch(() => ({}))) as { clientId?: string };
        return setState({ kind: 'signed-out', clientId: body.clientId ?? null });
      }
      throw new Error(`HTTP ${res.status}`);
    } catch {
      // No connection: the form still works from what this phone remembers.
      const cached = read(CACHE);
      if (cached) {
        try {
          return setState({ kind: 'ready', data: JSON.parse(cached) as Choices, offline: true });
        } catch {
          /* fall through */
        }
      }
      setState({ kind: 'signed-out', clientId: null, message: "Can't reach the server. Connect once to set this page up." });
    }
  }, [adopt]);

  useEffect(() => {
    void load();
  }, [load]);

  const resync = useCallback(() => void load(), [load]);

  const signIn = useCallback(
    async (credential: string) => {
      const res = await fetch('/api/quickadd/session', { method: 'POST', credentials: 'same-origin', headers: HEADERS, body: JSON.stringify({ credential }) });
      if (res.ok) return adopt((await res.json()) as Choices);
      const message = res.status === 403 ? 'That Google account has no Keeper account. Sign in to Keeper with Google first.' : 'Google sign-in failed. Try again.';
      setState((s) => ({ kind: 'signed-out', clientId: s.kind === 'signed-out' ? s.clientId : null, message }));
    },
    [adopt],
  );

  const signOut = async () => {
    await fetch('/api/quickadd/session', { method: 'DELETE', credentials: 'same-origin', headers: HEADERS }).catch(() => undefined);
    write(CACHE, null);
    void load();
  };

  return (
    <main className="page-glow min-h-[100dvh] w-full min-w-0 text-primary">
      <div className="mx-auto w-full max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-primary text-background"><Wallet className="w-4 h-4" /></span>
            <h1 className="text-base font-semibold tracking-tight">Quick add</h1>
          </div>
          {state.kind === 'ready' && (
            <button type="button" onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-3 py-1 text-xs text-secondary shadow-card" aria-label={`Sign out ${state.data.name}`}>
              <Avatar name={state.data.name || 'You'} size={24} />
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </header>
        {state.kind === 'loading' && <div role="status" aria-label="Loading" className="mx-auto mt-24 w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />}
        {state.kind === 'signed-out' && <SignIn clientId={state.clientId} message={state.message} onCredential={signIn} />}
        {state.kind === 'ready' && <Form data={state.data} offline={state.offline} onSignedOut={resync} />}
      </div>
    </main>
  );
}

function SignIn({ clientId, message, onCredential }: { clientId: string | null; message?: string; onCredential: (c: string) => Promise<void> }) {
  const slot = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogle()
      .then(() => {
        if (cancelled || !slot.current || !window.google) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: (r: { credential: string }) => void onCredential(r.credential), auto_select: false });
        window.google.accounts.id.renderButton(slot.current, { theme: 'outline', size: 'large', shape: 'pill', width: 280, text: 'signin_with' });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  return (
    <section className="glass-panel p-7 text-center space-y-5 mt-10">
      <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-primary text-background"><Wallet className="w-6 h-6" /></span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Add spending in seconds</h2>
        <p className="text-sm text-secondary mt-1.5">Sign in with the Google account you use for Keeper. You only do this once on this phone.</p>
      </div>
      {clientId ? <div ref={slot} className="flex justify-center min-h-[44px]" /> : null}
      {failed && <p role="alert" className="text-sm text-red-500">Google sign-in could not load. Check your connection and reload.</p>}
      {message && <p role="alert" className="text-sm text-red-500">{message}</p>}
    </section>
  );
}

const ACCOUNT_ICONS: Record<string, LucideIcon> = { CREDIT_CARD: CreditCard, CASH: Banknote, SAVINGS: PiggyBank, INVESTMENT: TrendingUp, CHECKING: Landmark };
const DOTS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'];

function readRecent(type: string): string[] {
  try {
    const parsed: unknown = JSON.parse(read(RECENT + type) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function Chip({ selected, onClick, children, dot }: { selected: boolean; onClick: () => void; children: React.ReactNode; dot?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'shrink-0 snap-start inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95',
        selected ? 'border-accent bg-accent/10 text-accent shadow-card' : 'border-border bg-surface text-primary/80',
      )}
    >
      {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function Form({ data, offline, onSignedOut }: { data: Choices; offline: boolean; onSignedOut: () => void }) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const remembered = read(LAST_ACCOUNT);
  const [accountId, setAccountId] = useState(data.accounts.find((a) => a.id === remembered)?.id ?? data.accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState('');
  const [payee, setPayee] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(readOutbox().length);
  const [justSaved, setJustSaved] = useState<'sent' | 'queued' | null>(null);
  const amountInput = useRef<HTMLInputElement>(null);

  const account = data.accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? 'USD';
  const income = type === 'INCOME';

  const ofKind = useMemo(() => data.categories.filter((c) => c.kind === type), [data.categories, type]);
  const groups = useMemo(() => ofKind.filter((c) => !c.parentId).map((parent) => ({ parent, children: ofKind.filter((c) => c.parentId === parent.id) })), [ofKind]);
  // One-tap shortcuts: what you used last, then the first few categories.
  const shortcuts = useMemo(() => {
    const byId = new Map(ofKind.map((c) => [c.id, c]));
    const recent = readRecent(type).map((id) => byId.get(id)).filter((c): c is Choices['categories'][number] => !!c);
    const rest = ofKind.filter((c) => !c.parentId && !recent.includes(c));
    return [...recent, ...rest].slice(0, 8);
  }, [ofKind, type]);
  const picked = ofKind.find((c) => c.id === categoryId);

  const drain = useCallback(async () => {
    const out = await flush();
    setWaiting(out.left);
    if (out.signedOut) onSignedOut();
    return out;
  }, [onSignedOut]);

  useEffect(() => {
    void drain();
    const again = () => void drain();
    window.addEventListener('online', again);
    return () => window.removeEventListener('online', again);
  }, [drain]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = amount.replace(/[^0-9.]/g, '');
    const [, frac = ''] = cleaned.split('.');
    if (!cleaned || Number(cleaned) <= 0 || (cleaned.match(/\./g)?.length ?? 0) > 1 || frac.length > exponent(currency)) {
      return setError(`Enter an amount in ${currency}`);
    }
    if (!accountId) return setError('Choose an account');
    setError('');
    write(LAST_ACCOUNT, accountId);
    if (categoryId) write(RECENT + type, JSON.stringify([categoryId, ...readRecent(type).filter((id) => id !== categoryId)].slice(0, 6)));
    const entry: Entry = {
      key: crypto.randomUUID(),
      type,
      amount: cleaned,
      accountId,
      categoryId: categoryId || undefined,
      payee: payee.trim() || undefined,
      note: note.trim() || undefined,
      occurredOn: date,
    };
    enqueue(entry);
    setAmount('');
    setPayee('');
    setNote('');
    setCategoryId('');
    const out = await drain();
    setJustSaved(out.left === 0 ? 'sent' : 'queued');
    window.setTimeout(() => setJustSaved(null), 4000);
    amountInput.current?.focus();
  };

  if (data.accounts.length === 0) {
    return <p className="glass-panel p-6 text-sm text-secondary text-center mt-6">Add an account in Keeper first, then come back here.</p>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="pb-40">
      {offline && (
        <p role="status" className="mb-3 text-xs text-secondary inline-flex items-center gap-1.5">
          <CloudOff className="w-3.5 h-3.5" /> Offline. Entries are kept on this phone and sent later.
        </p>
      )}

      <section className="hero-card px-5 pt-5 pb-6 text-white">
        <div className="inline-flex p-1 rounded-full bg-white/10 text-sm font-medium" role="tablist">
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => { setType(t); setCategoryId(''); }}
              className={cn('px-4 py-1.5 rounded-full transition-all', type === t ? (t === 'INCOME' ? 'bg-emerald-400 text-emerald-950' : 'bg-white text-neutral-900') : 'text-white/70')}
            >
              {t === 'EXPENSE' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>
        <label htmlFor="qa-amount" className="sr-only">Amount</label>
        <div className="mt-5 flex items-baseline justify-center gap-2">
          <span className="text-lg font-medium text-white/60">{currency}</span>
          <input
            id="qa-amount"
            ref={amountInput}
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => /^[\d,]*\.?\d*$/.test(e.target.value) && setAmount(e.target.value)}
            className={cn('w-full max-w-[16rem] min-w-0 bg-transparent leading-none font-semibold tabular-nums tracking-[-0.03em] text-center outline-none placeholder:text-white/25', amount.length > 9 ? 'text-4xl' : amount.length > 6 ? 'text-5xl' : 'text-[3.5rem]', income && 'text-emerald-300')}
          />
        </div>
        <p className="mt-3 text-center text-xs text-white/60">{income ? 'into' : 'from'} {account?.name}</p>
        {error && <p role="alert" className="mt-2 text-center text-sm text-rose-300">{error}</p>}
      </section>

      <h2 className="mt-6 mb-2 px-1 text-xs font-medium uppercase tracking-wider text-secondary">Account</h2>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto snap-x pb-1 [scrollbar-width:none]">
        {data.accounts.map((a) => {
          const Icon = ACCOUNT_ICONS[a.type] ?? Wallet;
          return <Chip key={a.id} selected={a.id === accountId} onClick={() => setAccountId(a.id)}><Icon className="w-4 h-4" />{a.name}</Chip>;
        })}
      </div>

      <h2 className="mt-5 mb-2 px-1 text-xs font-medium uppercase tracking-wider text-secondary">Category</h2>
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto snap-x pb-1 [scrollbar-width:none]">
        {shortcuts.map((c, i) => <Chip key={c.id} selected={c.id === categoryId} dot={DOTS[i % DOTS.length]} onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}>{c.name}</Chip>)}
      </div>
      <div className="relative mt-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="All categories"
          className="w-full appearance-none rounded-xl border border-border bg-surface px-4 py-3 pr-10 text-base text-primary/80 shadow-card outline-none focus:border-accent"
        >
          <option value="">{picked ? picked.name : 'More categories…'}</option>
          {groups.map((g) => (
            <optgroup key={g.parent.id} label={g.parent.name}>
              <option value={g.parent.id}>{g.parent.name}</option>
              {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary">⌄</span>
      </div>

      <section className="glass-panel mt-5 divide-y divide-border overflow-hidden">
        <label className="flex items-center gap-3 px-4 py-3.5">
          <Store className="w-4 h-4 text-secondary shrink-0" />
          <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Paid to / what for" maxLength={160} aria-label="Paid to" className="w-full bg-transparent text-base outline-none placeholder:text-secondary/60" />
        </label>
        <label className="flex items-center gap-3 px-4 py-3.5">
          <StickyNote className="w-4 h-4 text-secondary shrink-0" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={200} aria-label="Note" className="w-full bg-transparent text-base outline-none placeholder:text-secondary/60" />
        </label>
        <label className="flex items-center gap-3 px-4 py-3.5">
          <CalendarDays className="w-4 h-4 text-secondary shrink-0" />
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} aria-label="Date" className="w-full bg-transparent text-base outline-none" />
        </label>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border/60 bg-background/85 backdrop-blur-xl px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <p className="min-h-[1.25rem] mb-2 text-center text-xs" aria-live="polite">
            {justSaved === 'sent' && <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium"><Check className="w-3.5 h-3.5" /> Saved. Waiting in Keeper's To review.</span>}
            {justSaved === 'queued' && <span className="inline-flex items-center gap-1.5 text-secondary"><CloudOff className="w-3.5 h-3.5" /> Saved on this phone. It will send when you're online.</span>}
            {!justSaved && waiting > 0 && <span className="text-secondary">{waiting} waiting to send</span>}
          </p>
          <button type="submit" className={cn('w-full h-14 rounded-2xl text-base font-semibold text-white shadow-lift transition-all active:scale-[0.98]', income ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-accent to-indigo-500')}>
            {income ? 'Add income' : 'Add expense'}
          </button>
        </div>
      </div>
    </form>
  );
}
