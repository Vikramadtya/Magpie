import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarClock, Inbox, Lightbulb, PiggyBank, TrendingUp } from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Dashboard } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { FxWarning } from '../components/FxWarning';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { Delta } from '../components/ui/Delta';
import { MonthPicker } from '../components/ui/MonthPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton, StateView } from '../components/ui/StateView';
import { Stat } from '../components/ui/Stat';
import { useTransactionDialog } from '../features/transactions/TransactionDialog';
import { useForecast, useLoans } from '../hooks/useExtras';
import { useDashboard, useNetWorth } from '../hooks/useInsights';
import { useInboxCount } from '../hooks/useInbox';
import { monthKey, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { paletteColor } from '../lib/palette';

const Sparkline = lazy(() => import('../components/charts/Sparkline'));
const PaceChart = lazy(() => import('../components/charts/PaceChart'));

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export default function DashboardPage() {
  const { name } = useWorkspace();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const dash = useDashboard(month);
  const worth = useNetWorth(6);
  const dialog = useTransactionDialog();
  const d = dash.data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={name} actions={<MonthPicker month={month} onChange={setMonth} />} />
      <StateView
        isLoading={dash.isLoading}
        error={dash.error}
        onRetry={() => void dash.refetch()}
        isEmpty={!!d && d.accounts.length === 0}
        emptyTitle="Welcome to Keeper"
        emptyHint="Add your first account to start tracking."
        emptyAction={<Link to="/accounts"><Button>Add an account</Button></Link>}
        skeleton={<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>}
      >
        {d && (
          <div className="space-y-6">
            <FxWarning currencies={d.missingCurrencies} base={d.currency} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <NetWorthHero d={d} points={worth.data?.items.map((p) => p.netWorthMinor) ?? []} />
              <Stat icon={<ArrowDownLeft className="w-4 h-4" />} label="Income" value={formatMoney(d.incomeMinor, d.currency)} tone="income" footer={<><Delta current={d.incomeMinor} previous={d.previousIncomeMinor} /> vs last month</>} />
              <Stat icon={<ArrowUpRight className="w-4 h-4" />} label="Spending" value={formatMoney(d.expenseMinor, d.currency)} tone="expense" footer={<><Delta current={d.expenseMinor} previous={d.previousExpenseMinor} inverse /> vs last month</>} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <PaceCard d={d} month={month} />
              <InsightsCard d={d} month={month} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <TopCategories d={d} />
              <BudgetsCard d={d} />
              <UpcomingCard d={d} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <section className="glass-panel p-5 lg:col-span-2">
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

              <section className="glass-panel p-5">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold">Accounts</h2>
                  <Link to="/accounts" className="text-sm text-accent">Manage</Link>
                </div>
                <ul className="divide-y divide-border">
                  {d.accounts.map((a) => (
                    <li key={a.id} className="py-2 flex justify-between gap-2 text-sm">
                      <span className="truncate">{a.name}{a.memo && <span className="text-xs text-secondary"> · lent</span>}</span>
                      <Amount minor={a.balanceMinor} currency={a.currency} className="font-medium" />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </StateView>
    </>
  );
}

function NetWorthHero({ d, points }: { d: Dashboard; points: number[] }) {
  return (
    <div className="hero-card p-6 col-span-2 flex flex-col">
      <p className="text-[13px] font-medium text-white/60">Net worth</p>
      <p className="text-4xl font-semibold mt-1.5 tabular-nums tracking-[-0.03em]">{formatMoney(d.netWorthMinor, d.currency)}</p>
      <p className="text-xs text-white/60 mt-2 flex items-center gap-1.5 flex-wrap">
        {points.length > 1 && <><Delta onDark current={points[points.length - 1]} previous={points[0]} /> over 6 months · </>}
        Assets {formatMoney(d.assetsMinor, d.currency)} · Debts {formatMoney(Math.abs(d.liabilitiesMinor), d.currency)}
      </p>
      <div className="mt-auto pt-3">
        <Suspense fallback={<Skeleton className="h-16" />}>{points.length > 1 ? <Sparkline values={points} /> : <div className="h-16" />}</Suspense>
      </div>
    </div>
  );
}

/** Days of the month that have happened (all of them for a past month). */
function daysElapsed(month: string, length: number) {
  const now = new Date();
  return month === monthKey(now) ? Math.min(now.getDate(), length) : length;
}

function PaceCard({ d, month }: { d: Dashboard; month: string }) {
  const length = d.dailySpend.length;
  const elapsed = daysElapsed(month, length);
  const spent = sum(d.dailySpend.slice(0, elapsed));
  const projected = elapsed < length && elapsed > 0 ? Math.round((spent / elapsed) * length) : spent;
  const lastMonth = sum(d.previousDailySpend);
  return (
    <section className="glass-panel p-5 lg:col-span-2">
      <div className="flex flex-wrap justify-between gap-2 mb-2">
        <div>
          <h2 className="font-semibold">Spending pace</h2>
          <p className="text-xs text-secondary">Running total, this month against last</p>
        </div>
        {spent > 0 && (
          <p className="text-sm text-right">
            {elapsed < length ? 'On pace for ' : 'Spent '}<strong className="tabular-nums">{formatMoney(projected, d.currency)}</strong>
            {lastMonth > 0 && <> <Delta current={projected} previous={lastMonth} inverse /></>}
          </p>
        )}
      </div>
      {spent === 0 && lastMonth === 0 ? (
        <p className="text-sm text-secondary py-10 text-center">Record some spending to see your pace.</p>
      ) : (
        <Suspense fallback={<Skeleton className="h-56" />}>
          <PaceChart current={d.dailySpend} previous={d.previousDailySpend} currency={d.currency} daysSoFar={elapsed} />
        </Suspense>
      )}
    </section>
  );
}

function InsightsCard({ d, month }: { d: Dashboard; month: string }) {
  const forecast = useForecast().data;
  const loans = useLoans().data;
  const waiting = useInboxCount().data ?? 0;
  const length = d.dailySpend.length;
  const elapsed = daysElapsed(month, length);
  const daysLeft = length - elapsed + 1;
  const remaining = d.budgets.budgetedMinor - d.budgets.spentMinor;
  const over = d.budgets.lines.filter((b) => b.remainingMinor < 0);
  const saved = d.incomeMinor - d.expenseMinor;

  const rows: { icon: ReactNode; to: string; text: ReactNode }[] = [];
  if (waiting > 0) rows.push({ icon: <Inbox className="w-4 h-4" />, to: '/inbox', text: <><strong>{waiting}</strong> shared {waiting === 1 ? 'expense' : 'expenses'} waiting for your review</> });
  if (over.length > 0) rows.push({ icon: <PiggyBank className="w-4 h-4 text-red-500" />, to: '/budgets', text: <><strong>{over.length}</strong> {over.length === 1 ? 'budget is' : 'budgets are'} over: {over.slice(0, 2).map((b) => b.categoryName).join(', ')}</> });
  else if (month === monthKey(new Date()) && d.budgets.budgetedMinor > 0 && remaining > 0) rows.push({ icon: <PiggyBank className="w-4 h-4" />, to: '/budgets', text: <>You can spend about <strong>{formatMoney(Math.round(remaining / daysLeft), d.currency)}</strong> a day for the rest of the month and stay on budget</> });
  if (d.incomeMinor > 0) rows.push({ icon: <TrendingUp className="w-4 h-4" />, to: '/analytics', text: saved >= 0 ? <>You have saved <strong>{formatMoney(saved, d.currency)}</strong> ({d.savingsRatePercent}% of income) so far</> : <>You have spent <strong>{formatMoney(-saved, d.currency)}</strong> more than you earned</> });
  if (forecast && (forecast.monthsOfHistory > 0 || forecast.fixedExpenses.length > 0)) rows.push({ icon: <CalendarClock className="w-4 h-4" />, to: '/analytics', text: <>Next month: about <strong>{formatMoney(forecast.expense.totalMinor, forecast.currency)}</strong> out, <strong>{formatMoney(forecast.income.totalMinor, forecast.currency)}</strong> in</> });
  if (loans && (loans.owedToMeMinor > 0 || loans.iOweMinor > 0)) rows.push({ icon: <Banknote className="w-4 h-4" />, to: '/loans', text: <>{loans.owedToMeMinor > 0 && <>Owed to you <strong>{formatMoney(loans.owedToMeMinor, loans.currency)}</strong></>}{loans.owedToMeMinor > 0 && loans.iOweMinor > 0 && ' · '}{loans.iOweMinor > 0 && <>You owe <strong>{formatMoney(loans.iOweMinor, loans.currency)}</strong></>}</> });
  d.spentByOthers.forEach((o) => rows.push({ icon: <Lightbulb className="w-4 h-4" />, to: '/transactions', text: <>{o.name} spent <strong>{formatMoney(o.expenseMinor, d.currency)}</strong> on your accounts (not in your totals)</> }));

  return (
    <section className="glass-panel p-5">
      <h2 className="font-semibold mb-3">What to know</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-secondary">Nothing needs your attention. Insights appear as you record more.</p>
      ) : (
        <ul className="space-y-1">
          {rows.slice(0, 6).map((r, i) => (
            <li key={i}>
              <Link to={r.to} className="flex gap-3 items-start rounded-lg p-2 -mx-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">
                <span className="mt-0.5 text-accent shrink-0">{r.icon}</span>
                <span className="leading-snug">{r.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TopCategories({ d }: { d: Dashboard }) {
  const max = d.topCategories[0]?.totalMinor || 1;
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Where it went</h2>
        <Link to="/analytics" className="text-sm text-accent">Analytics</Link>
      </div>
      {d.topCategories.length === 0 ? (
        <p className="text-sm text-secondary">No spending this month.</p>
      ) : (
        <ul className="space-y-3">
          {d.topCategories.map((c, i) => (
            <li key={c.categoryId}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color ?? paletteColor(i) }} />{c.name}</span>
                <span className="tabular-nums text-secondary">{formatMoney(c.totalMinor, d.currency)}</span>
              </div>
              <ProgressBar tone="accent" color={c.color ?? paletteColor(i)} value={(c.totalMinor / max) * 100} label={c.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BudgetsCard({ d }: { d: Dashboard }) {
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Budgets</h2>
        <Link to="/budgets" className="text-sm text-accent">Manage</Link>
      </div>
      {d.budgets.lines.length === 0 ? (
        <p className="text-sm text-secondary">No budgets for this month. <Link to="/budgets" className="text-accent">Set one</Link></p>
      ) : (
        <ul className="space-y-3">
          {[...d.budgets.lines].sort((a, b) => b.spentMinor / Math.max(b.amountMinor + b.rolloverMinor, 1) - a.spentMinor / Math.max(a.amountMinor + a.rolloverMinor, 1)).slice(0, 5).map((b) => {
            const total = b.amountMinor + b.rolloverMinor;
            return (
              <li key={b.categoryId}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{b.categoryName}</span>
                  <span className="text-secondary tabular-nums">{formatMoney(b.spentMinor, d.currency)} / {formatMoney(total, d.currency)}</span>
                </div>
                <ProgressBar value={total > 0 ? (b.spentMinor / total) * 100 : 100} label={b.categoryName} />
              </li>
            );
          })}
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
