import { Link } from 'react-router-dom';
import type { Dashboard } from '../../api/types';
import { Sparkline } from '../../components/ui/Sparkline';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useNetWorth } from '../../hooks/useInsights';
import { monthKey } from '../../lib/dates';
import { formatMoney } from '../../lib/money';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Running total of spending this month against last month, as two light lines (no chart library). */
export function PaceCard({ d, month }: { d: Dashboard; month: string }) {
  const now = new Date();
  const elapsed = month === monthKey(now) ? Math.min(now.getDate(), d.dailySpend.length) : d.dailySpend.length;
  const running = (xs: number[]) => xs.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
  const thisMonth = running(d.dailySpend.slice(0, elapsed));
  const lastMonth = running(d.previousDailySpend);
  const spent = sum(d.dailySpend.slice(0, elapsed));
  const projected = elapsed < d.dailySpend.length && elapsed > 0 ? Math.round((spent / elapsed) * d.dailySpend.length) : null;
  return (
    <section className="glass-panel p-5">
      <h2>Spending pace</h2>
      <p className="text-caption text-secondary mt-0.5 mb-3">
        This month (solid) against last month (dashed){projected !== null && <>. At this rate: about <strong className="text-primary">{formatMoney(projected, d.currency)}</strong></>}.
      </p>
      {spent === 0 && sum(d.previousDailySpend) === 0
        ? <p className="text-body text-secondary py-8 text-center">Record some spending to see your pace.</p>
        : <Sparkline values={thisMonth} compare={lastMonth} label="Spending pace this month against last month" height={120} />}
    </section>
  );
}

/** Net worth over the last year as one light line. */
export function NetWorthTrend() {
  const q = useNetWorth(12);
  const items = q.data?.items ?? [];
  return (
    <section className="glass-panel p-5">
      <div className="flex items-center justify-between">
        <h2>Net worth trend</h2>
        <Link to="/analytics" className="text-body text-accent">More</Link>
      </div>
      <p className="text-caption text-secondary mt-0.5 mb-3">Past months count investments at what you paid.</p>
      {items.length < 2
        ? <p className="text-body text-secondary py-8 text-center">Needs a couple of months of history.</p>
        : <Sparkline values={items.map((p) => p.netWorthMinor)} label="Net worth over the last 12 months" height={120} />}
    </section>
  );
}

/** Each budget as a bar: how much of it is used. */
export function BudgetCompact({ d }: { d: Dashboard }) {
  const lines = [...d.budgets.lines].sort((x, y) => y.spentMinor / Math.max(y.amountMinor + y.rolloverMinor, 1) - x.spentMinor / Math.max(x.amountMinor + x.rolloverMinor, 1)).slice(0, 5);
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <h2>Budgets</h2>
        <Link to="/plan/budgets" className="text-body text-accent">Manage</Link>
      </div>
      {lines.length === 0 ? (
        <p className="text-body text-secondary">No budgets this month. <Link to="/plan/budgets" className="text-accent">Set one</Link></p>
      ) : (
        <ul className="space-y-4">
          {lines.map((l) => {
            const total = l.amountMinor + l.rolloverMinor;
            const pct = total > 0 ? Math.round((l.spentMinor / total) * 100) : 100;
            return (
              <li key={l.categoryId}>
                <div className="flex justify-between gap-3 text-body mb-1.5">
                  <span className="truncate" title={l.categoryName}>{l.categoryName}</span>
                  <span className={pct > 100 ? 'text-red-500 tabular-nums shrink-0' : 'text-secondary tabular-nums shrink-0'}>{pct}%</span>
                </div>
                <ProgressBar value={Math.min(pct, 100)} label={l.categoryName} />
                <p className="text-caption text-secondary tabular-nums mt-1">{formatMoney(l.spentMinor, d.currency)} of {formatMoney(total, d.currency)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
