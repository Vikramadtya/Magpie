import { Check, CloudOff, LogOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Segmented } from '../components/ui/Segmented';
import { Select } from '../components/ui/Select';
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
    <main className="min-h-[100dvh] bg-background text-primary px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold tracking-tight">Quick add</h1>
          {state.kind === 'ready' && (
            <button type="button" onClick={() => void signOut()} className="text-xs text-secondary inline-flex items-center gap-1" aria-label="Sign out">
              <LogOut className="w-3.5 h-3.5" /> {state.data.name || 'Sign out'}
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
    <section className="glass-panel p-6 text-center space-y-5">
      <p className="text-sm text-secondary">Sign in with the Google account you use for Keeper. You only do this once on this phone.</p>
      {clientId ? <div ref={slot} className="flex justify-center min-h-[44px]" /> : null}
      {failed && <p role="alert" className="text-sm text-red-500">Google sign-in could not load. Check your connection and reload.</p>}
      {message && <p role="alert" className="text-sm text-red-500">{message}</p>}
    </section>
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

  const groups = useMemo(() => {
    const ofKind = data.categories.filter((c) => c.kind === type);
    return ofKind.filter((c) => !c.parentId).map((parent) => ({ parent, children: ofKind.filter((c) => c.parentId === parent.id) }));
  }, [data.categories, type]);

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
    return <p className="glass-panel p-6 text-sm text-secondary text-center">Add an account in Keeper first, then come back here.</p>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      {offline && (
        <p role="status" className="text-xs text-secondary inline-flex items-center gap-1.5">
          <CloudOff className="w-3.5 h-3.5" /> Offline. Entries are kept on this phone and sent later.
        </p>
      )}
      <Segmented value={type} onChange={(v) => { setType(v); setCategoryId(''); }} options={[['EXPENSE', 'Expense'], ['INCOME', 'Income']] as const} className="w-full [&>button]:flex-1" />

      <div>
        <label htmlFor="qa-amount" className="sr-only">Amount</label>
        <div className="flex items-baseline justify-center gap-2 py-2">
          <span className="text-secondary text-lg">{currency}</span>
          <input
            id="qa-amount"
            ref={amountInput}
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => /^[\d,]*\.?\d*$/.test(e.target.value) && setAmount(e.target.value)}
            className="w-48 bg-transparent text-5xl font-semibold tabular-nums tracking-tight text-center outline-none placeholder:text-secondary/40"
          />
        </div>
        {error && <p role="alert" className="text-xs text-red-500 text-center">{error}</p>}
      </div>

      <div className="space-y-3">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Account">
          {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">No category yet</option>
          {groups.map((g) => (
            <optgroup key={g.parent.id} label={g.parent.name}>
              <option value={g.parent.id}>{g.parent.name}</option>
              {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </Select>
        <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Paid to / what for" maxLength={160} aria-label="Paid to" />
        <div className="grid grid-cols-2 gap-3">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={200} aria-label="Note" />
          <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} aria-label="Date" />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full">Add</Button>

      <div className="min-h-[2.5rem] text-center text-sm" aria-live="polite">
        {justSaved === 'sent' && <p className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Check className="w-4 h-4" /> Saved. It's waiting in Keeper's To review.</p>}
        {justSaved === 'queued' && <p className="inline-flex items-center gap-1.5 text-secondary"><CloudOff className="w-4 h-4" /> Saved on this phone. It will send when you're online.</p>}
        {!justSaved && waiting > 0 && <p className="text-secondary">{waiting} waiting to send</p>}
      </div>
    </form>
  );
}
