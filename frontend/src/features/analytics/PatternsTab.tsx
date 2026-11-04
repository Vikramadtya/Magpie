import { Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StateView } from '../../components/ui/StateView';
import { useInsights } from '../../hooks/useExtras';
import { cn } from '../../lib/cn';
import { shortDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';

export default function PatternsTab() {
  const insights = useInsights();
  const d = insights.data;
  const empty = !!d && d.highlights.length === 0 && d.movers.length === 0 && d.anomalies.length === 0 && d.subscriptions.length === 0;

  return (
    <StateView isLoading={insights.isLoading} error={insights.error} onRetry={() => void insights.refetch()} isEmpty={empty} emptyTitle="Nothing to point out yet" emptyHint="This fills in once you have a few weeks of spending recorded.">
      {d && (
        <div className="space-y-6">
          {d.highlights.length > 0 && (
            <section className="glass-panel p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />What stands out</h2>
              <ul className="space-y-2 text-sm">{d.highlights.map((h) => <li key={h} className="leading-relaxed">• {h}</li>)}</ul>
            </section>
          )}

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
        </div>
      )}
    </StateView>
  );
}
