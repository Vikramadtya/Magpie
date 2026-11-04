import { Link } from 'react-router-dom';
import type { Dashboard } from '../../api/types';
import { useNetWorth } from '../../hooks/useInsights';
import { monthKey } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { PairBars, Trend } from './charts';
import { ChartCard, monthName, sum } from './kit';

/** This month's running spending against last month's, day by day. */
export function PaceCard({ d, month }: { d: Dashboard; month: string }) {
  const length = Math.max(d.dailySpend.length, d.previousDailySpend.length);
  const now = new Date();
  const elapsed = month === monthKey(now) ? Math.min(now.getDate(), d.dailySpend.length) : d.dailySpend.length;
  let a = 0;
  let b = 0;
  const data = Array.from({ length }, (_, i) => {
    a += d.dailySpend[i] ?? 0;
    b += d.previousDailySpend[i] ?? 0;
    return { bucket: String(i + 1), thisMonth: i < elapsed ? a : undefined, lastMonth: i < d.previousDailySpend.length ? b : undefined };
  });
  const spent = sum(d.dailySpend.slice(0, elapsed));
  const last = sum(d.previousDailySpend);
  const projected = elapsed < d.dailySpend.length && elapsed > 0 ? Math.round((spent / elapsed) * d.dailySpend.length) : null;
  return (
    <ChartCard
      title="Spending pace"
      hint={projected !== null ? `Running total this month against last. At this rate: about ${formatMoney(projected, d.currency)}.` : 'Running total this month against last.'}
      empty={spent === 0 && last === 0}
      emptyText="Record some spending to see your pace."
    >
      <Trend
        data={data}
        currency={d.currency}
        xFormat={(v) => v}
        series={[{ key: 'thisMonth', label: 'This month', color: 'var(--accent-blue)' }, { key: 'lastMonth', label: 'Last month', color: '#8B8F9C' }]}
        height={224}
      />
    </ChartCard>
  );
}

/** Net worth month by month. */
export function NetWorthTrend() {
  const q = useNetWorth(12);
  const items = q.data?.items ?? [];
  return (
    <ChartCard
      title="Net worth over time"
      hint="Past months count investments at what you paid; this month uses today's value."
      loading={q.isLoading}
      error={q.error}
      empty={items.length < 2}
      actions={<Link to="/analytics" className="text-sm text-accent">More</Link>}
    >
      <Trend
        data={items.map((p) => ({ bucket: p.month, net: p.netWorthMinor }))}
        currency={q.data?.currency ?? 'USD'}
        xFormat={monthName}
        series={[{ key: 'net', label: 'Net worth', color: 'var(--accent-blue)' }]}
        mode="area"
        height={224}
      />
    </ChartCard>
  );
}

/** Each budget with how much of it is spent. */
export function BudgetCompact({ d }: { d: Dashboard }) {
  const lines = [...d.budgets.lines].sort((x, y) => y.spentMinor / Math.max(y.amountMinor + y.rolloverMinor, 1) - x.spentMinor / Math.max(x.amountMinor + x.rolloverMinor, 1)).slice(0, 6);
  return (
    <ChartCard
      title="Budgets: planned and spent"
      hint="Red means a budget is used up."
      empty={lines.length === 0}
      emptyText="No budgets for this month yet."
      actions={<Link to="/budgets" className="text-sm text-accent">Manage</Link>}
    >
      <PairBars
        data={lines.map((l) => ({ label: l.categoryName, a: l.amountMinor + l.rolloverMinor, b: l.spentMinor }))}
        currency={d.currency}
        a={{ name: 'Budget', color: '#8B8F9C' }}
        b={{ name: 'Spent', color: 'var(--accent-blue)' }}
        redWhenOver
      />
    </ChartCard>
  );
}

