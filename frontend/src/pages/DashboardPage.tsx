import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { MonthPicker } from '../components/ui/MonthPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { FxWarning } from '../components/FxWarning';
import { Skeleton, StateView } from '../components/ui/StateView';
import { useTransactionDialog } from '../features/transactions/TransactionDialog';
import { useDashboard, useNetWorth } from '../hooks/useInsights';
import { useForecast, useLoans } from '../hooks/useExtras';
import { monthKey, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';

const NetWorthChart = lazy(() => import('../components/charts/NetWorthChart'));

export default function DashboardPage() {
  const { name } = useWorkspace();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const dash = useDashboard(month);
  const worth = useNetWorth(6);
  const dialog = useTransactionDialog();
  const forecast = useForecast().data;
  const loans = useLoans().data;
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
        skeleton={<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>}
      >
        {d && (
          <div className="space-y-6">
            <FxWarning currencies={d.missingCurrencies} base={d.currency} />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric label="Net worth" minor={d.netWorthMinor} currency={d.currency} />
              <Metric label="Income" minor={d.incomeMinor} currency={d.currency} tone="income" />
              <Metric label="Spending" minor={d.expenseMinor} currency={d.currency} tone="expense" />
              <div className="glass-panel p-4">
                <p className="text-xs text-secondary">Savings rate</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{d.savingsRatePercent}%</p>
              </div>
            </div>

            {d.spentByOthers.length > 0 && (
              <div className="glass-panel p-4">
                <p className="text-xs text-secondary">Spent by others on your accounts this month</p>
                <p className="mt-1 text-sm">
                  {d.spentByOthers.map((o, i) => (
                    <span key={o.personId}>{i > 0 && ' · '}{o.name} <strong className="text-red-500">{formatMoney(o.expenseMinor, d.currency)}</strong></span>
                  ))}
                </p>
                <p className="text-[11px] text-secondary mt-1">Not included in your spending above.</p>
              </div>
            )}

            {(forecast && (forecast.monthsOfHistory > 0 || forecast.fixedExpenses.length > 0 || forecast.fixedIncome.length > 0)) || (loans && loans.loans.length > 0) ? (
              <div className="grid md:grid-cols-2 gap-4">
                {forecast && (forecast.monthsOfHistory > 0 || forecast.fixedExpenses.length > 0 || forecast.fixedIncome.length > 0) && (
                  <Link to="/analytics" className="glass-panel p-4 block hover:border-accent transition-colors">
                    <p className="text-xs text-secondary">Next month forecast</p>
                    <p className="mt-1 text-sm">Income <strong className="text-green-600 dark:text-green-400">{formatMoney(forecast.income.totalMinor, forecast.currency)}</strong> · Spending <strong className="text-red-500">{formatMoney(forecast.expense.totalMinor, forecast.currency)}</strong></p>
                    <p className="text-xs text-secondary mt-1">{formatMoney(forecast.expense.fixedMinor, forecast.currency)} of spending is already fixed by recurring bills</p>
                  </Link>
                )}
                {loans && loans.loans.length > 0 && (
                  <Link to="/loans" className="glass-panel p-4 block hover:border-accent transition-colors">
                    <p className="text-xs text-secondary">Loans</p>
                    <p className="mt-1 text-sm">Owed to you <strong className="text-green-600 dark:text-green-400">{formatMoney(loans.owedToMeMinor, loans.currency)}</strong> · You owe <strong className="text-red-500">{formatMoney(loans.iOweMinor, loans.currency)}</strong></p>
                  </Link>
                )}
              </div>
            ) : null}

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-2">Net worth</h2>
              <Suspense fallback={<Skeleton className="h-64" />}>
                {worth.data ? <NetWorthChart points={worth.data.items} currency={worth.data.currency} /> : <Skeleton className="h-64" />}
              </Suspense>
            </section>

            <div className="grid lg:grid-cols-2 gap-6">
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
                          <p className="text-xs text-secondary">{shortDate(t.occurredOn)} · {t.accountName}</p>
                        </div>
                        <Amount minor={t.direction * t.amountMinor} currency={t.currency} signed className="text-sm font-medium" />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="space-y-6">
                <section className="glass-panel p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold">Budgets</h2>
                    <Link to="/budgets" className="text-sm text-accent">Manage</Link>
                  </div>
                  {d.budgets.lines.length === 0 ? (
                    <p className="text-sm text-secondary">No budgets for this month.</p>
                  ) : (
                    <ul className="space-y-3">
                      {d.budgets.lines.slice(0, 4).map((b) => {
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

                <section className="glass-panel p-5">
                  <h2 className="font-semibold mb-3">Coming up</h2>
                  {d.upcoming.length === 0 ? (
                    <p className="text-sm text-secondary">Nothing due in the next two weeks.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {d.upcoming.slice(0, 5).map((u) => (
                        <li key={`${u.ruleId}-${u.date}`} className="py-2 flex justify-between text-sm">
                          <span>{u.name} <span className="text-xs text-secondary">· {shortDate(u.date)}</span></span>
                          <Amount minor={u.type === 'INCOME' ? u.amountMinor : -u.amountMinor} currency={u.currency} signed />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>

            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Accounts</h2>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {d.accounts.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border p-3 flex justify-between">
                    <span className="text-sm">{a.name}</span>
                    <Amount minor={a.balanceMinor} currency={a.currency} className="text-sm font-medium" />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </StateView>
    </>
  );
}

function Metric({ label, minor, currency, tone }: { label: string; minor: number; currency: string; tone?: 'income' | 'expense' }) {
  const color = tone === 'income' ? 'text-green-600 dark:text-green-400' : tone === 'expense' ? 'text-red-500' : '';
  return (
    <div className="glass-panel p-4">
      <p className="text-xs text-secondary">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums break-all ${color}`}>{formatMoney(minor, currency)}</p>
    </div>
  );
}
