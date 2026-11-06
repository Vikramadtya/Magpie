import { useQueryClient } from '@tanstack/react-query';
import { endOfMonth, parseISO } from 'date-fns';
import { Banknote, ClipboardCheck, Inbox, LineChart, Lightbulb, PiggyBank, Undo2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { sampleApi } from '../api/endpoints';
import type { Dashboard } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { FxWarning } from '../components/FxWarning';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { CategoryBadge } from '../components/ui/CategoryBadge';
import { CountUp } from '../components/ui/CountUp';
import { MonthPicker } from '../components/ui/MonthPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton, SkeletonCard, SkeletonRows, StateView } from '../components/ui/StateView';
import { NetWorthHistory, SpendingHistory } from '../features/history/lazy';
import { SetupWizard } from '../features/onboarding/SetupWizard';
import { useTransactionDialog } from '../features/transactions/TransactionDialog';
import { useLoans } from '../hooks/useExtras';
import { useInboxCount } from '../hooks/useInbox';
import { useDashboard } from '../hooks/useInsights';
import { useCategories } from '../hooks/useReference';
import { useRefunds } from '../hooks/useRefunds';
import { cn } from '../lib/cn';
import { isoDate, monthKey, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { paletteColor } from '../lib/palette';

const PaceCard = lazy(() => import('../features/analytics/DashboardCharts').then((m) => ({ default: m.PaceCard })));
const NetWorthTrend = lazy(() => import('../features/analytics/DashboardCharts').then((m) => ({ default: m.NetWorthTrend })));
const BudgetCompact = lazy(() => import('../features/analytics/DashboardCharts').then((m) => ({ default: m.BudgetCompact })));

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function greeting(name?: string | null) {
  const h = new Date().getHours();
  const word = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${word}, ${first}` : word;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const dash = useDashboard(month);
  const d = dash.data;
  // Once setup has started it stays until finished, even though the first account makes the ledger non-empty.
  const [setup, setSetup] = useState(false);
  useEffect(() => {
    if (d && d.accounts.length === 0) setSetup(true);
  }, [d]);

  if (setup) return <SetupWizard onDone={() => setSetup(false)} />;

  return (
    <>
      <PageHeader title={greeting(user?.name)} subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} />
      <StateView
        isLoading={dash.isLoading}
        error={dash.error}
        onRetry={() => void dash.refetch()}
        skeleton={
          <div className="space-y-6">
            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 [&>*]:min-w-0"><Skeleton className="h-72 !rounded-[20px]" /><Skeleton className="h-72 !rounded-[20px]" /></div>
            <SkeletonCard lines={2} />
            <SkeletonRows rows={4} />
          </div>
        }
      >
        {d && (
          <div className="space-y-6">
            <FxWarning currencies={d.missingCurrencies} base={d.currency} />
            <SampleBanner d={d} />

            <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 [&>*]:min-w-0">
              <SafeCard d={d} />
              <NetWorthCard d={d} />
            </div>

            <NeedsAttention d={d} month={month} />

            <div className="grid lg:grid-cols-2 gap-6 [&>*]:min-w-0">
              <MonthCard d={d} month={month} onMonth={setMonth} />
              <Suspense fallback={<SkeletonCard lines={4} className="h-full" />}><PaceCard d={d} month={month} /></Suspense>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 [&>*]:min-w-0">
              <TopCategories d={d} month={month} />
              <Suspense fallback={<SkeletonCard lines={4} />}><BudgetCompact d={d} /></Suspense>
              <div className="md:col-span-2 xl:col-span-1 [&>section]:h-full"><UpcomingCard d={d} /></div>
            </div>

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 [&>*]:min-w-0">
              <RecentActivity d={d} />
              <Suspense fallback={<SkeletonCard lines={4} />}><NetWorthTrend /></Suspense>
            </div>
          </div>
        )}
      </StateView>
    </>
  );
}

/** Shown while the ledger only holds the sample accounts, with a one-click way out. */
function SampleBanner({ d }: { d: Dashboard }) {
  const { workspace } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  if (!workspace || d.accounts.length === 0 || !d.accounts.every((a) => a.name.startsWith('Sample \u00b7 '))) return null;
  return (
    <div className="glass-panel p-4 flex flex-wrap items-center gap-3 !bg-accent/[0.07]">
      <p className="text-body flex-1 min-w-[14rem]">You are looking at <strong>sample data</strong>. Clear it when you are ready to add your own.</p>
      <Button size="sm" disabled={busy} onClick={() => { setBusy(true); void sampleApi.clear(workspace.id).then(() => qc.invalidateQueries({ queryKey: ['ws', workspace.id] })).finally(() => setBusy(false)); }}>Clear sample data</Button>
    </div>
  );
}

/** The number to look at first: money you can spend without upsetting anything already planned. */
function SafeCard({ d }: { d: Dashboard }) {
  const { safe } = d;
  const negative = safe.totalMinor < 0;
  return (
    <section className="hero-card p-6 sm:p-7 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-medium text-white/65">Safe to spend</h2>
        <Link to="/wealth/accounts" className="text-caption text-white/60 hover:text-white">Accounts</Link>
      </div>
      <p className={cn('text-display mt-2 tabular-nums', negative && 'text-rose-300')}>
        <CountUp value={safe.totalMinor} format={(n) => formatMoney(n, d.currency)} />
      </p>
      <p className="text-body text-white/65 mt-1.5">
        {negative
          ? 'Bills and goals come to more than you hold right now.'
          : safe.daysLeft > 1
            ? <>About <strong className="text-white">{formatMoney(safe.perDayMinor, d.currency)}</strong> a day for the {safe.daysLeft} days left this month.</>
            : 'That is what is free to spend today.'}
      </p>
      <ul className="mt-5 pt-4 border-t border-white/10 space-y-1.5 text-body">
        {safe.lines.map((l) => (
          <li key={l.label} className="flex justify-between gap-3">
            <span className="text-white/70">{l.label}</span>
            <span className="tabular-nums">{l.minor < 0 ? '− ' : ''}{formatMoney(Math.abs(l.minor), d.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Net worth as a sum you can check: what you have, less what you owe. */
function NetWorthCard({ d }: { d: Dashboard }) {
  const [history, setHistory] = useState(false);
  return (
    <>
    <section className="glass-panel p-6 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-body font-medium text-secondary">Net worth</h2>
        <span className="flex items-center gap-3 text-caption">
          <button type="button" onClick={() => setHistory(true)} className="text-accent">History</button>
          <Link to="/wealth" className="text-accent">Details</Link>
        </span>
      </div>
      <p className="text-[2rem] leading-tight font-semibold tracking-[-0.03em] mt-1.5 tabular-nums">
        <CountUp value={d.netWorthMinor} format={(n) => formatMoney(n, d.currency)} />
      </p>
      <p className="text-caption text-secondary mt-1">What you have, minus what you owe</p>
      <ul className="mt-4 space-y-1.5 text-body">
        {d.worth.map((l) => (
          <li key={l.label} className="flex justify-between gap-3">
            <span className="text-secondary">{l.label}</span>
            <span className="tabular-nums">{l.minor < 0 ? '− ' : ''}{formatMoney(Math.abs(l.minor), d.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
    {history && <NetWorthHistory currency={d.currency} onClose={() => setHistory(false)} />}
    </>
  );
}

/** Days of the month that have happened (all of them for a past month). */
function daysElapsed(month: string, length: number) {
  const now = new Date();
  return month === monthKey(now) ? Math.min(now.getDate(), length) : length;
}

function MonthCard({ d, month, onMonth }: { d: Dashboard; month: string; onMonth: (m: string) => void }) {
  const left = d.incomeMinor - d.expenseMinor;
  return (
    <section className="glass-panel p-6 flex flex-col">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h2>Income and spending</h2>
        <MonthPicker month={month} onChange={onMonth} />
      </div>
      <dl className="space-y-2.5 text-body">
        <div className="flex justify-between gap-3"><dt className="text-secondary">Income</dt><dd className="tabular-nums font-medium text-green-600 dark:text-green-400">{formatMoney(d.incomeMinor, d.currency)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-secondary">Spending</dt><dd className="tabular-nums font-medium text-red-500">{formatMoney(d.expenseMinor, d.currency)}</dd></div>
        <div className="flex justify-between items-baseline gap-3 pt-3 mt-1 border-t border-border"><dt className="font-medium">{left >= 0 ? 'Left over' : 'Overspent'}</dt><dd className="tabular-nums text-[1.625rem] font-semibold tracking-[-0.02em]">{formatMoney(Math.abs(left), d.currency)}</dd></div>
      </dl>
      {d.previousExpenseMinor > 0 && <p className="text-caption text-secondary mt-auto pt-4">Last month you spent {formatMoney(d.previousExpenseMinor, d.currency)}.</p>}
    </section>
  );
}

/** Only what needs a look or a decision; the card is absent when there is nothing. */
function NeedsAttention({ d, month }: { d: Dashboard; month: string }) {
  const loans = useLoans().data;
  const waiting = useInboxCount().data ?? 0;
  const refunds = useRefunds().data;
  const length = d.dailySpend.length;
  const daysLeft = length - daysElapsed(month, length) + 1;
  const remaining = d.budgets.budgetedMinor - d.budgets.spentMinor;
  const over = d.budgets.lines.filter((b) => b.remainingMinor < 0);
  const today = new Date();
  const reviewDue = today.getDate() <= 5 && month === monthKey(today);

  const rows: { icon: ReactNode; to: string; text: ReactNode }[] = [];
  if (reviewDue) rows.push({ icon: <ClipboardCheck className="w-4 h-4" />, to: '/review', text: <>A new month. <strong>Review last month</strong> and set this month&apos;s budget in 2 minutes</> });
  if (waiting > 0) rows.push({ icon: <Inbox className="w-4 h-4" />, to: '/inbox', text: <><strong>{waiting}</strong> {waiting === 1 ? 'entry' : 'entries'} waiting for your review</> });
  if (refunds && refunds.pendingCount > 0) rows.push({ icon: <Undo2 className="w-4 h-4" />, to: '/refunds', text: <><strong>{refunds.pendingCount}</strong> {refunds.pendingCount === 1 ? 'refund' : 'refunds'} to get back, <strong>{formatMoney(refunds.pendingMinor, refunds.currency)}</strong></> });
  if (over.length > 0) rows.push({ icon: <PiggyBank className="w-4 h-4 text-red-500" />, to: '/plan/budgets', text: <>Over budget: {over.slice(0, 3).map((b) => b.categoryName).join(', ')}</> });
  else if (month === monthKey(today) && d.budgets.budgetedMinor > 0 && remaining > 0) rows.push({ icon: <PiggyBank className="w-4 h-4" />, to: '/plan/budgets', text: <>You can spend about <strong>{formatMoney(Math.round(remaining / daysLeft), d.currency)}</strong> a day and stay on budget</> });
  if (loans && (loans.owedToMeMinor > 0 || loans.iOweMinor > 0)) rows.push({ icon: <Banknote className="w-4 h-4" />, to: '/wealth/loans', text: <>{loans.owedToMeMinor > 0 && <>Owed to you <strong>{formatMoney(loans.owedToMeMinor, loans.currency)}</strong></>}{loans.owedToMeMinor > 0 && loans.iOweMinor > 0 && ' · '}{loans.iOweMinor > 0 && <>You owe <strong>{formatMoney(loans.iOweMinor, loans.currency)}</strong></>}</> });
  d.spentByOthers.forEach((o) => rows.push({ icon: <Lightbulb className="w-4 h-4" />, to: '/transactions', text: <>{o.name} spent <strong>{formatMoney(o.expenseMinor, d.currency)}</strong> on your accounts (not in your totals)</> }));
  if (rows.length === 0) return null;

  return (
    <section className="glass-panel p-2.5">
      <ul className="grid sm:grid-cols-2 gap-0.5">
        {rows.map((r, i) => (
          <li key={i}>
            <Link to={r.to} className="flex gap-3 items-start rounded-xl p-2.5 text-body hover:bg-black/[0.04] dark:hover:bg-white/5 transition-colors">
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
  const categories = useCategories().data ?? [];
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null);
  const max = d.topCategories[0]?.totalMinor || 1;
  const first = parseISO(`${month}-01`);
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-4">
        <h2>Where it went</h2>
        <Link to="/analytics" className="text-body text-accent">More</Link>
      </div>
      {d.topCategories.length === 0 ? (
        <p className="text-body text-secondary">No spending this month.</p>
      ) : (
        <ul className="space-y-3.5">
          {d.topCategories.map((c, i) => {
            const cat = categories.find((x) => x.id === c.categoryId);
            return (
              <li key={c.categoryId}>
                <div className="flex items-center gap-2.5 text-body mb-1.5">
                  <Link to={`/transactions?category=${c.categoryId}&from=${isoDate(first)}&to=${isoDate(endOfMonth(first))}`} className="flex flex-1 min-w-0 items-center gap-2.5 hover:underline">
                    <CategoryBadge name={c.name} icon={cat?.icon} color={c.color ?? cat?.color} size={26} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-secondary">{formatMoney(c.totalMinor, d.currency)}</span>
                  </Link>
                  <button type="button" aria-label={`History of ${c.name}`} title="History" onClick={() => setHistory({ id: c.categoryId, name: c.name })} className="p-1 rounded-md text-secondary hover:text-accent hover:bg-black/5 dark:hover:bg-white/10"><LineChart className="w-4 h-4" /></button>
                </div>
                <ProgressBar tone="accent" color={c.color ?? paletteColor(i)} value={(c.totalMinor / max) * 100} label={c.name} />
              </li>
            );
          })}
        </ul>
      )}
      {history && <SpendingHistory title={history.name} categoryId={history.id} currency={d.currency} onClose={() => setHistory(null)} />}
    </section>
  );
}

function UpcomingCard({ d }: { d: Dashboard }) {
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-4">
        <h2>Coming up</h2>
        <Link to="/plan/recurring" className="text-body text-accent">Recurring</Link>
      </div>
      {d.upcoming.length === 0 ? (
        <p className="text-body text-secondary">Nothing due in the next two weeks.</p>
      ) : (
        <ul className="divide-y divide-border">
          {d.upcoming.slice(0, 6).map((u) => (
            <li key={`${u.ruleId}-${u.date}`} className="py-2.5 flex justify-between gap-2 text-body">
              <span className="truncate">{u.name} <span className="text-caption text-secondary">· {shortDate(u.date)}</span></span>
              <Amount minor={u.type === 'INCOME' ? u.amountMinor : -u.amountMinor} currency={u.currency} signed />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentActivity({ d }: { d: Dashboard }) {
  const dialog = useTransactionDialog();
  const categories = useCategories().data ?? [];
  return (
    <section className="glass-panel p-5">
      <div className="flex justify-between items-center mb-2">
        <h2>Recent activity</h2>
        <Link to="/transactions" className="text-body text-accent">View all</Link>
      </div>
      {d.recent.length === 0 ? (
        <p className="text-body text-secondary py-4">No transactions yet. <button className="text-accent" onClick={() => dialog.open()}>Add one</button></p>
      ) : (
        <ul className="divide-y divide-border">
          {d.recent.map((t) => {
            const c = categories.find((x) => x.id === t.categoryId);
            const parent = c?.parentId ? categories.find((x) => x.id === c.parentId) : c;
            return (
              <li key={t.id} className="py-2.5 flex items-center gap-3">
                <CategoryBadge name={t.categoryName ?? t.payeeName ?? '?'} icon={parent?.icon} color={parent?.color} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium truncate">{t.payeeName ?? t.note ?? t.categoryName ?? t.type}</p>
                  <p className="text-caption text-secondary truncate">{shortDate(t.occurredOn)} · {t.accountName}{t.categoryName ? ` · ${t.categoryName}` : ''}</p>
                </div>
                <Amount minor={t.direction * t.amountMinor} currency={t.currency} signed className="text-body font-medium" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
