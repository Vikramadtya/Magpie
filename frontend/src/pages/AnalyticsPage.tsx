import { ArrowDownLeft, ArrowUpRight, CalendarDays, PiggyBank } from 'lucide-react';
import { endOfMonth, format, parseISO, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FxWarning } from '../components/FxWarning';
import { Delta } from '../components/ui/Delta';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Select } from '../components/ui/Select';
import { Skeleton, StateView } from '../components/ui/StateView';
import { Stat } from '../components/ui/Stat';
import { useCashFlow, useNetWorth, useOverview, useTopPayees } from '../hooks/useInsights';
import { isoDate, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { paletteColor } from '../lib/palette';

const ForecastTab = lazy(() => import('../features/analytics/ForecastTab'));
const PatternsTab = lazy(() => import('../features/analytics/PatternsTab'));
const NetWorthChart = lazy(() => import('../components/charts/NetWorthChart'));
const CashFlowChart = lazy(() => import('../components/charts/CashFlowChart'));
const SpendingDonut = lazy(() => import('../components/charts/SpendingDonut'));
const StackedMonths = lazy(() => import('../components/charts/StackedMonths'));
const SimpleBars = lazy(() => import('../components/charts/SimpleBars'));

const now = () => new Date();
const RANGES = {
  month: { label: 'This month', from: () => startOfMonth(now()), to: () => endOfMonth(now()) },
  last: { label: 'Last month', from: () => startOfMonth(subMonths(now(), 1)), to: () => endOfMonth(subMonths(now(), 1)) },
  quarter: { label: 'Last 3 months', from: () => startOfMonth(subMonths(now(), 2)), to: () => endOfMonth(now()) },
  half: { label: 'Last 6 months', from: () => startOfMonth(subMonths(now(), 5)), to: () => endOfMonth(now()) },
  ytd: { label: 'This year', from: () => startOfYear(now()), to: () => endOfMonth(now()) },
  year: { label: 'Last 12 months', from: () => startOfMonth(subMonths(now(), 11)), to: () => endOfMonth(now()) },
} as const;
type RangeKey = keyof typeof RANGES;
const TABS = [['overview', 'Overview'], ['forecast', 'Forecast'], ['patterns', 'Patterns']] as const;

export default function AnalyticsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('overview');
  const [range, setRange] = useState<RangeKey>('month');
  const { from, to } = useMemo(() => ({ from: isoDate(RANGES[range].from()), to: isoDate(RANGES[range].to()) }), [range]);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={`${format(parseISO(from), 'd MMM')} – ${format(parseISO(to), 'd MMM yyyy')}`}
        actions={tab === 'overview' ? (
          <Select className="w-44" value={range} onChange={(e) => setRange(e.target.value as RangeKey)} aria-label="Period">
            {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        ) : undefined}
      />
      <Segmented className="mb-6" value={tab} onChange={setTab} options={TABS} />
      {tab === 'forecast' && <Suspense fallback={<Skeleton className="h-64" />}><ForecastTab /></Suspense>}
      {tab === 'patterns' && <Suspense fallback={<Skeleton className="h-64" />}><PatternsTab /></Suspense>}
      {tab === 'overview' && <Overview from={from} to={to} />}
    </>
  );
}

