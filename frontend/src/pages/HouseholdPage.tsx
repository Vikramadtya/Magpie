import { Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Household, HouseholdSummary } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MonthPicker } from '../components/ui/MonthPicker';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StateView } from '../components/ui/StateView';
import { householdActions, useHouseholdAction, useHouseholds, useHouseholdSummary, useHouseholdTrips, useHouseholdWealth } from '../hooks/useHousehold';
import { monthKey, shortDate } from '../lib/dates';
import { parseMoney } from '../lib/money';

export default function HouseholdPage() {
  const households = useHouseholds();
  const create = useHouseholdAction(householdActions.create);
  const [name, setName] = useState('');
  const active = (households.data ?? []).filter((h) => h.myStatus === 'ACTIVE');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) create.mutate(name.trim(), { onSuccess: () => setName('') });
  };

  return (
    <>
      <PageHeader title="Household" subtitle="A read-only view over everyone's own ledgers. Each person keeps full control of their own data and chooses what to share." />
      <StateView isLoading={households.isLoading} error={households.error} onRetry={() => void households.refetch()}>
        <div className="space-y-10">
          {active.map((h) => <HouseholdView key={h.id} household={h} />)}
          {active.length === 0 && (
            <section className="glass-panel p-5 max-w-xl">
              <h2 className="font-semibold">Start a household</h2>
              <p className="text-sm text-secondary mt-1 mb-4">Invite your partner or family. You keep your own accounts and budgets; the household adds a combined view of spending, shared budgets, trips and, if you both choose, net worth and investments.</p>
              <form onSubmit={submit} className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Household name, e.g. Home" maxLength={120} aria-label="Household name" />
                <Button type="submit" disabled={create.isPending || !name.trim()}>Create</Button>
              </form>
            </section>
          )}
        </div>
      </StateView>
    </>
  );
}

