import { format, parseISO, subMonths } from 'date-fns';
import { useMemo, useState, type ReactNode } from 'react';
import type { HistoryPoint } from '../../api/types';
import { Modal } from '../../components/ui/Modal';
import { Segmented } from '../../components/ui/Segmented';
import { Skeleton } from '../../components/ui/StateView';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/money';
import { Trend } from '../analytics/charts';

export interface HistorySeries { key: string; label: string; color: string; points: HistoryPoint[] }
export interface HistoryChart { title: string; hint?: string; series: HistorySeries[]; mode?: 'line' | 'area' }
export interface HistoryStat { label: string; value: ReactNode; tone?: 'good' | 'bad' }

const RANGES = [['3m', '3 months'], ['6m', '6 months'], ['1y', '1 year'], ['all', 'All time']] as const;
const day = (d: string) => format(parseISO(d), 'd MMM yy');

/** Rows for the line chart: one per date, one column per series, each series carried forward between its points. */
function rows(series: HistorySeries[], from: Date | null) {
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort().filter((d) => !from || parseISO(d) >= from);
  const lookups = series.map((s) => new Map(s.points.map((p) => [p.date, p.minor])));
  return dates.map((date) => ({ bucket: date, ...Object.fromEntries(series.map((s, i) => [s.key, lookups[i].get(date)])) }));
}

/** The high, low and change of one series over the period shown. */
function highlights(points: HistoryPoint[], from: Date | null, currency: string) {
  const inRange = points.filter((p) => !from || parseISO(p.date) >= from);
  if (inRange.length < 2) return null;
  const first = inRange[0];
  const last = inRange[inRange.length - 1];
  const high = inRange.reduce((a, b) => (b.minor > a.minor ? b : a));
  const low = inRange.reduce((a, b) => (b.minor < a.minor ? b : a));
  const change = last.minor - first.minor;
  const pct = first.minor !== 0 ? (change / Math.abs(first.minor)) * 100 : null;
  return { change, pct, high, low, currency };
}

/** The history of any one thing: stats on top, then charts you can view over 3 months to all time. */
export function HistoryModal({ title, subtitle, currency, stats, charts, loading, error, onClose, footer }: {
  title: string; subtitle?: string; currency: string; stats?: HistoryStat[]; charts: HistoryChart[]; loading?: boolean; error?: unknown; onClose: () => void; footer?: ReactNode;
}) {
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('1y');
  const from = range === '3m' ? subMonths(new Date(), 3) : range === '6m' ? subMonths(new Date(), 6) : range === '1y' ? subMonths(new Date(), 12) : null;
  const data = useMemo(() => charts.map((c) => rows(c.series, from)), [charts, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const lead = charts[0]?.series[0]?.points ?? [];
  const h = highlights(lead, from, currency);
  const hasData = charts.some((c) => c.series.some((s) => s.points.length > 1));

  return (
    <Modal isOpen onClose={onClose} title={title} className="sm:max-w-3xl">
      <div className="space-y-5">
        {subtitle && <p className="text-body text-secondary -mt-1">{subtitle}</p>}
        {stats && stats.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-caption text-secondary">{s.label}</dt>
                <dd className={cn('text-heading tabular-nums', s.tone === 'good' && 'text-green-600 dark:text-green-400', s.tone === 'bad' && 'text-red-500')}>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <Segmented value={range} onChange={setRange} options={RANGES} />

        {loading ? <Skeleton className="h-64" /> : error ? <p className="text-body text-red-500">The history could not be loaded.</p> : !hasData ? (
          <p className="text-body text-secondary py-10 text-center">Not enough history recorded yet. It builds up as you use Keeper, and earlier months are filled in where the data exists.</p>
        ) : (
          <>
            {h && (
              <ul className="grid sm:grid-cols-3 gap-3 text-body">
                <li className="rounded-xl bg-primary/[0.04] px-3 py-2"><span className="block text-caption text-secondary">Change over this period</span><span className={cn('tabular-nums font-medium', h.change > 0 ? 'text-green-600 dark:text-green-400' : h.change < 0 ? 'text-red-500' : '')}>{h.change > 0 ? '+' : h.change < 0 ? '−' : ''}{formatMoney(Math.abs(h.change), currency)}{h.pct !== null && <span className="text-caption"> ({h.change >= 0 ? '+' : '−'}{Math.abs(h.pct).toFixed(1)}%)</span>}</span></li>
                <li className="rounded-xl bg-primary/[0.04] px-3 py-2"><span className="block text-caption text-secondary">Highest · {day(h.high.date)}</span><span className="tabular-nums font-medium">{formatMoney(h.high.minor, currency)}</span></li>
                <li className="rounded-xl bg-primary/[0.04] px-3 py-2"><span className="block text-caption text-secondary">Lowest · {day(h.low.date)}</span><span className="tabular-nums font-medium">{formatMoney(h.low.minor, currency)}</span></li>
              </ul>
            )}
            {charts.map((c, i) => (
              c.series.some((s) => s.points.length > 1) && (
                <section key={c.title}>
                  <h3>{c.title}</h3>
                  {c.hint && <p className="text-caption text-secondary mb-2">{c.hint}</p>}
                  <Trend data={data[i]} currency={currency} xFormat={(v) => format(parseISO(v), range === '3m' || range === '6m' ? 'd MMM' : 'MMM yy')} series={c.series.map(({ key, label, color }) => ({ key, label, color }))} mode={c.mode ?? 'line'} dots={data[i].length < 10} height={220} />
                </section>
              )
            ))}
          </>
        )}
        {footer}
      </div>
    </Modal>
  );
}
