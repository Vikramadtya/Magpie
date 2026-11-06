import { format, parseISO, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { Segmented } from '../../components/ui/Segmented';
import { Skeleton } from '../../components/ui/StateView';
import { assetKind } from '../../lib/assetKinds';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/money';
import { useInvestmentHistory } from '../../hooks/useCharts';
import { Trend } from '../analytics/charts';

const RANGES = [['6m', '6 months'], ['1y', '1 year'], ['all', 'All time']] as const;

/** What you put in against what it is worth, over time, with the gain so far. */
export function PerformanceCard() {
  const q = useInvestmentHistory();
  const [range, setRange] = useState<(typeof RANGES)[number][0]>('all');
  const d = q.data;
  const currency = d?.currency ?? 'USD';

  const market = (d?.holdings ?? []).filter((h) => !assetKind(h.assetType));
  const invested = market.reduce((a, h) => a + h.costMinor, 0);
  const worth = market.reduce((a, h) => a + h.valueMinor, 0);
  const gain = worth - invested;
  const pct = invested > 0 ? (gain / invested) * 100 : 0;

  const data = useMemo(() => {
    if (!d) return [];
    const today = new Date().toISOString().slice(0, 10);
    const dates = [...new Set([...d.invested.map((p) => p.date), ...d.value.map((p) => p.date), today])].sort();
    let paid = 0;
    let val: number | undefined;
    const all = dates.map((date) => {
      d.invested.filter((p) => p.date === date).forEach((p) => (paid = p.minor));
      d.value.filter((p) => p.date === date).forEach((p) => (val = p.minor));
      // "Worth" for today is the live total, even before a daily snapshot exists.
      return { bucket: date, invested: paid, value: date === today ? worth : val };
    });
    const from = range === '6m' ? subMonths(new Date(), 6) : range === '1y' ? subMonths(new Date(), 12) : null;
    return from ? all.filter((p) => parseISO(p.bucket) >= from) : all;
  }, [d, range, worth]);

  const points = data.filter((p) => p.value !== undefined).length;

  return (
    <section className="glass-panel p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2>How your investments are doing</h2>
          <p className="text-caption text-secondary mt-0.5">Paid in (grey) against what it is worth (blue).</p>
        </div>
        <Segmented value={range} onChange={setRange} options={RANGES} />
      </div>

      <dl className="grid grid-cols-3 gap-4 mb-4">
        <div><dt className="text-caption text-secondary">Paid in</dt><dd className="text-heading tabular-nums">{formatMoney(invested, currency)}</dd></div>
        <div><dt className="text-caption text-secondary">Worth now</dt><dd className="text-heading tabular-nums">{formatMoney(worth, currency)}</dd></div>
        <div>
          <dt className="text-caption text-secondary">Gain so far</dt>
          <dd className={cn('text-heading tabular-nums', gain > 0 ? 'text-green-600 dark:text-green-400' : gain < 0 ? 'text-red-500' : '')}>
            {gain > 0 ? '+' : gain < 0 ? '−' : ''}{formatMoney(Math.abs(gain), currency)} <span className="text-caption">{invested > 0 && `(${gain >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%)`}</span>
          </dd>
        </div>
      </dl>

      {q.isLoading ? <Skeleton className="h-56" /> : data.length < 2 ? (
        <p className="text-body text-secondary py-10 text-center">Add a holding with its purchase date to see how it grows.</p>
      ) : (
        <>
          <Trend data={data} currency={currency} xFormat={(v) => format(parseISO(v), 'MMM yy')} dots={points < 8} series={[{ key: 'invested', label: 'Paid in', color: '#8B8F9C' }, { key: 'value', label: 'Worth', color: 'var(--accent-blue)' }]} height={240} />
          {points < 3 && (
            <p className="text-caption text-secondary mt-2">Past months are filled in from market history when it is available. Until then, this line builds up as prices refresh.</p>
          )}
        </>
      )}
    </section>
  );
}