function HouseholdView({ household: h }: { household: Household }) {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthKey(new Date()));
  const summary = useHouseholdSummary(h.id, month);
  const trips = useHouseholdTrips(h.id);
  const wealth = useHouseholdWealth(h.id);
  const leave = useHouseholdAction(householdActions.leave);
  const me = h.members.find((m) => m.me);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{h.name}</h2>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} onChange={setMonth} />
          <Button variant="outline" size="sm" disabled={leave.isPending} onClick={() => { if (window.confirm(`Leave ${h.name}? Your data stays yours.`)) leave.mutate(h.id); }}>Leave</Button>
        </div>
      </div>

      <MembersCard household={h} meId={me?.id} isOwner={h.createdByMe && !!user} />

      <StateView isLoading={summary.isLoading} error={summary.error} onRetry={() => void summary.refetch()}>
        {summary.data && <SpendingCard household={h} summary={summary.data} />}
      </StateView>
      {summary.data && <BudgetsCard household={h} summary={summary.data} />}

      {(trips.data ?? []).length > 0 && (
        <section className="glass-panel p-5">
          <h3 className="font-semibold mb-3">Trips together</h3>
          <p className="text-xs text-secondary mb-3">Trips with the same name in each person's ledger are combined.</p>
          <ul className="divide-y divide-border">
            {trips.data!.map((t) => (
              <li key={t.name} className="py-2.5">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-secondary">{shortDate(t.startDate)} – {shortDate(t.endDate)}</p>
                  </div>
                  <Amount minor={t.totalMinor} currency={h.currency} className="text-sm font-semibold" />
                </div>
                <p className="text-xs text-secondary mt-1">{t.byMember.filter((m) => m.amountMinor > 0).map((m) => `${m.name} ${new Intl.NumberFormat(undefined, { style: 'currency', currency: h.currency }).format(m.amountMinor / 100)}`).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {wealth.data && (
        <section className="glass-panel p-5">
          <h3 className="font-semibold mb-3">Net worth & investments</h3>
          {wealth.data.netWorthByMember.length === 0 && wealth.data.holdings.length === 0 ? (
            <p className="text-sm text-secondary">Nobody is sharing this yet. Each person decides above.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-secondary">Combined net worth</p>
                <p className="text-2xl font-bold tabular-nums"><Amount minor={wealth.data.netWorthMinor} currency={h.currency} /></p>
                <ul className="mt-2 text-sm space-y-0.5">
                  {wealth.data.netWorthByMember.map((m) => <li key={m.memberId} className="flex justify-between"><span>{m.name}</span><Amount minor={m.amountMinor} currency={h.currency} /></li>)}
                </ul>
                {wealth.data.notSharingNetWorth.length > 0 && <p className="text-xs text-secondary mt-2">Not shared by {wealth.data.notSharingNetWorth.join(', ')}.</p>}
              </div>
              <div>
                <p className="text-xs text-secondary">Investments</p>
                <p className="text-2xl font-bold tabular-nums"><Amount minor={wealth.data.investmentValueMinor} currency={h.currency} /></p>
                <p className="text-xs text-secondary">Cost <Amount minor={wealth.data.investmentCostMinor} currency={h.currency} /></p>
                <ul className="mt-2 text-sm space-y-0.5 max-h-40 overflow-y-auto">
                  {wealth.data.holdings.map((x, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{x.symbol} · {x.owner}</span><Amount minor={x.valueMinor} currency={h.currency} /></li>)}
                </ul>
                {wealth.data.notSharingInvestments.length > 0 && <p className="text-xs text-secondary mt-2">Not shared by {wealth.data.notSharingInvestments.join(', ')}.</p>}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MembersCard({ household: h, meId, isOwner }: { household: Household; meId?: string; isOwner: boolean }) {
  const me = h.members.find((m) => m.id === meId);
  const invite = useHouseholdAction(householdActions.invite);
  const remove = useHouseholdAction(householdActions.remove);
  const sharing = useHouseholdAction(householdActions.sharing);
  const [email, setEmail] = useState('');

  const toggle = (patch: Partial<{ spending: boolean; netWorth: boolean; investments: boolean }>) => {
    if (!me) return;
    sharing.mutate({ id: h.id, spending: me.shareSpending, netWorth: me.shareNetWorth, investments: me.shareInvestments, ...patch });
  };
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) invite.mutate({ id: h.id, email: email.trim() }, { onSuccess: () => setEmail('') });
  };

  return (
    <section className="glass-panel p-5 grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold mb-3">People</h3>
        <ul className="space-y-1.5">
          {h.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.name}{m.me ? ' (you)' : ''} {m.status === 'PENDING' && <span className="text-xs text-secondary">· invited</span>}</span>
              {isOwner && !m.me && <button aria-label={`Remove ${m.name}`} onClick={() => remove.mutate({ id: h.id, memberId: m.id })}><X className="w-4 h-4" /></button>}
            </li>
          ))}
        </ul>
        {isOwner && (
          <form onSubmit={send} className="flex gap-2 mt-4">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite by email" aria-label="Invite by email" maxLength={255} />
            <Button type="submit" disabled={invite.isPending || !email.trim()}>Invite</Button>
          </form>
        )}
      </div>
      {me && (
        <div>
          <h3 className="font-semibold mb-1">What you share</h3>
          <p className="text-xs text-secondary mb-3">Only totals and lists you allow. Others can never edit anything of yours.</p>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={me.shareSpending} onChange={(e) => toggle({ spending: e.target.checked })} /> My spending, budgets and trips</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={me.shareNetWorth} onChange={(e) => toggle({ netWorth: e.target.checked })} /> My net worth</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={me.shareInvestments} onChange={(e) => toggle({ investments: e.target.checked })} /> My investments</label>
          </div>
        </div>
      )}
    </section>
  );
}

function SpendingCard({ household: h, summary }: { household: Household; summary: HouseholdSummary }) {
  const top = summary.byMember.reduce((a, m) => Math.max(a, m.amountMinor), 0) || 1;
  return (
    <section className="glass-panel p-5">
      <div className="flex flex-wrap justify-between gap-2 mb-4">
        <div>
          <p className="text-xs text-secondary">Household spending</p>
          <p className="text-2xl font-bold tabular-nums"><Amount minor={summary.spentMinor} currency={h.currency} /></p>
        </div>
        {summary.notSharing.length > 0 && <p className="text-xs text-secondary self-end">Not shared by {summary.notSharing.join(', ')}.</p>}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <ul className="space-y-3">
          {summary.byMember.map((m) => (
            <li key={m.memberId}>
              <div className="flex justify-between text-sm mb-1"><span>{m.name}</span><Amount minor={m.amountMinor} currency={h.currency} /></div>
              <ProgressBar value={(m.amountMinor / top) * 100} tone="accent" label={m.name} />
            </li>
          ))}
          {summary.byMember.length === 0 && <p className="text-sm text-secondary">Nobody is sharing spending yet.</p>}
        </ul>
        <ul className="divide-y divide-border max-h-64 overflow-y-auto">
          {summary.categories.map((c) => (
            <li key={c.name} className="py-2 flex justify-between text-sm"><span>{c.name}</span><Amount minor={c.totalMinor} currency={h.currency} /></li>
          ))}
          {summary.categories.length === 0 && <p className="text-sm text-secondary py-2">No spending this month.</p>}
        </ul>
      </div>
    </section>
  );
}

function BudgetsCard({ household: h, summary }: { household: Household; summary: HouseholdSummary }) {
  const setBudget = useHouseholdAction(householdActions.setBudget);
  const removeBudget = useHouseholdAction(householdActions.removeBudget);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const minor = parseMoney(amount, h.currency);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!category.trim() || minor === null) return;
    setBudget.mutate({ id: h.id, categoryName: category.trim(), amountMinor: minor }, { onSuccess: () => { setCategory(''); setAmount(''); } });
  };

  return (
    <section className="glass-panel p-5">
      <h3 className="font-semibold mb-1">Household budgets</h3>
      <p className="text-xs text-secondary mb-4">Matched by category name across everyone's ledgers. Your personal budgets are separate.</p>
      <ul className="space-y-4">
        {summary.budgets.map((b) => (
          <li key={b.categoryName}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{b.categoryName}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums"><Amount minor={b.spentMinor} currency={h.currency} /> of <Amount minor={b.amountMinor} currency={h.currency} /></span>
                <button aria-label={`Remove ${b.categoryName} budget`} onClick={() => removeBudget.mutate({ id: h.id, categoryName: b.categoryName })}><Trash2 className="w-3.5 h-3.5" /></button>
              </span>
            </div>
            <ProgressBar value={b.amountMinor > 0 ? (b.spentMinor / b.amountMinor) * 100 : 100} label={b.categoryName} />
          </li>
        ))}
        {summary.budgets.length === 0 && <p className="text-sm text-secondary">No household budgets yet.</p>}
      </ul>
      <form onSubmit={add} className="flex flex-wrap gap-2 mt-4">
        <Input className="flex-1 min-w-[10rem]" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category name, e.g. Food" maxLength={120} aria-label="Category name" />
        <div className="w-40"><MoneyInput value={amount} currency={h.currency} onChange={setAmount} aria-label="Monthly limit" /></div>
        <Button type="submit" disabled={setBudget.isPending || !category.trim() || minor === null}>Set</Button>
      </form>
    </section>
  );
}
