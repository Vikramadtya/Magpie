import { lazy, Suspense } from 'react';
import { FxWarning } from '../../components/FxWarning';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton, StateView } from '../../components/ui/StateView';
import { useForecast } from '../../hooks/useExtras';
import { cn } from '../../lib/cn';
import { monthLabel, shortDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';

const SimpleBars = lazy(() => import('../../components/charts/SimpleBars'));

const CONFIDENCE: Record<string, string> = {
  NONE: 'No history yet', LOW: 'Low confidence (little history)', MEDIUM: 'Medium confidence', HIGH: 'High confidence',
};

export default function ForecastTab() {
  const forecast = useForecast();
  const f = forecast.data;
  const noData = !!f && f.monthsOfHistory === 0 && f.fixedExpenses.length === 0 && f.fixedIncome.length === 0;

  return (
    <StateView
      isLoading={forecast.isLoading}
      error={forecast.error}
      onRetry={() => void forecast.refetch()}
      isEmpty={noData}
      emptyTitle="Not enough data to forecast yet"
      emptyHint="Add a few months of transactions, or set up recurring bills and income, and a forecast appears here."
    >
      {f && (
        <div className="space-y-6">
          <FxWarning currencies={f.missingCurrencies} base={f.currency} />
          <p className="text-sm text-secondary">
            Forecast for <strong>{monthLabel(f.month)}</strong> · {CONFIDENCE[f.confidence]}
            {f.monthsOfHistory > 0 ? ` · based on ${f.monthsOfHistory} month${f.monthsOfHistory === 1 ? '' : 's'} of history` : ''}
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <Card label="Expected income" value={f.income.totalMinor} currency={f.currency} sub={`${formatMoney(f.income.fixedMinor, f.currency)} fixed + ${formatMoney(f.income.variableMinor, f.currency)} usual extra`} tone="up" range={[f.income.lowMinor, f.income.highMinor]} />
            <Card label="Expected spending" value={f.expense.totalMinor} currency={f.currency} sub={`${formatMoney(f.expense.fixedMinor, f.currency)} fixed bills + ${formatMoney(f.expense.variableMinor, f.currency)} everyday`} tone="down" range={[f.expense.lowMinor, f.expense.highMinor]} />
            <Card label="Expected left over" value={f.netMinor} currency={f.currency} sub={f.netMinor >= 0 ? 'Income minus spending' : 'Spending may exceed income'} tone={f.netMinor >= 0 ? 'up' : 'down'} />
          </div>

          {f.thisMonth.spentMinor > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">This month so far</h2>
              <p className="text-sm text-secondary mb-3">
                Day {f.thisMonth.daysElapsed} of {f.thisMonth.daysInMonth}. Spent {formatMoney(f.thisMonth.spentMinor, f.currency)}; heading for about <strong>{formatMoney(f.thisMonth.projectedMinor, f.currency)}</strong> at this pace
                {f.thisMonth.expectedMinor > 0 ? ` (you'd usually expect ${formatMoney(f.thisMonth.expectedMinor, f.currency)})` : ''}.
              </p>
              <ProgressBar value={f.thisMonth.expectedMinor > 0 ? (f.thisMonth.projectedMinor / f.thisMonth.expectedMinor) * 100 : 0} label="Projected vs expected" />
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <FixedList title="Fixed bills (from Recurring)" items={f.fixedExpenses} currency={f.currency} empty="No recurring expenses next month." />
            <FixedList title="Fixed income (from Recurring)" items={f.fixedIncome} currency={f.currency} empty="No recurring income next month." />
          </div>

          {f.categories.length > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Everyday spending forecast by category</h2>
              <Suspense fallback={<Skeleton className="h-56" />}>
                <SimpleBars data={f.categories.slice(0, 8).map((c) => ({ label: c.name, value: c.forecastMinor }))} currency={f.currency} label="Forecast" />
              </Suspense>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-secondary border-b border-border">
                    <tr><th className="py-2">Category</th><th className="py-2 text-right">Forecast</th><th className="py-2 text-right">Likely range</th><th className="py-2 text-right">Last month</th><th className="py-2 text-right">6-mo avg</th><th className="py-2">Model</th></tr>
                  </thead>
                  <tbody>
                    {f.categories.map((c) => (
                      <tr key={c.name} className="border-b border-border/60 last:border-0">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2 text-right tabular-nums font-medium">{formatMoney(c.forecastMinor, f.currency)}</td>
                        <td className="py-2 text-right tabular-nums text-secondary">{formatMoney(c.lowMinor, f.currency)} – {formatMoney(c.highMinor, f.currency)}</td>
                        <td className="py-2 text-right tabular-nums">{formatMoney(c.lastMonthMinor, f.currency)}</td>
                        <td className="py-2 text-right tabular-nums">{formatMoney(c.averageMinor, f.currency)}</td>
                        <td className="py-2 text-xs text-secondary">{c.method} · {c.confidence.toLowerCase()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <details className="text-sm text-secondary">
            <summary className="cursor-pointer">How is this calculated?</summary>
            <p className="mt-2 max-w-2xl">
              Fixed amounts come straight from your active Recurring items. Everyday spending is forecast per category from your own history (excluding recurring bills and loans). For each category several simple models predict the next month (recent average, smoothed level, typical month, trend, momentum and same month last year). They are scored on how well they would have predicted your recent months, and combined with more weight on the more accurate ones. The range is an 80% interval from those past errors. Amounts use each transaction's base-currency value.
            </p>
          </details>
        </div>
      )}
    </StateView>
  );
}

function Card({ label, value, currency, sub, tone, range }: { label: string; value: number; currency: string; sub: string; tone: 'up' | 'down'; range?: [number, number] }) {
  return (
    <div className="glass-panel p-4">
      <p className="text-xs text-secondary">{label}</p>
      <p className={cn('text-2xl font-bold mt-1 tabular-nums', tone === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>{formatMoney(value, currency)}</p>
      {range && <p className="text-xs text-secondary tabular-nums">likely {formatMoney(range[0], currency)} – {formatMoney(range[1], currency)}</p>}
      <p className="text-xs text-secondary mt-1">{sub}</p>
    </div>
  );
}

function FixedList({ title, items, currency, empty }: { title: string; items: { ruleId: string; name: string; amountMinor: number; date: string }[]; currency: string; empty: string }) {
  return (
    <section className="glass-panel p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-secondary">{empty}</p> : (
        <ul className="divide-y divide-border text-sm">
          {items.map((i) => (
            <li key={`${i.ruleId}-${i.date}`} className="py-2 flex justify-between"><span>{i.name} <span className="text-xs text-secondary">· {shortDate(i.date)}</span></span><span className="tabular-nums">{formatMoney(i.amountMinor, currency)}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}
