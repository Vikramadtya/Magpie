import { Banknote, CalendarDays, Check, CloudOff, CreditCard, KeyRound, Landmark, LogOut, PiggyBank, Share, StickyNote, Store, TrendingUp, Wallet, X, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { cn } from '../lib/cn';
import { exponent } from '../lib/money';
import { looksLikeKey, readKey, takeKeyFromAddress, writeKey } from './key';
import { enqueue, flush, readOutbox, type Entry } from './outbox';

interface Choices {
  accounts: { id: string; name: string; type: string; currency: string }[];
  categories: { id: string; name: string; kind: 'INCOME' | 'EXPENSE'; parentId: string | null }[];
}

type State =
  | { kind: 'loading' }
  | { kind: 'setup'; message?: string }
  | { kind: 'ready'; data: Choices; offline: boolean };

const CACHE = 'keeper.quickadd.choices';
const LAST_ACCOUNT = 'keeper.quickadd.account';
const RECENT = 'keeper.quickadd.recent.';

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

export default function QuickAdd() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const adopt = useCallback((data: Choices, offline = false) => {
    write(CACHE, JSON.stringify(data));
    setState({ kind: 'ready', data, offline });
  }, []);

  /** Asks Keeper's always-on endpoint for the accounts and categories this key may use. */
  const connect = useCallback(
    async (key: string | null) => {
      if (!key) return setState({ kind: 'setup' });
      try {
        const res = await fetch('/api/quickadd/choices', { headers: { Authorization: `Bearer ${key}` } });
        if (res.ok) {
          writeKey(key);
          return adopt((await res.json()) as Choices);
        }
        if (res.status === 401) {
          writeKey(null);
          write(CACHE, null);
          return setState({ kind: 'setup', message: 'That key was not accepted. It may have been revoked. Create a new one in Keeper.' });
        }
        throw new Error(`HTTP ${res.status}`);
      } catch {
        // No connection: the form still works from what this phone remembers.
        const cached = read(CACHE);
        if (cached && readKey()) {
          try {
            return setState({ kind: 'ready', data: JSON.parse(cached) as Choices, offline: true });
          } catch {
            /* fall through */
          }
        }
        setState({ kind: 'setup', message: "Can't reach the server. Connect once to set this page up." });
      }
    },
    [adopt],
  );

  useEffect(() => {
    void connect(takeKeyFromAddress() ?? readKey());
  }, [connect]);

  const resync = useCallback(() => void connect(readKey()), [connect]);

  const disconnect = () => {
    writeKey(null);
    write(CACHE, null);
    setState({ kind: 'setup' });
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
            <button type="button" onClick={disconnect} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-secondary shadow-card" aria-label="Disconnect this phone">
              <LogOut className="w-3.5 h-3.5" /> Disconnect
            </button>
          )}
        </header>
        {state.kind === 'loading' && <div role="status" aria-label="Loading" className="mx-auto mt-24 w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />}
        {state.kind === 'setup' && <Setup message={state.message} onKey={(k) => void connect(k)} />}
        {state.kind === 'ready' && <Form data={state.data} offline={state.offline} onBadKey={resync} />}
      </div>
    </main>
  );
}

/** First visit: the key comes from Keeper's Settings, as a link to open or text to paste. */
function Setup({ message, onKey }: { message?: string; onKey: (key: string) => void }) {
  const [text, setText] = useState('');
  const valid = looksLikeKey(text);
  return (
    <section className="glass-panel p-7 space-y-5 mt-6">
      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary text-background"><KeyRound className="w-6 h-6" /></span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Connect this phone</h2>
        <ol className="mt-2 text-sm text-secondary list-decimal pl-5 space-y-1">
          <li>In Keeper, open Settings, then Quick add.</li>
          <li>Create a key and open its setup link on this phone, or paste the key below.</li>
        </ol>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (valid) onKey(text.trim()); }} className="space-y-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="qak_…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Quick add key"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button type="submit" disabled={!valid} className="w-full h-12 rounded-xl bg-primary text-background font-semibold disabled:opacity-40">Connect</button>
      </form>
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

const TIP_SEEN = 'keeper.quickadd.tip';

/** iPhone only, and only in the browser: how to put this page on the home screen. */
function InstallTip() {
  const [hidden, setHidden] = useState(() => read(TIP_SEEN) === '1');
  const onIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (hidden || !onIphone || installed) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 text-sm shadow-card" role="note">
      <span className="grid place-items-center w-8 h-8 shrink-0 rounded-xl bg-accent/10 text-accent"><Share className="w-4 h-4" /></span>
      <p className="flex-1 text-secondary leading-snug"><span className="text-primary font-medium">Keep it one tap away.</span> In Safari, tap <Share className="w-3.5 h-3.5 inline -mt-0.5" /> Share, then <b className="text-primary">Add to Home Screen</b>.</p>
      <button type="button" aria-label="Dismiss" onClick={() => { write(TIP_SEEN, '1'); setHidden(true); }} className="text-secondary p-1 -m-1"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Form({ data, offline, onBadKey }: { data: Choices; offline: boolean; onBadKey: () => void }) {
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
    if (out.badKey) onBadKey();
    return out;
  }, [onBadKey]);

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

      <InstallTip />
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
              {t === 'EXPENSE' ? 'Spending' : 'Income'}
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
