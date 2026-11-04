import { endOfMonth, format, parseISO, startOfMonth, startOfYear, subMonths } from 'date-fns';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FxWarning } from '../components/FxWarning';
import { Delta } from '../components/ui/Delta';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Segmented } from '../components/ui/Segmented';
import { Select } from '../components/ui/Select';
import { Skeleton, StateView } from '../components/ui/StateView';
import { Stat } from '../components/ui/Stat';
import { useCashFlow, useNetWorth, useOverview } from '../hooks/useInsights';
import { isoDate, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { paletteColor } from '../lib/palette';

const SpendingTab = lazy(() => import('../features/analytics/SpendingTab'));
const OverTimeTab = lazy(() => import('../features/analytics/OverTimeTab'));
const HabitsTab = lazy(() => import('../features/analytics/HabitsTab'));
const BudgetsTab = lazy(() => import('../features/analytics/BudgetsTab'));
const WealthTab = lazy(() => import('../features/analytics/WealthTab'));
const PeopleTab = lazy(() => import('../features/analytics/PeopleTab'));
const ForecastTab = lazy(() => import('../features/analytics/ForecastTab'));
const PatternsTab = lazy(() => import('../features/analytics/PatternsTab'));
const NetWorthChart = lazy(() => import('../components/charts/NetWorthChart'));
const CashFlowChart = lazy(() => import('../components/charts/CashFlowChart'));

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
const TABS = [['overview', 'Overview'], ['spending', 'Spending'], ['time', 'Over time'], ['habits', 'Habits'], ['budgets', 'Budgets & goals'], ['wealth', 'Wealth'], ['people', 'People'], ['forecast', 'Next month'], ['patterns', 'Worth a look']] as const;
/** Tabs whose charts follow the period chosen at the top. */
const RANGED = new Set<string>(['overview', 'spending', 'habits', 'people']);

export default function AnalyticsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('overview');
  const [range, setRange] = useState<RangeKey>('month');
  const { from, to } = useMemo(() => ({ from: isoDate(RANGES[range].from()), to: isoDate(RANGES[range].to()) }), [range]);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={RANGED.has(tab) ? `${format(parseISO(from), 'd MMM')} – ${format(parseISO(to), 'd MMM yyyy')}` : undefined}
        actions={RANGED.has(tab) ? (
          <Select className="w-44" value={range} onChange={(e) => setRange(e.target.value as RangeKey)} aria-label="Period">
            {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        ) : undefined}
      />
      <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto"><Segmented value={tab} onChange={setTab} options={TABS} className="whitespace-nowrap" /></div>
      {tab === 'spending' && <Suspense fallback={<Skeleton className="h-64" />}><SpendingTab from={from} to={to} /></Suspense>}
      {tab === 'time' && <Suspense fallback={<Skeleton className="h-64" />}><OverTimeTab /></Suspense>}
      {tab === 'habits' && <Suspense fallback={<Skeleton className="h-64" />}><HabitsTab from={from} to={to} /></Suspense>}
      {tab === 'budgets' && <Suspense fallback={<Skeleton className="h-64" />}><BudgetsTab /></Suspense>}
      {tab === 'wealth' && <Suspense fallback={<Skeleton className="h-64" />}><WealthTab /></Suspense>}
      {tab === 'people' && <Suspense fallback={<Skeleton className="h-64" />}><PeopleTab from={from} to={to} /></Suspense>}
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
  const o = overview.data;
  const topCategory = Math.max(...(o?.categoryChanges.map((c) => c.currentMinor) ?? []), 1);

  return (
    <StateView isLoading={overview.isLoading} error={overview.error} onRetry={() => void overview.refetch()} skeleton={<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>}>
      {o && (
        <div className="space-y-6">
          <FxWarning currencies={[...new Set([...o.missingCurrencies, ...(cash.data?.missingCurrencies ?? []), ...(worth.data?.missingCurrencies ?? [])])]} base={o.currency} />

          <div className="grid xl:grid-cols-3 gap-3 sm:gap-4">
            <Stat label="Earned" value={formatMoney(o.current.incomeMinor, o.currency)} tone="income" />
            <Stat label="Spent" value={formatMoney(o.current.expenseMinor, o.currency)} tone="expense" footer={<><Delta current={o.current.expenseMinor} previous={o.previous.expenseMinor} inverse /> vs the period before</>} />
            <Stat label={o.current.savingsMinor >= 0 ? 'Left over' : 'Overspent'} value={formatMoney(Math.abs(o.current.savingsMinor), o.currency)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Where it went</h2>
              {o.categoryChanges.length === 0 ? (
                <p className="text-sm text-secondary py-6 text-center">No spending in this period.</p>
              ) : (
                <ul className="space-y-3">
                  {o.categoryChanges.map((c, i) => (
                    <li key={c.categoryId}>
                      <Link to={`/transactions?category=${c.categoryId}&from=${from}&to=${to}`} className="flex justify-between gap-3 text-sm mb-1 hover:underline">
                        <span className="truncate">{c.name}</span>
                        <span className="tabular-nums text-secondary shrink-0">{formatMoney(c.currentMinor, o.currency)}</span>
                      </Link>
                      <ProgressBar tone="accent" color={c.color ?? paletteColor(i)} value={(c.currentMinor / topCategory) * 100} label={c.name} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Biggest purchases</h2>
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
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">Earned and spent</h2>
              <p className="text-xs text-secondary mb-3">Each month, for the last 12 months</p>
              <Suspense fallback={<Skeleton className="h-64" />}>{cash.data ? <CashFlowChart months={cash.data.items} currency={cash.data.currency} /> : <Skeleton className="h-64" />}</Suspense>
            </section>
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">Net worth over time</h2>
              <p className="text-xs text-secondary mb-3">Past months count investments at what you paid; this month uses today's value</p>
              <Suspense fallback={<Skeleton className="h-64" />}>{worth.data ? <NetWorthChart points={worth.data.items} currency={worth.data.currency} /> : <Skeleton className="h-64" />}</Suspense>
            </section>
          </div>
        </div>
      )}
    </StateView>
  );
}
