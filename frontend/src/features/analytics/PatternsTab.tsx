import { Lightbulb } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton, StateView } from '../../components/ui/StateView';
import { useInsights } from '../../hooks/useExtras';
import { cn } from '../../lib/cn';
import { shortDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';

const SimpleBars = lazy(() => import('../../components/charts/SimpleBars'));

export default function PatternsTab() {
  const insights = useInsights();
  const d = insights.data;
  const empty = !!d && d.highlights.length === 0 && d.weekdays.every((w) => w.averageMinor === 0) && d.savings.length === 0;

  return (
    <StateView isLoading={insights.isLoading} error={insights.error} onRetry={() => void insights.refetch()} isEmpty={empty} emptyTitle="No patterns yet" emptyHint="Patterns appear once you have a few weeks of spending recorded.">
      {d && (
        <div className="space-y-6">
          {d.highlights.length > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />What stands out</h2>
              <ul className="space-y-2 text-sm">{d.highlights.map((h) => <li key={h} className="leading-relaxed">• {h}</li>)}</ul>
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">Spending by weekday</h2>
              <p className="text-xs text-secondary mb-2">Average per day over the last 90 days</p>
              <Suspense fallback={<Skeleton className="h-56" />}>
                <SimpleBars data={d.weekdays.map((w) => ({ label: w.day.slice(0, 3), value: w.averageMinor }))} currency={d.currency} label="Average spend" />
              </Suspense>
            </section>
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">Through the month</h2>
              <p className="text-xs text-secondary mb-2">Average spend by part of the month</p>
              <Suspense fallback={<Skeleton className="h-56" />}>
                <SimpleBars data={d.weeksOfMonth.map((w) => ({ label: w.label.replace('Days ', ''), value: w.averageMinor }))} currency={d.currency} label="Average spend" color="#FF9F0A" />
              </Suspense>
            </section>
          </div>

          {d.movers.length > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">Different from usual this month</h2>
              <p className="text-xs text-secondary mb-3">Compared with your average for the same point in the last three months</p>
              <ul className="divide-y divide-border text-sm">
                {d.movers.map((m) => (
                  <li key={m.name} className="py-2 flex justify-between gap-3">
                    <span>{m.name}</span>
                    <span className="tabular-nums text-right">
                      <span className={cn('font-medium', m.deltaMinor > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400')}>{m.deltaMinor > 0 ? '+' : ''}{m.percent}%</span>
                      <span className="text-xs text-secondary"> · {formatMoney(m.thisMonthMinor, d.currency)} vs usual {formatMoney(m.usualMinor, d.currency)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {d.anomalies.length > 0 && (
              <section className="glass-panel p-5">
                <h2 className="font-semibold mb-1">Unusually large purchases</h2>
                <p className="text-xs text-secondary mb-3">Last 60 days, far above the usual size for the category</p>
                <ul className="divide-y divide-border text-sm">
                  {d.anomalies.map((a) => (
                    <li key={a.id} className="py-2 flex justify-between gap-3">
                      <span>{a.name} <span className="text-xs text-secondary">· {a.category} · {shortDate(a.date)}</span></span>
                      <span className="tabular-nums text-right"><span className="font-medium">{formatMoney(a.amountMinor, d.currency)}</span><span className="text-xs text-secondary"> · {a.timesTypical}× usual</span></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {d.subscriptions.length > 0 && (
              <section className="glass-panel p-5">
                <h2 className="font-semibold mb-1">Possible subscriptions</h2>
                <p className="text-xs text-secondary mb-3">Regular charges not yet in <Link to="/recurring" className="text-accent">Recurring</Link></p>
                <ul className="divide-y divide-border text-sm">
                  {d.subscriptions.map((s) => (
                    <li key={s.payee} className="py-2 flex justify-between gap-3">
                      <span>{s.payee} <span className="text-xs text-secondary">· {s.frequency.toLowerCase()} · next ~{shortDate(s.nextExpected)}</span></span>
                      <span className="tabular-nums text-right">{formatMoney(s.amountMinor, d.currency)}<span className="text-xs text-secondary"> · {formatMoney(s.perYearMinor, d.currency)}/yr</span></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {d.growth.length > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-1">Climbing categories</h2>
              <p className="text-xs text-secondary mb-3">Spending trending up over the last six months</p>
              <ul className="divide-y divide-border text-sm">
                {d.growth.map((g) => (
                  <li key={g.name} className="py-2 flex justify-between"><span>{g.name}</span><span className="tabular-nums"><span className="text-red-500 font-medium">+{g.percentPerMonth}%/mo</span> <span className="text-xs text-secondary">· last month {formatMoney(g.latestMinor, d.currency)}</span></span></li>
                ))}
              </ul>
            </section>
          )}

          {d.savings.length > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Savings rate</h2>
              <ul className="space-y-2">
                {d.savings.map((s) => (
                  <li key={s.month} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3 text-sm">
                    <span className="text-secondary">{s.month}</span>
                    <ProgressBar tone="accent" value={Math.max(0, s.ratePercent)} label={`Savings rate ${s.month}`} />
                    <span className={cn('tabular-nums text-right', s.ratePercent < 0 && 'text-red-500')}>{s.ratePercent}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.largest.length > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3">Biggest purchases this month</h2>
              <ul className="divide-y divide-border text-sm">
                {d.largest.map((p) => (
                  <li key={p.id} className="py-2 flex justify-between"><span>{p.name} <span className="text-xs text-secondary">· {p.category} · {shortDate(p.date)}</span></span><span className="tabular-nums">{formatMoney(p.amountMinor, d.currency)}</span></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </StateView>
  );
}
