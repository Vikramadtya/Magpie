import { endOfMonth, format, getDay, parseISO, startOfMonth } from 'date-fns';
import { Radar } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { BillItem, SpottedCharge } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MonthPicker } from '../components/ui/MonthPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/StateView';
import { useBillsCalendar, useSpottedCharges } from '../hooks/useBills';
import { useSaveRecurring } from '../hooks/usePlanning';
import { useAccounts } from '../hooks/useReference';
import { cn } from '../lib/cn';
import { monthKey, prettyDate } from '../lib/dates';
import { errorMessage } from '../lib/http';
import { formatMoney } from '../lib/money';

const STATUS: Record<BillItem['status'], { label: string; dot: string; text: string }> = {
  POSTED: { label: 'Paid', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  DUE: { label: 'Due', dot: 'bg-accent', text: 'text-accent' },
  OVERDUE: { label: 'Overdue', dot: 'bg-red-500', text: 'text-red-500' },
  EXPECTED: { label: 'Expected', dot: 'bg-amber-500', text: 'text-amber-600' },
};

export default function BillsPage() {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const cal = useBillsCalendar(month);
  const items = cal.data?.items ?? [];
  const money = items.filter((i) => i.type === 'EXPENSE' && i.status !== 'POSTED');
  const { baseCurrency } = useWorkspace();
  const dueTotal = money.reduce((a, i) => a + i.amountMinor, 0);

  return (
    <>
      <PageHeader title="Bills" subtitle="What was paid, what is due, and what Keeper expects next." actions={<MonthPicker month={month} onChange={setMonth} />} />
      <div className="space-y-6">
        <Spotted />
        <section className="glass-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-body text-secondary">Still to pay this month: <strong className="text-primary tabular-nums">{formatMoney(dueTotal, baseCurrency)}</strong></p>
            <Segmented value={view} onChange={setView} options={[['calendar', 'Calendar'], ['list', 'List']] as const} />
          </div>
          {cal.isLoading ? <Skeleton className="h-72" /> : items.length === 0 ? (
            <p className="text-body text-secondary py-10 text-center">No bills this month. Add recurring items under Recurring, or track a spotted charge above.</p>
          ) : view === 'calendar' ? <Grid month={month} items={items} /> : <List items={items} />}
        </section>
      </div>
    </>
  );
}

function Grid({ month, items }: { month: string; items: BillItem[] }) {
  const first = startOfMonth(parseISO(`${month}-01`));
  const days = endOfMonth(first).getDate();
  const lead = (getDay(first) + 6) % 7; // week starts on Monday
  const byDay = useMemo(() => {
    const m = new Map<number, BillItem[]>();
    items.forEach((i) => { const d = parseISO(i.date).getDate(); m.set(d, [...(m.get(d) ?? []), i]); });
    return m;
  }, [items]);
  const today = new Date();
  const isToday = (d: number) => format(today, 'yyyy-MM') === month && today.getDate() === d;
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-px min-w-[34rem] rounded-xl overflow-hidden bg-border">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="bg-surface text-caption text-secondary text-center py-2">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="bg-surface min-h-[5.5rem]" />)}
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <div key={d} className={cn('bg-surface min-h-[5.5rem] p-1.5', isToday(d) && 'bg-accent/[0.06]')}>
            <p className={cn('text-caption', isToday(d) ? 'text-accent font-semibold' : 'text-secondary')}>{d}</p>
            <ul className="mt-1 space-y-0.5">
              {(byDay.get(d) ?? []).map((i, k) => (
                <li key={k} title={`${i.name} · ${STATUS[i.status].label}`} className="flex items-center gap-1 text-[11px] leading-tight">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS[i.status].dot)} />
                  <span className="truncate">{i.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-4 mt-3 text-caption text-secondary">
        {Object.values(STATUS).map((s) => <li key={s.label} className="flex items-center gap-1.5"><span className={cn('w-2 h-2 rounded-full', s.dot)} />{s.label}</li>)}
      </ul>
    </div>
  );
}

function List({ items }: { items: BillItem[] }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((i, k) => (
        <li key={k} className="py-3 flex items-center justify-between gap-3 text-body">
          <span className="min-w-0"><span className="font-medium">{i.name}</span> <span className="text-caption text-secondary">· {prettyDate(i.date)}</span></span>
          <span className="flex items-center gap-3 shrink-0"><span className={cn('text-caption', STATUS[i.status].text)}>{STATUS[i.status].label}</span><Amount minor={i.type === 'INCOME' ? i.amountMinor : -i.amountMinor} currency={i.currency} signed /></span>
        </li>
      ))}
    </ul>
  );
}

/** Repeat charges Keeper noticed in your history that are not set up as recurring items yet. */
function Spotted() {
  const q = useSpottedCharges();
  const { baseCurrency } = useWorkspace();
  const [tracking, setTracking] = useState<SpottedCharge | null>(null);
  const list = q.data ?? [];
  if (list.length === 0) return null;
  return (
    <section className="glass-panel p-5">
      <h2 className="flex items-center gap-2"><Radar className="w-4 h-4 text-accent" />Spotted for you</h2>
      <p className="text-caption text-secondary mt-0.5 mb-3">These charge you on a regular rhythm but are not tracked yet. Track one and Keeper will remind you and keep it in your forecast.</p>
      <ul className="divide-y divide-border">
        {list.map((s) => (
          <li key={s.payee} className="py-3 flex flex-wrap items-center justify-between gap-3 text-body">
            <span className="min-w-0"><span className="font-medium">{s.payee}</span> <Badge>{s.frequency.toLowerCase()}</Badge><span className="block text-caption text-secondary">{formatMoney(s.amountMinor, baseCurrency)} each · {formatMoney(s.perYearMinor, baseCurrency)} a year · last charged {prettyDate(s.lastDate)}</span></span>
            <Button size="sm" variant="outline" onClick={() => setTracking(s)}>Track this</Button>
          </li>
        ))}
      </ul>
      {tracking && <TrackModal charge={tracking} onClose={() => setTracking(null)} />}
    </section>
  );
}

function TrackModal({ charge, onClose }: { charge: SpottedCharge; onClose: () => void }) {
  const { baseCurrency } = useWorkspace();
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived && !a.memo && a.currency === baseCurrency);
  const save = useSaveRecurring();
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(charge.nextExpected);
  const [auto, setAuto] = useState(false);
  const chosen = accountId || accounts[0]?.id || '';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!chosen) return toast.error('Choose the account it is paid from');
    save.mutate(
      { body: { name: charge.payee, accountId: chosen, categoryId: charge.categoryId, payeeId: charge.payeeId, type: 'EXPENSE', amountMinor: charge.amountMinor, frequency: charge.frequency, intervalN: 1, startOn: date, autoPost: auto } },
      { onSuccess: () => { toast.success(`Tracking ${charge.payee}`); onClose(); }, onError: (err) => toast.error(errorMessage(err)) },
    );
  };
  return (
    <Modal isOpen onClose={onClose} title={`Track ${charge.payee}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-body text-secondary">{formatMoney(charge.amountMinor, baseCurrency)} {charge.frequency.toLowerCase()}, based on {charge.charges} charges.</p>
        <Field label="Paid from"><Select value={chosen} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        <Field label="Next charge"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-body"><input type="checkbox" className="w-4 h-4" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Record it automatically on the day</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>Track it</Button></div>
      </form>
    </Modal>
  );
}
