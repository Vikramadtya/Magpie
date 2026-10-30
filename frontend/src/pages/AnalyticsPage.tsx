import { endOfMonth, format, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FxWarning } from '../components/FxWarning';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Skeleton, StateView } from '../components/ui/StateView';
import { useCashFlow, useNetWorth, useSpending, useTopPayees } from '../hooks/useInsights';
import { isoDate } from '../lib/dates';
import { formatMoney } from '../lib/money';

const NetWorthChart = lazy(() => import('../components/charts/NetWorthChart'));
const CashFlowChart = lazy(() => import('../components/charts/CashFlowChart'));
const SpendingDonut = lazy(() => import('../components/charts/SpendingDonut'));

const RANGES = {
  month: { label: 'This month', from: () => startOfMonth(new Date()), to: () => endOfMonth(new Date()) },
  quarter: { label: 'Last 3 months', from: () => startOfMonth(subMonths(new Date(), 2)), to: () => endOfMonth(new Date()) },
  year: { label: 'This year', from: () => startOfYear(new Date()), to: () => endOfMonth(new Date()) },
} as const;

export default function AnalyticsPage() {
  const [range, setRange] = useState<keyof typeof RANGES>('month');
  const { from, to } = useMemo(() => ({ from: isoDate(RANGES[range].from()), to: isoDate(RANGES[range].to()) }), [range]);
  const cashFrom = isoDate(startOfMonth(subMonths(new Date(), 11)));
  const spending = useSpending(from, to);
  const cash = useCashFlow(cashFrom, isoDate(endOfMonth(new Date())));
  const worth = useNetWorth(12);
  const payees = useTopPayees(from, to);
  const total = spending.data?.items.reduce((s, c) => s + c.totalMinor, 0) ?? 0;

  return (
    <>
      <PageHeader title="Analytics" subtitle={`${format(new Date(from), 'd MMM')} – ${format(new Date(to), 'd MMM yyyy')}`} actions={
        <Select className="w-44" value={range} onChange={(e) => setRange(e.target.value as keyof typeof RANGES)} aria-label="Period">
          {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      } />
      <FxWarning currencies={[...new Set([...(spending.data?.missingCurrencies ?? []), ...(cash.data?.missingCurrencies ?? []), ...(worth.data?.missingCurrencies ?? [])])]} base={spending.data?.currency ?? ''} />
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-3">Spending by category</h2>
          <StateView isLoading={spending.isLoading} error={spending.error} isEmpty={spending.data?.items.length === 0} emptyTitle="No spending in this period">
            {spending.data && (
              <>
                <Suspense fallback={<Skeleton className="h-64" />}><SpendingDonut items={spending.data.items} currency={spending.data.currency} /></Suspense>
                <ul className="mt-3 space-y-1.5">
                  {spending.data.items.slice(0, 8).map((c) => (
                    <li key={c.categoryId} className="flex justify-between text-sm">
                      <Link to={`/transactions?category=${c.categoryId}&from=${from}&to=${to}`} className="hover:underline flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color ?? 'var(--accent-blue)' }} />{c.name}
                      </Link>
                      <span className="tabular-nums text-secondary">{formatMoney(c.totalMinor, spending.data.currency)} · {total ? Math.round((c.totalMinor / total) * 100) : 0}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </StateView>
        </section>

        <section className="glass-panel p-5">
          <h2 className="font-semibold mb-3">Top payees</h2>
          <StateView isLoading={payees.isLoading} error={payees.error} isEmpty={payees.data?.items.length === 0} emptyTitle="No payees in this period" emptyHint="Add a payee when you record spending to see it here.">
            <ul className="divide-y divide-border">
              {payees.data?.items.map((p) => (
                <li key={p.payeeId} className="py-2.5 flex justify-between text-sm">
                  <span>{p.name} <span className="text-xs text-secondary">· {p.count} {p.count === 1 ? 'purchase' : 'purchases'}</span></span>
                  <span className="tabular-nums">{formatMoney(p.totalMinor, payees.data!.currency)}</span>
                </li>
              ))}
            </ul>
          </StateView>
        </section>

        <section className="glass-panel p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Income vs spending</h2>
          <Suspense fallback={<Skeleton className="h-64" />}>{cash.data ? <CashFlowChart months={cash.data.items} currency={cash.data.currency} /> : <Skeleton className="h-64" />}</Suspense>
        </section>

        <section className="glass-panel p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Net worth, last 12 months</h2>
          <Suspense fallback={<Skeleton className="h-64" />}>{worth.data ? <NetWorthChart points={worth.data.items} currency={worth.data.currency} /> : <Skeleton className="h-64" />}</Suspense>
        </section>
      </div>
    </>
  );
}
