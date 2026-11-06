import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { BreakdownRow } from '../../api/types';
import { Skeleton, SkeletonCard } from '../../components/ui/StateView';
import { cn } from '../../lib/cn';
import { formatCompact } from '../../lib/money';
import { paletteColor } from '../../lib/palette';

export const INCOME_COLOR = '#2FB67C';
export const EXPENSE_COLOR = '#EE5D7C';
export const OTHER_COLOR = '#8B8F9C';

/** A titled card for one chart: a plain name, one line on what it shows, and its loading and empty states. */
export function ChartCard({ title, hint, loading, error, empty, emptyText = 'Nothing to show here yet.', actions, className, children }: {
  title: string; hint?: string; loading?: boolean; error?: unknown; empty?: boolean; emptyText?: string; actions?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <section className={cn('glass-panel p-5 min-w-0', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {hint && <p className="text-xs text-secondary mt-0.5">{hint}</p>}
        </div>
        {actions}
      </div>
      {loading ? <Skeleton className="h-56" /> : error ? <p className="text-sm text-red-500 py-6">This chart could not be loaded.</p> : empty ? <p className="text-sm text-secondary py-10 text-center">{emptyText}</p> : children}
    </section>
  );
}

/** Every "YYYY-MM" from the month of `from` to the month of `to`. */
export function monthKeys(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = startOfMonth(parseISO(from)); d <= parseISO(to); d = addMonths(d, 1)) out.push(format(d, 'yyyy-MM'));
  return out;
}

export const monthName = (m: string) => format(parseISO(`${m}-01`), 'MMM yy');
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** A short number for chart axes: 12K, 1.5M. */
export const compact = formatCompact;

export interface Series { key: string; label: string; color: string }

/**
 * Rows of (bucket, group, total) laid out as one object per bucket with a number per group, ready
 * for stacked or multi-line charts. Groups are ordered by size, and "everything else" goes last.
 */
export function pivotRows(rows: BreakdownRow[], buckets: string[]): { data: Record<string, number | string>[]; series: Series[] } {
  const groups = new Map<string, { label: string; color: string | null; total: number }>();
  rows.forEach((r) => {
    const g = groups.get(r.key) ?? { label: r.label, color: r.color, total: 0 };
    g.total += r.totalMinor;
    groups.set(r.key, g);
  });
  const ordered = [...groups.entries()].sort((a, b) => (a[0] === 'other' ? 1 : b[0] === 'other' ? -1 : b[1].total - a[1].total));
  const series = ordered.map(([key, g], i) => ({ key, label: g.label, color: key === 'other' ? OTHER_COLOR : g.color ?? paletteColor(i) }));
  const data = buckets.map((bucket) => ({ bucket, ...Object.fromEntries(series.map((s) => [s.key, 0])) }) as Record<string, number | string>);
  const at = new Map(buckets.map((b, i) => [b, i]));
  rows.forEach((r) => {
    const i = at.get(r.bucket);
    if (i !== undefined) data[i][r.key] = r.totalMinor;
  });
  return { data, series };
}

/** One total per bucket (0 for buckets with nothing in them). */
export function totalsByBucket(rows: BreakdownRow[], buckets: string[]): { total: number; count: number }[] {
  const out = buckets.map(() => ({ total: 0, count: 0 }));
  const at = new Map(buckets.map((b, i) => [b, i]));
  rows.forEach((r) => {
    const i = at.get(r.bucket);
    if (i !== undefined) {
      out[i].total += r.totalMinor;
      out[i].count += r.count;
    }
  });
  return out;
}

/** Average of the last `n` values at each point (fewer at the start). */
export function movingAverage(values: number[], n: number): number[] {
  return values.map((_, i) => Math.round(sum(values.slice(Math.max(0, i - n + 1), i + 1)) / Math.min(n, i + 1)));
}


/**
 * Wraps a chart that fetches its own data so it only mounts (and so only fetches and draws) once it
 * is about to scroll into view. A long Analytics tab then costs a few requests, not dozens.
 */
export function whenVisible<P extends object>(Chart: ComponentType<P>): ComponentType<P> {
  function Lazy(props: P) {
    const ref = useRef<HTMLDivElement>(null);
    const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
    useEffect(() => {
      const el = ref.current;
      if (seen || !el) return;
      const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: '320px 0px' });
      io.observe(el);
      return () => io.disconnect();
    }, [seen]);
    if (seen) return <Chart {...props} />;
    return <div ref={ref}><SkeletonCard lines={5} className="min-h-[20rem]" /></div>;
  }
  Lazy.displayName = `Lazy(${Chart.displayName ?? Chart.name})`;
  return Lazy;
}
