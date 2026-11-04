import { endOfMonth, parseISO } from 'date-fns';
import { Banknote, Inbox, Lightbulb, PiggyBank } from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Dashboard } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { FxWarning } from '../components/FxWarning';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { MonthPicker } from '../components/ui/MonthPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton, StateView } from '../components/ui/StateView';
import { useTransactionDialog } from '../features/transactions/TransactionDialog';
import { useLoans } from '../hooks/useExtras';
import { useDashboard } from '../hooks/useInsights';
import { useInboxCount } from '../hooks/useInbox';
import { isoDate, monthKey, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { paletteColor } from '../lib/palette';

const PaceCard = lazy(() => import('../features/analytics/DashboardCharts').then((m) => ({ default: m.PaceCard })));
const NetWorthTrend = lazy(() => import('../features/analytics/DashboardCharts').then((m) => ({ default: m.NetWorthTrend })));
const BudgetCompact = lazy(() => import('../features/analytics/DashboardCharts').then((m) => ({ default: m.BudgetCompact })));

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export default function DashboardPage() {
  const { name } = useWorkspace();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const dash = useDashboard(month);
  const dialog = useTransactionDialog();
  const d = dash.data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={name} />
      <StateView
        isLoading={dash.isLoading}
        error={dash.error}
        onRetry={() => void dash.refetch()}
        isEmpty={!!d && d.accounts.length === 0}
        emptyTitle="Welcome to Keeper"
        emptyHint="Add your first account to start tracking."
        emptyAction={<Link to="/accounts"><Button>Add an account</Button></Link>}
        skeleton={<div className="grid lg:grid-cols-2 gap-6">{[0, 1].map((i) => <Skeleton key={i} className="h-56" />)}</div>}
      >
        {d && (
          <div className="space-y-6">
            <FxWarning currencies={d.missingCurrencies} base={d.currency} />

            <div className="grid lg:grid-cols-2 gap-6">
              <NetWorthCard d={d} />
              <MonthCard d={d} month={month} onMonth={setMonth} />
            </div>

            <NeedsAttention d={d} month={month} />

            <Suspense fallback={<div className="grid lg:grid-cols-2 gap-6"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}>
              <div className="grid lg:grid-cols-2 gap-6">
                <PaceCard d={d} month={month} />
                <NetWorthTrend />
              </div>
            </Suspense>

            <div className="grid lg:grid-cols-3 gap-6">
              <TopCategories d={d} month={month} />
              <Suspense fallback={<Skeleton className="h-72" />}><BudgetCompact d={d} /></Suspense>
              <UpcomingCard d={d} />
            </div>

              <section className="glass-panel p-5">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold">Recent activity</h2>
                  <Link to="/transactions" className="text-sm text-accent">View all</Link>
                </div>
                {d.recent.length === 0 ? (
                  <p className="text-sm text-secondary py-4">No transactions yet. <button className="text-accent" onClick={() => dialog.open()}>Add one</button></p>
                ) : (
                  <ul className="divide-y divide-border">
                    {d.recent.map((t) => (
                      <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.payeeName ?? t.note ?? t.categoryName ?? t.type}</p>
                          <p className="text-xs text-secondary truncate">{shortDate(t.occurredOn)} · {t.accountName}{t.categoryName ? ` · ${t.categoryName}` : ''}</p>
                        </div>
                        <Amount minor={t.direction * t.amountMinor} currency={t.currency} signed className="text-sm font-medium" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
          </div>
        )}
      </StateView>
    </>
  );
}

/** Net worth as a sum you can check: what you have, less what you owe. */
function NetWorthCard({ d }: { d: Dashboard }) {
  return (
    <section className="hero-card p-6 flex flex-col">
      <div className="flex justify-between items-center">
        <h2 className="text-[13px] font-medium text-white/60">Net worth today</h2>
        <Link to="/accounts" className="text-xs text-white/60 hover:text-white">See accounts</Link>
      </div>
      <p className="text-4xl font-semibold mt-1.5 tabular-nums tracking-[-0.03em]">{formatMoney(d.netWorthMinor, d.currency)}</p>
      <p className="text-xs text-white/60 mt-1">What you have, minus what you owe</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {d.worth.map((l) => (
          <li key={l.label} className="flex justify-between gap-3">
            <span className="text-white/80">{l.label}</span>
            <span className="tabular-nums">{l.minor < 0 ? '− ' : ''}{formatMoney(Math.abs(l.minor), d.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Days of the month that have happened (all of them for a past month). */
function daysElapsed(month: string, length: number) {
  const now = new Date();
  return month === monthKey(now) ? Math.min(now.getDate(), length) : length;
}

function MonthCard({ d, month, onMonth }: { d: Dashboard; month: string; onMonth: (m: string) => void }) {
  const length = d.dailySpend.length;
  const elapsed = daysElapsed(month, length);
  const projected = elapsed < length && elapsed > 0 ? Math.round((sum(d.dailySpend.slice(0, elapsed)) / elapsed) * length) : null;
  const lastMonth = sum(d.previousDailySpend);
  const left = d.incomeMinor - d.expenseMinor;
  return (
    <section className="glass-panel p-6 flex flex-col">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h2 className="font-semibold">Money in and out</h2>
        <MonthPicker month={month} onChange={onMonth} />
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-secondary">Earned</dt><dd className="tabular-nums font-medium text-green-600 dark:text-green-400">{formatMoney(d.incomeMinor, d.currency)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-secondary">Spent</dt><dd className="tabular-nums font-medium text-red-500">{formatMoney(d.expenseMinor, d.currency)}</dd></div>
        <div className="flex justify-between gap-3 border-t border-border pt-2"><dt className="font-medium">{left >= 0 ? 'Left over' : 'Overspent'}</dt><dd className="tabular-nums text-xl font-semibold">{formatMoney(Math.abs(left), d.currency)}</dd></div>
      </dl>
      {(projected !== null && projected > 0 || lastMonth > 0) && (
        <p className="text-xs text-secondary mt-auto pt-4">
          {projected !== null && projected > 0 && <>At this rate you will spend about {formatMoney(projected, d.currency)} this month. </>}
          {lastMonth > 0 && <>The month before: {formatMoney(lastMonth, d.currency)}.</>}
        </p>
      )}
    </section>
  );
}

/** Only what needs a look or a decision; the card is absent when there is nothing. */
function NeedsAttention({ d, month }: { d: Dashboard; month: string }) {
  const loans = useLoans().data;
  const waiting = useInboxCount().data ?? 0;
  const length = d.dailySpend.length;
  const daysLeft = length - daysElapsed(month, length) + 1;
  const remaining = d.budgets.budgetedMinor - d.budgets.spentMinor;
  const over = d.budgets.lines.filter((b) => b.remainingMinor < 0);

  const rows: { icon: ReactNode; to: string; text: ReactNode }[] = [];
  if (waiting > 0) rows.push({ icon: <Inbox className="w-4 h-4" />, to: '/inbox', text: <><strong>{waiting}</strong> {waiting === 1 ? 'entry' : 'entries'} waiting for your review</> });
  if (over.length > 0) rows.push({ icon: <PiggyBank className="w-4 h-4 text-red-500" />, to: '/budgets', text: <>Over budget: {over.slice(0, 3).map((b) => b.categoryName).join(', ')}</> });
  else if (month === monthKey(new Date()) && d.budgets.budgetedMinor > 0 && remaining > 0) rows.push({ icon: <PiggyBank className="w-4 h-4" />, to: '/budgets', text: <>You can spend about <strong>{formatMoney(Math.round(remaining / daysLeft), d.currency)}</strong> a day and stay on budget</> });
  if (loans && (loans.owedToMeMinor > 0 || loans.iOweMinor > 0)) rows.push({ icon: <Banknote className="w-4 h-4" />, to: '/loans', text: <>{loans.owedToMeMinor > 0 && <>Owed to you <strong>{formatMoney(loans.owedToMeMinor, loans.currency)}</strong></>}{loans.owedToMeMinor > 0 && loans.iOweMinor > 0 && ' · '}{loans.iOweMinor > 0 && <>You owe <strong>{formatMoney(loans.iOweMinor, loans.currency)}</strong></>}</> });
  d.spentByOthers.forEach((o) => rows.push({ icon: <Lightbulb className="w-4 h-4" />, to: '/transactions', text: <>{o.name} spent <strong>{formatMoney(o.expenseMinor, d.currency)}</strong> on your accounts (not in your totals)</> }));
  if (rows.length === 0) return null;

  return (
    <section className="glass-panel p-3">
      <ul className="grid sm:grid-cols-2 gap-1">
        {rows.map((r, i) => (
          <li key={i}>
            <Link to={r.to} className="flex gap-3 items-start rounded-lg p-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">
              <span className="mt-0.5 text-accent shrink-0">{r.icon}</span>
              <span className="leading-snug">{r.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopCategories({ d, month }: { d: Dashboard; month: string }) {
  const max = d.topCategories[0]?.totalMinor || 1;
  const first = parseISO(`${month}-01`);
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Where it went</h2>
        <Link to="/analytics" className="text-sm text-accent">More</Link>
      </div>
      {d.topCategories.length === 0 ? (
        <p className="text-sm text-secondary">No spending this month.</p>
      ) : (
        <ul className="space-y-3">
          {d.topCategories.map((c, i) => (
            <li key={c.categoryId}>
              <Link to={`/transactions?category=${c.categoryId}&from=${isoDate(first)}&to=${isoDate(endOfMonth(first))}`} className="flex justify-between gap-3 text-sm mb-1 hover:underline">
                <span>{c.name}</span>
                <span className="tabular-nums text-secondary">{formatMoney(c.totalMinor, d.currency)}</span>
              </Link>
              <ProgressBar tone="accent" color={c.color ?? paletteColor(i)} value={(c.totalMinor / max) * 100} label={c.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpcomingCard({ d }: { d: Dashboard }) {
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Coming up</h2>
        <Link to="/recurring" className="text-sm text-accent">Recurring</Link>
      </div>
      {d.upcoming.length === 0 ? (
        <p className="text-sm text-secondary">Nothing due in the next two weeks.</p>
      ) : (
        <ul className="divide-y divide-border">
          {d.upcoming.slice(0, 6).map((u) => (
            <li key={`${u.ruleId}-${u.date}`} className="py-2 flex justify-between gap-2 text-sm">
              <span className="truncate">{u.name} <span className="text-xs text-secondary">· {shortDate(u.date)}</span></span>
              <Amount minor={u.type === 'INCOME' ? u.amountMinor : -u.amountMinor} currency={u.currency} signed />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
