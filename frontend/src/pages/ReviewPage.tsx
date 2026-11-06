import { useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { budgetsApi } from '../api/endpoints';
import { useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { CountUp } from '../components/ui/CountUp';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/StateView';
import { useBreakdown, useBudgetHistory } from '../hooks/useCharts';
import { useInboxCount } from '../hooks/useInbox';
import { useRefunds } from '../hooks/useRefunds';
import { useTransactionSummary } from '../hooks/useTransactions';
import { cn } from '../lib/cn';
import { isoDate, monthKey, shiftMonth } from '../lib/dates';
import { errorMessage } from '../lib/http';
import { suggestLimit } from '../lib/budgetSuggest';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';

const STEPS = ['How it went', 'Where it went', 'Budgets', 'Tidy up', 'Next month'];

export default function ReviewPage() {
  const { id: ws, baseCurrency: currency } = useWorkspace();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => shiftMonth(monthKey(new Date()), -1));
  const [step, setStep] = useState(0);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const first = parseISO(`${month}-01`);
  const last = endOfMonth(first);
  const prevFrom = shiftMonth(month, -1);
  const threeFrom = shiftMonth(month, -2);
  const next = shiftMonth(month, 1);
  const nextLabel = format(parseISO(`${next}-01`), 'MMMM yyyy');
  const monthLabel = format(first, 'MMMM');

  const spend = useBreakdown({ by: 'none', bucket: 'month', type: 'EXPENSE', from: `${prevFrom}-01`, to: isoDate(last) });
  const income = useBreakdown({ by: 'none', bucket: 'month', type: 'INCOME', from: `${prevFrom}-01`, to: isoDate(last) });
  const cats = useBreakdown({ by: 'category', bucket: 'month', type: 'EXPENSE', from: `${threeFrom}-01`, to: isoDate(last), limit: 12 });
  const history = useBudgetHistory(8);
  const uncategorised = useTransactionSummary({ from: `${month}-01`, to: isoDate(last), type: 'EXPENSE', uncategorised: true });
  const waiting = useInboxCount().data ?? 0;
  const refunds = useRefunds().data?.pendingCount ?? 0;

  const totals = (rows?: { bucket: string; totalMinor: number }[]) => ({
    now: rows?.find((r) => r.bucket === month)?.totalMinor ?? 0,
    before: rows?.find((r) => r.bucket === prevFrom)?.totalMinor ?? 0,
  });
  const spent = totals(spend.data?.rows);
  const earned = totals(income.data?.rows);
  const saved = earned.now - spent.now;

  const categories = useMemo(() => {
    const byKey = new Map<string, { key: string; label: string; now: number; before: number; sum: number }>();
    for (const r of cats.data?.rows ?? []) {
      const c = byKey.get(r.key) ?? { key: r.key, label: r.label, now: 0, before: 0, sum: 0 };
      c.sum += r.totalMinor;
      if (r.bucket === month) c.now += r.totalMinor;
      if (r.bucket === prevFrom) c.before += r.totalMinor;
      byKey.set(r.key, c);
    }
    return [...byKey.values()].filter((c) => c.key && c.key !== 'other').sort((a, b) => b.sum - a.sum);
  }, [cats.data, month, prevFrom]);

  const reviewedBudget = history.data?.find((h) => h.month === month);
  const lastLimits = new Map(reviewedBudget?.lines.map((l) => [l.categoryId, l.amountMinor]) ?? []);
  const suggestions = categories.slice(0, 8).map((c) => ({ ...c, suggested: suggestLimit(c.sum / 3, currency) }));
  const loading = spend.isLoading || cats.isLoading;

  const saveBudgets = async () => {
    setSaving(true);
    try {
      const chosen = suggestions.flatMap((s) => {
        const minor = parseMoney(limits[s.key] ?? toInputValue(s.suggested, currency), currency);
        return minor && minor > 0 ? [{ id: s.key, minor }] : [];
      });
      await Promise.all(chosen.map((c) => budgetsApi.set(ws, c.id, next, c.minor, false, false)));
      await qc.invalidateQueries({ queryKey: ['ws', ws] });
      toast.success(`Budget set for ${nextLabel}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const change = (now: number, before: number) => (before === 0 ? null : Math.round(((now - before) * 100) / before));
  const spendChange = change(spent.now, spent.before);

  return (
    <>
      <PageHeader title="Monthly review" subtitle={`A two-minute look back at ${monthLabel}, then a budget for ${format(parseISO(`${next}-01`), 'MMMM')}.`} />
      <div className="max-w-2xl mx-auto">
        <ol className="flex items-center gap-1.5 mb-6" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <button type="button" onClick={() => setStep(i)} className="w-full text-left group" aria-label={`Step ${i + 1}: ${label}`}>
                <span className={cn('block h-1 rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-primary/[0.1]')} />
                <span className={cn('hidden sm:block mt-1.5 text-caption', i === step ? 'font-medium' : 'text-secondary')}>{label}</span>
              </button>
            </li>
          ))}
        </ol>

        <section className="glass-panel p-6 sm:p-8 min-h-[22rem] page-enter" key={step}>
          {loading ? (
            <div className="space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-24" /><Skeleton className="h-16" /></div>
          ) : (
            <>
              {step === 0 && (
                <div className="space-y-6">
                  <h2>How {monthLabel} went</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><p className="text-body text-secondary">Income</p><p className="text-title tabular-nums text-green-600 dark:text-green-400"><CountUp value={earned.now} format={(n) => formatMoney(n, currency)} /></p></div>
                    <div><p className="text-body text-secondary">Spending</p><p className="text-title tabular-nums text-red-500"><CountUp value={spent.now} format={(n) => formatMoney(n, currency)} /></p></div>
                  </div>
                  <div className="rounded-2xl bg-primary/[0.04] p-5">
                    <p className="text-body text-secondary">{saved >= 0 ? 'You kept' : 'You overspent by'}</p>
                    <p className="text-display tabular-nums"><CountUp value={Math.abs(saved)} format={(n) => formatMoney(n, currency)} /></p>
                    {earned.now > 0 && saved >= 0 && <p className="text-body text-secondary mt-1">{Math.round((saved * 100) / earned.now)}% of your income.</p>}
                  </div>
                  {spendChange !== null && (
                    <p className="text-body">You spent <strong>{Math.abs(spendChange)}% {spendChange <= 0 ? 'less' : 'more'}</strong> than the month before ({formatMoney(spent.before, currency)}).</p>
                  )}
                  {spent.now === 0 && earned.now === 0 && <p className="text-body text-secondary">No activity recorded in {monthLabel}. Pick another month below.</p>}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <h2>Where it went</h2>
                  {categories.length === 0 ? <p className="text-body text-secondary">No spending in this period.</p> : (
                    <ul className="space-y-4">
                      {categories.filter((c) => c.now > 0).slice(0, 6).map((c) => {
                        const d = change(c.now, c.before);
                        return (
                          <li key={c.key}>
                            <div className="flex justify-between gap-3 text-body mb-1.5">
                              <span>{c.label}</span>
                              <span className="tabular-nums">{formatMoney(c.now, currency)} {d !== null && <span className={cn('text-caption', d > 15 ? 'text-red-500' : d < -15 ? 'text-green-600' : 'text-secondary')}>{d > 0 ? '+' : ''}{d}%</span>}</span>
                            </div>
                            <ProgressBar tone="accent" value={(c.now / (categories[0]?.now || 1)) * 100} label={c.label} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="text-caption text-secondary">Percentages compare with the month before.</p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h2>How your budgets did</h2>
                  {!reviewedBudget || reviewedBudget.lines.length === 0 ? (
                    <p className="text-body text-secondary">You had no budgets in {monthLabel}. The last step will suggest some from what you actually spend.</p>
                  ) : (
                    <ul className="space-y-4">
                      {reviewedBudget.lines.map((l) => {
                        const total = l.amountMinor + l.rolloverMinor;
                        const over = l.spentMinor > total;
                        return (
                          <li key={l.categoryId}>
                            <div className="flex justify-between gap-3 text-body mb-1.5">
                              <span>{l.categoryName}</span>
                              <span className={cn('tabular-nums', over && 'text-red-500')}>{formatMoney(l.spentMinor, currency)} of {formatMoney(total, currency)}</span>
                            </div>
                            <ProgressBar value={total > 0 ? (l.spentMinor / total) * 100 : 100} label={l.categoryName} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h2>Tidy up</h2>
                  <ul className="divide-y divide-border text-body">
                    <TidyRow ok={(uncategorised.data?.count ?? 0) === 0} okText="Every spending entry has a category" text={`${uncategorised.data?.count ?? 0} spending entries have no category`} to={`/transactions?none=1&from=${month}-01&to=${isoDate(last)}`} action="Fix" />
                    <TidyRow ok={waiting === 0} okText="Nothing waiting in To review" text={`${waiting} entries waiting in To review`} to="/inbox" action="Review" />
                    <TidyRow ok={refunds === 0} okText="No refunds to chase" text={`${refunds} refunds still to get back`} to="/refunds" action="Open" />
                  </ul>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <h2>A budget for {nextLabel}</h2>
                  <p className="text-body text-secondary">Suggested from your usual monthly spending over the last three months. Adjust anything, then set it.</p>
                  {suggestions.length === 0 ? <p className="text-body text-secondary">Not enough spending yet to suggest limits.</p> : (
                    <ul className="divide-y divide-border">
                      {suggestions.map((s) => (
                        <li key={s.key} className="py-3 grid grid-cols-[1fr_9rem] items-center gap-3">
                          <div className="min-w-0">
                            <p className="text-body font-medium truncate">{s.label}</p>
                            <p className="text-caption text-secondary">Usually {formatMoney(Math.round(s.sum / 3), currency)}{lastLimits.has(s.key) ? ` · last limit ${formatMoney(lastLimits.get(s.key) ?? 0, currency)}` : ''}</p>
                          </div>
                          <MoneyInput aria-label={`Limit for ${s.label}`} value={limits[s.key] ?? toInputValue(s.suggested, currency)} currency={currency} onChange={(v) => setLimits({ ...limits, [s.key]: v })} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button className="w-full" disabled={saving || suggestions.length === 0} onClick={() => void saveBudgets()}><Check className="w-4 h-4 mr-2" />Set budget for {nextLabel}</Button>
                  <p className="text-caption text-center text-secondary">You can fine-tune it any time under <Link to="/plan/budgets" className="text-accent">Plan, Budgets</Link>.</p>
                </div>
              )}
            </>
          )}
        </section>

        <div className="flex items-center justify-between mt-5">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          <label className="text-caption text-secondary flex items-center gap-2">
            Reviewing
            <input type="month" value={month} max={monthKey(new Date())} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-lg border border-border bg-surface px-2 text-body text-primary" aria-label="Month to review" />
          </label>
          <Button disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
        </div>
      </div>
    </>
  );
}

function TidyRow({ ok, okText, text, to, action }: { ok: boolean; okText: string; text: string; to: string; action: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0', ok ? 'bg-green-500/15 text-green-600' : 'bg-amber-500/15 text-amber-600')}>{ok ? <Check className="w-3.5 h-3.5" /> : '!'}</span>
      <span className="flex-1">{ok ? okText : text}</span>
      {!ok && <Link to={to} className="text-accent text-body">{action}</Link>}
    </li>
  );
}
