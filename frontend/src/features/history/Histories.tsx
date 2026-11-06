import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import type { Account, Goal, Holding, Loan } from '../../api/types';
import { useAccountHistory, useBreakdown, useBudgetHistory, useGoalProgress, useHoldingHistory, useWealth } from '../../hooks/useCharts';
import { useLoanDetail, useLots } from '../../hooks/useExtras';
import { useNetWorth } from '../../hooks/useInsights';
import { formatMoney } from '../../lib/money';
import { formatUnits } from '../../lib/fractional';
import { HistoryModal, type HistoryChart } from './HistoryModal';

const ACCENT = 'var(--accent-blue)';
const GREY = '#8B8F9C';
const GREEN = '#2FB67C';
const RED = '#EE5D7C';
const monthDate = (m: string) => `${m}-01`;

/** A stock, fund or other holding: price per unit, value against what was paid in, and each purchase. */
export function HoldingHistoryModal({ holding, onClose }: { holding: Holding; onClose: () => void }) {
  const q = useHoldingHistory(holding.id);
  const lots = useLots(holding.id);
  const cur = holding.currency;
  const charts: HistoryChart[] = useMemo(() => {
    const d = q.data;
    if (!d) return [];
    return [
      { title: 'Price per unit', hint: 'What one unit was worth over time.', series: [{ key: 'price', label: 'Price', color: ACCENT, points: d.prices }] },
      { title: 'Worth against paid in', hint: 'Units you held at the time, times the price, next to the money you put in.', series: [{ key: 'value', label: 'Worth', color: ACCENT, points: d.value }, { key: 'paid', label: 'Paid in', color: GREY, points: d.invested }] },
    ];
  }, [q.data]);
  const gain = holding.marketValueMinor - holding.costBasisMinor;
  return (
    <HistoryModal
      title={holding.name}
      subtitle={[holding.symbol.startsWith('MF:') ? 'Mutual fund' : holding.symbol, holding.exchange].filter(Boolean).join(' · ')}
      currency={cur}
      loading={q.isLoading}
      error={q.error}
      onClose={onClose}
      stats={[
        { label: 'Worth now', value: formatMoney(holding.marketValueMinor, cur) },
        { label: 'Paid in', value: formatMoney(holding.costBasisMinor, cur) },
        { label: 'Gain', value: `${gain >= 0 ? '+' : '−'}${formatMoney(Math.abs(gain), cur)}`, tone: gain >= 0 ? 'good' : 'bad' },
        { label: 'Units', value: formatUnits(holding.quantity) },
      ]}
      charts={charts}
      footer={(lots.data ?? []).length > 0 && (
        <section>
          <h3 className="mb-2">Your purchases</h3>
          <ul className="divide-y divide-border rounded-xl border border-border text-body">
            {(lots.data ?? []).map((l) => {
              const diff = holding.priceMinor - l.unitPriceMinor;
              return (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span>{format(parseISO(l.boughtOn), 'd MMM yyyy')} <span className="text-caption text-secondary">· {formatUnits(l.quantity)} at {formatMoney(l.unitPriceMinor, cur)}</span></span>
                  <span className={`tabular-nums text-caption ${diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{l.unitPriceMinor > 0 ? `${diff >= 0 ? '+' : '−'}${Math.abs((diff / l.unitPriceMinor) * 100).toFixed(1)}% since` : ''}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    />
  );
}

/** An account's balance over time and what came in and went out each month. */
export function AccountHistoryModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const q = useAccountHistory(account.id);
  const d = q.data;
  const charts: HistoryChart[] = useMemo(() => d ? [
    { title: 'Balance', hint: 'The balance at the end of each week.', mode: 'area', series: [{ key: 'balance', label: 'Balance', color: ACCENT, points: d.points }] },
    { title: 'Money in and out each month', series: [
      { key: 'in', label: 'In', color: GREEN, points: d.flows.map((f) => ({ date: monthDate(f.month), minor: f.inMinor })) },
      { key: 'out', label: 'Out', color: RED, points: d.flows.map((f) => ({ date: monthDate(f.month), minor: f.outMinor })) },
    ] },
  ] : [], [d]);
  return (
    <HistoryModal title={account.name} subtitle="History of this account" currency={account.currency} loading={q.isLoading} error={q.error} onClose={onClose}
      stats={[{ label: 'Balance now', value: formatMoney(account.balanceMinor, account.currency) }]} charts={charts} />
  );
}

/** Net worth over time, and what it is made of. */
export function NetWorthHistoryModal({ currency, onClose }: { currency: string; onClose: () => void }) {
  const total = useNetWorth(24);
  const wealth = useWealth(24);
  const charts: HistoryChart[] = useMemo(() => {
    const items = total.data?.items ?? [];
    const w = wealth.data;
    const out: HistoryChart[] = [{ title: 'Net worth', hint: 'Past months count investments at what you paid; this month uses today’s value.', mode: 'area', series: [{ key: 'net', label: 'Net worth', color: ACCENT, points: items.map((p) => ({ date: monthDate(p.month), minor: p.netWorthMinor })) }] }];
    if (w) {
      const sumAt = (pick: (type: string) => boolean) => w.months.map((m, i) => ({ date: monthDate(m), minor: w.accounts.filter((a) => pick(a.type)).reduce((s, a) => s + (a.values[i] ?? 0), 0) }));
      const liability = (t: string) => t === 'CREDIT_CARD' || t === 'LOAN';
      out.push({ title: 'What it is made of', series: [
        { key: 'accounts', label: 'Bank, savings and cash', color: ACCENT, points: sumAt((t) => !liability(t)) },
        { key: 'investments', label: 'Investments', color: GREEN, points: w.months.map((m, i) => ({ date: monthDate(m), minor: w.investments[i] ?? 0 })) },
        { key: 'own', label: 'Gold, property and other', color: '#F2A33A', points: w.months.map((m, i) => ({ date: monthDate(m), minor: w.ownAssets[i] ?? 0 })) },
        { key: 'debts', label: 'Cards and loans', color: RED, points: sumAt(liability) },
      ] });
    }
    return out;
  }, [total.data, wealth.data]);
  const items = total.data?.items ?? [];
  const now = items[items.length - 1]?.netWorthMinor ?? 0;
  return <HistoryModal title="Net worth" subtitle="History of everything you own, less what you owe" currency={currency} loading={total.isLoading} error={total.error} onClose={onClose} stats={[{ label: 'Net worth now', value: formatMoney(now, currency) }]} charts={charts} />;
}

/** How a goal has filled up, against its target. */
export function GoalHistoryModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const q = useGoalProgress();
  const g = q.data?.find((x) => x.id === goal.id);
  const charts: HistoryChart[] = useMemo(() => {
    if (!g || g.points.length === 0) return [];
    const saved = g.points.map((p) => ({ date: p.date, minor: p.cumulativeMinor }));
    const today = new Date().toISOString().slice(0, 10);
    const withToday = saved[saved.length - 1].date < today ? [...saved, { date: today, minor: saved[saved.length - 1].minor }] : saved;
    return [{ title: 'Saved so far', hint: 'Each deposit, running total, against the target.', mode: 'area', series: [
      { key: 'saved', label: 'Saved', color: ACCENT, points: withToday },
      { key: 'target', label: 'Target', color: GREY, points: withToday.map((p) => ({ date: p.date, minor: g.targetMinor })) },
    ] }];
  }, [g]);
  return <HistoryModal title={goal.name} subtitle="History of this goal" currency={goal.currency} loading={q.isLoading} error={q.error} onClose={onClose} stats={[{ label: 'Saved', value: formatMoney(goal.savedMinor, goal.currency) }, { label: 'Target', value: formatMoney(goal.targetMinor, goal.currency) }]} charts={charts} />;
}

/** A category's spending against its budget, month by month. */
export function BudgetHistoryModal({ categoryId, name, currency, onClose }: { categoryId: string; name: string; currency: string; onClose: () => void }) {
  const q = useBudgetHistory(12);
  const charts: HistoryChart[] = useMemo(() => {
    const months = q.data ?? [];
    const line = (m: (typeof months)[number]) => m.lines.find((l) => l.categoryId === categoryId);
    return [{ title: 'Spending against the budget', hint: 'Each month: what you planned and what you spent.', series: [
      { key: 'budget', label: 'Budget', color: GREY, points: months.filter(line).map((m) => ({ date: monthDate(m.month), minor: (line(m)?.amountMinor ?? 0) + (line(m)?.rolloverMinor ?? 0) })) },
      { key: 'spent', label: 'Spent', color: ACCENT, points: months.map((m) => ({ date: monthDate(m.month), minor: line(m)?.spentMinor ?? 0 })) },
    ] }];
  }, [q.data, categoryId]);
  return <HistoryModal title={name} subtitle="Budget history, last 12 months" currency={currency} loading={q.isLoading} error={q.error} onClose={onClose} charts={charts} />;
}

/** What was still owed on a loan over time. */
export function LoanHistoryModal({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const q = useLoanDetail(loan.id);
  const charts: HistoryChart[] = useMemo(() => {
    const txs = q.data?.transactions ?? [];
    // the first entry is the loan itself; later entries in the opposite direction are repayments
    const repayments = txs.filter((t) => (loan.direction === 'LENT' ? t.type === 'INCOME' : t.type === 'EXPENSE')).sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
    let owed = loan.principalMinor;
    const points = [{ date: loan.occurredOn, minor: owed }];
    repayments.forEach((t) => { owed -= t.amountMinor; points.push({ date: t.occurredOn, minor: Math.max(0, owed) }); });
    const today = new Date().toISOString().slice(0, 10);
    if (points[points.length - 1].date < today) points.push({ date: today, minor: points[points.length - 1].minor });
    return [{ title: 'Still owed', hint: loan.direction === 'LENT' ? 'What they still owe you, after each repayment.' : 'What you still owe, after each repayment.', mode: 'area' as const, series: [{ key: 'owed', label: 'Outstanding', color: ACCENT, points }] }];
  }, [q.data, loan]);
  return <HistoryModal title={loan.direction === 'LENT' ? `Lent to ${loan.person}` : `Borrowed from ${loan.person}`} subtitle="History of this loan" currency={loan.currency} loading={q.isLoading} error={q.error} onClose={onClose} stats={[{ label: 'Outstanding', value: formatMoney(loan.outstandingMinor, loan.currency) }, { label: 'Repaid', value: formatMoney(loan.repaidMinor, loan.currency) }]} charts={charts} />;
}

/** What you spent on one category or at one payee, month by month for two years. */
export function SpendingHistoryModal({ title, subtitle, categoryId, payeeId, currency, onClose }: { title: string; subtitle?: string; categoryId?: string; payeeId?: string; currency: string; onClose: () => void }) {
  const to = new Date();
  const from = new Date(to.getFullYear() - 2, to.getMonth(), 1);
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');
  const q = useBreakdown({ by: 'none', bucket: 'month', from: iso(from), to: iso(to), categoryId, payeeId });
  const charts: HistoryChart[] = useMemo(() => {
    const byMonth = new Map((q.data?.rows ?? []).map((r) => [r.bucket, r.totalMinor]));
    const points: { date: string; minor: number }[] = [];
    for (let d = new Date(from); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const m = format(d, 'yyyy-MM');
      points.push({ date: monthDate(m), minor: byMonth.get(m) ?? 0 });
    }
    return [{ title: 'Spending each month', series: [{ key: 'spend', label: 'Spent', color: ACCENT, points }] }];
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = (q.data?.rows ?? []).reduce((a, r) => a + r.totalMinor, 0);
  return <HistoryModal title={title} subtitle={subtitle ?? 'Spending history, last two years'} currency={q.data?.currency ?? currency} loading={q.isLoading} error={q.error} onClose={onClose} stats={[{ label: 'Total, two years', value: formatMoney(total, q.data?.currency ?? currency) }]} charts={charts} />;
}