function Overview({ from, to }: { from: string; to: string }) {
  const overview = useOverview(from, to);
  const cash = useCashFlow(isoDate(startOfMonth(subMonths(new Date(), 11))), isoDate(endOfMonth(new Date())));
  const worth = useNetWorth(12);
  const payees = useTopPayees(from, to);
  const o = overview.data;

  return (
    <StateView isLoading={overview.isLoading} error={overview.error} onRetry={() => void overview.refetch()} skeleton={<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>}>
      {o && (
        <div className="space-y-6">
          <FxWarning currencies={[...new Set([...o.missingCurrencies, ...(cash.data?.missingCurrencies ?? []), ...(worth.data?.missingCurrencies ?? [])])]} base={o.currency} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={<ArrowDownLeft className="w-4 h-4" />} label="Income" value={formatMoney(o.current.incomeMinor, o.currency)} tone="income" footer={<><Delta current={o.current.incomeMinor} previous={o.previous.incomeMinor} /> vs previous period</>} />
            <Stat icon={<ArrowUpRight className="w-4 h-4" />} label="Spending" value={formatMoney(o.current.expenseMinor, o.currency)} tone="expense" footer={<><Delta current={o.current.expenseMinor} previous={o.previous.expenseMinor} inverse /> vs previous period</>} />
            <Stat icon={<PiggyBank className="w-4 h-4" />} label="Saved" value={formatMoney(o.current.savingsMinor, o.currency)} footer={<>{o.current.savingsRatePercent}% of income <Delta current={o.current.savingsMinor} previous={o.previous.savingsMinor} /></>} />
            <Stat icon={<CalendarDays className="w-4 h-4" />} label="Average per day" value={formatMoney(o.current.avgPerDayMinor, o.currency)} footer={<>{o.current.expenseCount} {o.current.expenseCount === 1 ? 'purchase' : 'purchases'} <Delta current={o.current.avgPerDayMinor} previous={o.previous.avgPerDayMinor} inverse /></>} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Spending by category</h2>
              {o.categoryChanges.length === 0 ? (
                <p className="text-sm text-secondary py-6 text-center">No spending in this period.</p>
              ) : (
                <>
                  <Suspense fallback={<Skeleton className="h-64" />}>
                    <SpendingDonut items={o.categoryChanges.map((c) => ({ categoryId: c.categoryId, name: c.name, color: c.color, totalMinor: c.currentMinor }))} currency={o.currency} />
                  </Suspense>
                  <ul className="mt-3 space-y-1.5">
                    {o.categoryChanges.map((c, i) => (
                      <li key={c.categoryId} className="flex justify-between gap-3 text-sm">
                        <Link to={`/transactions?category=${c.categoryId}&from=${from}&to=${to}`} className="hover:underline flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color ?? paletteColor(i) }} /><span className="truncate">{c.name}</span>
                        </Link>
                        <span className="tabular-nums text-secondary flex items-center gap-2 shrink-0">
                          {formatMoney(c.currentMinor, o.currency)}
                          <Delta current={c.currentMinor} previous={c.previousMinor} inverse className="w-14 justify-end" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">How the mix changes</h2>
              <p className="text-xs text-secondary mb-3">Your biggest categories, month by month</p>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <StackedMonths months={o.monthly} categories={o.stackCategories} currency={o.currency} />
              </Suspense>
            </section>
          </div>

          {o.dailySpend.length > 1 && o.dailySpend.length <= 62 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Day by day</h2>
              <Suspense fallback={<Skeleton className="h-56" />}>
                <SimpleBars data={o.dailySpend.map((v, i) => ({ label: String(i + 1), value: v }))} currency={o.currency} label="Spent" />
              </Suspense>
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Largest purchases</h2>
              {o.largest.length === 0 ? (
                <p className="text-sm text-secondary">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {o.largest.map((t) => (
                    <li key={t.id} className="py-2.5 flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t.title}</p>
                        <p className="text-xs text-secondary">{shortDate(t.date)}{t.category ? ` · ${t.category}` : ''}</p>
                      </div>
                      <span className="tabular-nums shrink-0">{formatMoney(t.amountMinor, o.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Top payees</h2>
              <StateView isLoading={payees.isLoading} error={payees.error} isEmpty={false}>
                {payees.data?.items.length === 0 && <p className="text-sm text-secondary">Add a payee when you record spending to see it here.</p>}
                <ul className="divide-y divide-border">
                  {payees.data?.items.slice(0, 6).map((p) => (
                    <li key={p.payeeId} className="py-2.5 flex justify-between gap-3 text-sm">
                      <span className="truncate">{p.name} <span className="text-xs text-secondary">· {p.count}×</span></span>
                      <span className="tabular-nums shrink-0">{formatMoney(p.totalMinor, payees.data!.currency)}</span>
                    </li>
                  ))}
                </ul>
              </StateView>
            </section>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Income vs spending</h2>
              <Suspense fallback={<Skeleton className="h-64" />}>{cash.data ? <CashFlowChart months={cash.data.items} currency={cash.data.currency} /> : <Skeleton className="h-64" />}</Suspense>
            </section>
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Net worth, last 12 months</h2>
              <Suspense fallback={<Skeleton className="h-64" />}>{worth.data ? <NetWorthChart points={worth.data.items} currency={worth.data.currency} /> : <Skeleton className="h-64" />}</Suspense>
            </section>
          </div>
        </div>
      )}
    </StateView>
  );
}
