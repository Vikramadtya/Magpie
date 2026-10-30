import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MoneyInput } from '../components/ui/MoneyInput';
import { MonthPicker } from '../components/ui/MonthPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { Skeleton, StateView } from '../components/ui/StateView';
import { useHouseholdSummary, useRemoveSettlement, useSettle } from '../hooks/useExtras';
import { monthKey, prettyDate, today } from '../lib/dates';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';

const StackedBars = lazy(() => import('../components/charts/StackedBars'));

export default function HouseholdPage() {
  const { kind, baseCurrency, canEdit } = useWorkspace();
  const { user } = useAuth();
  const isHousehold = kind === 'HOUSEHOLD';
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const summary = useHouseholdSummary(month, isHousehold);
  const remove = useRemoveSettlement();
  const [settling, setSettling] = useState<{ toUserId?: string; amountMinor?: number } | null>(null);
  const s = summary.data;

  const trendRows = useMemo(
    () =>
      (s?.trend ?? []).map((m) => {
        const row: Record<string, string | number> = { label: m.month.slice(5) };
        (s?.members ?? []).forEach((mem) => (row[mem.name] = m.byMember.find((b) => b.userId === mem.userId)?.amountMinor ?? 0));
        return row;
      }),
    [s],
  );

  if (!isHousehold) {
    return (
      <>
        <PageHeader title="Household" />
        <div className="glass-panel p-8 text-center max-w-xl">
          <p className="font-medium mb-2">This is a personal ledger</p>
          <p className="text-sm text-secondary mb-4">
            Create a household workspace in Settings, invite your partner or family, then tick “Household” when you record a shared expense. It appears in both ledgers and shows who spent what.
          </p>
          <Link to="/settings"><Button>Go to Settings</Button></Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Household"
        subtitle="Shared spending, who paid what, and who owes whom"
        actions={<><MonthPicker month={month} onChange={setMonth} />{canEdit && <Button size="sm" onClick={() => setSettling({})}>Settle up</Button>}</>}
      />
      <StateView isLoading={summary.isLoading} error={summary.error} onRetry={() => void summary.refetch()} skeleton={<Skeleton className="h-40" />}>
        {s && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-4 col-span-2 lg:col-span-1">
                <p className="text-xs text-secondary">Spent this month</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{formatMoney(s.totalMinor, s.currency)}</p>
              </div>
              {s.members.map((m) => (
                <div key={m.userId} className="glass-panel p-4">
                  <p className="text-xs text-secondary">{m.name}{m.userId === user?.id ? ' (you)' : ''}</p>
                  <p className="text-xl font-bold mt-1 tabular-nums">{formatMoney(m.paidMinor, s.currency)}</p>
                  <p className="text-xs text-secondary">{m.sharePercent}% of spending</p>
                </div>
              ))}
            </div>

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">Who owes whom</h2>
              <p className="text-xs text-secondary mb-3">Everything is split equally between members. Balances include all time, minus settlements.</p>
              <ul className="space-y-2 mb-4">
                {s.balances.map((b) => (
                  <li key={b.userId} className="flex justify-between text-sm">
                    <span>{b.name}{b.userId === user?.id ? ' (you)' : ''} <span className="text-xs text-secondary">paid {formatMoney(b.paidMinor, s.currency)}, fair share {formatMoney(b.fairShareMinor, s.currency)}</span></span>
                    <span className={`tabular-nums font-medium ${b.balanceMinor > 0 ? 'text-green-600 dark:text-green-400' : b.balanceMinor < 0 ? 'text-red-500' : ''}`}>
                      {b.balanceMinor === 0 ? 'settled' : b.balanceMinor > 0 ? `is owed ${formatMoney(b.balanceMinor, s.currency)}` : `owes ${formatMoney(-b.balanceMinor, s.currency)}`}
                    </span>
                  </li>
                ))}
              </ul>
              {s.suggested.length > 0 ? (
                <ul className="space-y-2">
                  {s.suggested.map((p) => (
                    <li key={`${p.fromUserId}-${p.toUserId}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span><strong>{p.fromName}</strong> pays <strong>{p.toName}</strong> {formatMoney(p.amountMinor, s.currency)}</span>
                      {p.fromUserId === user?.id && canEdit && <Button size="sm" onClick={() => setSettling({ toUserId: p.toUserId, amountMinor: p.amountMinor })}>Record payment</Button>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary">All settled up.</p>
              )}
            </section>

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Spending by category</h2>
              {s.categories.length === 0 ? (
                <p className="text-sm text-secondary">No shared spending this month.</p>
              ) : (
                <ul className="space-y-4">
                  {s.categories.map((c) => (
                    <li key={c.name}>
                      <div className="flex justify-between text-sm mb-1"><span>{c.name}</span><span className="tabular-nums">{formatMoney(c.totalMinor, s.currency)}</span></div>
                      <ProgressBar tone="accent" value={(c.totalMinor / s.totalMinor) * 100} label={c.name} />
                      <p className="text-xs text-secondary mt-1">{c.byMember.map((m) => `${m.name} ${formatMoney(m.amountMinor, s.currency)}`).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Last 6 months</h2>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <StackedBars rows={trendRows} keys={s.members.map((m) => m.name)} currency={s.currency} />
              </Suspense>
            </section>

            {s.settlements.length > 0 && (
              <section className="glass-panel p-5">
                <h2 className="font-semibold mb-3">Settlements</h2>
                <ul className="divide-y divide-border text-sm">
                  {s.settlements.map((x) => (
                    <li key={x.id} className="py-2 flex justify-between gap-3">
                      <span>{x.fromName} paid {x.toName} {formatMoney(x.amountMinor, s.currency)} <span className="text-xs text-secondary">· {prettyDate(x.occurredOn)}</span></span>
                      {x.fromUserId === user?.id && <button className="text-xs text-secondary hover:text-red-500" onClick={() => remove.mutate(x.id)}>Remove</button>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </StateView>
      {settling && s && <SettleModal members={s.members.filter((m) => m.userId !== user?.id)} preset={settling} currency={s.currency || baseCurrency} onClose={() => setSettling(null)} />}
    </>
  );
}

function SettleModal({ members, preset, currency, onClose }: { members: { userId: string; name: string }[]; preset: { toUserId?: string; amountMinor?: number }; currency: string; onClose: () => void }) {
  const settle = useSettle();
  const [to, setTo] = useState(preset.toUserId ?? members[0]?.userId ?? '');
  const [amount, setAmount] = useState(preset.amountMinor ? toInputValue(preset.amountMinor, currency) : '');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, currency);
    if (!minor || !to) return;
    settle.mutate({ toUserId: to, amountMinor: minor, occurredOn: date, note: note || null }, { onSuccess: () => { toast.success('Recorded'); onClose(); } });
  };
  return (
    <Modal isOpen onClose={onClose} title="Record a payment">
      <form onSubmit={submit} className="space-y-4">
        <Field label="You paid"><Select value={to} onChange={(e) => setTo(e.target.value)}>{members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`}><MoneyInput value={amount} currency={currency} onChange={setAmount} autoFocus /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={settle.isPending}>Record</Button></div>
      </form>
    </Modal>
  );
}
