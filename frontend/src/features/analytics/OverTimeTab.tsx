import { endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { Select } from '../../components/ui/Select';
import { useBreakdown } from '../../hooks/useCharts';
import { useDashboard } from '../../hooks/useInsights';
import { isoDate, monthKey } from '../../lib/dates';
import { Columns, PairColumns, SavingsChart, StackedColumns, Trend } from './charts';
import { PaceCard } from './DashboardCharts';
import { ChartCard, EXPENSE_COLOR, INCOME_COLOR, monthKeys, monthName, movingAverage, pivotRows, totalsByBucket, whenVisible } from './kit';

const WINDOWS = [[6, 'Last 6 months'], [12, 'Last 12 months'], [24, 'Last 24 months']] as const;
const SHORT = (m: string) => format(new Date(`${m}-01T00:00:00`), 'MMM');

export default function OverTimeTab() {
  const [months, setMonths] = useState<number>(12);
  const now = new Date();
  const from = isoDate(startOfMonth(subMonths(now, months - 1)));
  const to = isoDate(endOfMonth(now));
  const buckets = useMemo(() => monthKeys(from, to), [from, to]);

  const spend = useBreakdown({ by: 'none', bucket: 'month', from, to });
  const income = useBreakdown({ by: 'none', bucket: 'month', type: 'INCOME', from, to });
  const spendTotals = totalsByBucket(spend.data?.rows ?? [], buckets);
  const incomeTotals = totalsByBucket(income.data?.rows ?? [], buckets);
  const currency = spend.data?.currency ?? income.data?.currency ?? 'USD';
  const anySpend = spendTotals.some((t) => t.total > 0);
  const loading = spend.isLoading || income.isLoading;
  const error = spend.error ?? income.error;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select className="w-44" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="How far back">
          {WINDOWS.map(([n, label]) => <option key={n} value={n}>{label}</option>)}
        </Select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Spending per month" hint="Everything you spent, month by month." loading={loading} error={error} empty={!anySpend} emptyText="No spending in this period.">
          <Columns data={buckets.map((m, i) => ({ x: monthName(m), value: spendTotals[i].total }))} currency={currency} />
        </ChartCard>
        <ChartCard title="Income and spending" hint="Income next to spending for each month." loading={loading} error={error} empty={!anySpend && !incomeTotals.some((t) => t.total > 0)}>
          <PairColumns data={buckets.map((m, i) => ({ x: monthName(m), a: incomeTotals[i].total, b: spendTotals[i].total }))} currency={currency} a={{ name: 'Earned', color: INCOME_COLOR }} b={{ name: 'Spending', color: EXPENSE_COLOR }} />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Saved per month" hint="Income minus spending (red when you spent more), with the share of income you kept as the line." loading={loading} error={error} empty={!anySpend && !incomeTotals.some((t) => t.total > 0)}>
          <SavingsChart
            currency={currency}
            data={buckets.map((m, i) => {
              const saved = incomeTotals[i].total - spendTotals[i].total;
              return { x: monthName(m), saved, rate: incomeTotals[i].total > 0 ? Math.round((saved / incomeTotals[i].total) * 100) : null };
            })}
          />
        </ChartCard>
        <ChartCard title="Spending, smoothed" hint="Each month with the average of the last three, so a one-off spike does not hide the trend." loading={spend.isLoading} error={spend.error} empty={!anySpend}>
          <Trend
            currency={currency}
            xFormat={monthName}
            series={[{ key: 'month', label: 'That month', color: '#8B8F9C' }, { key: 'avg', label: '3-month average', color: 'var(--accent-blue)' }]}
            data={(() => {
              const values = spendTotals.map((t) => t.total);
              const avg = movingAverage(values, 3);
              return buckets.map((m, i) => ({ bucket: m, month: values[i], avg: avg[i] }));
            })()}
          />
        </ChartCard>
      </div>

      <CategoriesOverTime from={from} to={to} buckets={buckets} />
      <YearOnYear />

      <div className="grid lg:grid-cols-2 gap-6">
        <IncomeSources from={from} to={to} buckets={buckets} />
        <ChartCard title="Number of purchases" hint="How many expenses you recorded each month." loading={spend.isLoading} error={spend.error} empty={!anySpend}>
          <Columns data={buckets.map((m, i) => ({ x: monthName(m), value: spendTotals[i].count }))} currency={currency} color="#A06CF2" label="Purchases" format={(v) => String(Math.round(v))} />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <FixedVsEveryday from={from} to={to} buckets={buckets} />
        <ThisMonthPace />
      </div>
      <DayByDay />
    </div>
  );
}

function CategoriesOverTimeView({ from, to, buckets }: { from: string; to: string; buckets: string[] }) {
  const q = useBreakdown({ by: 'category', bucket: 'month', from, to, limit: 7 });
  const { data, series } = useMemo(() => pivotRows(q.data?.rows ?? [], buckets), [q.data, buckets]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const shown = series.filter((s) => !hidden.has(s.key));
  const currency = q.data?.currency ?? 'USD';
  return (
    <>
      <ChartCard title="Category mix by month" hint="Your biggest categories stacked for each month." loading={q.isLoading} error={q.error} empty={series.length === 0} emptyText="No spending in this period.">
        <StackedColumns data={data} series={series} currency={currency} xFormat={monthName} />
      </ChartCard>
      <ChartCard title="Each category over time" hint="Tap a name to show or hide its line, to see which categories are climbing." loading={q.isLoading} error={q.error} empty={series.length === 0} emptyText="No spending in this period.">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {series.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={!hidden.has(s.key)}
              onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(s.key)) n.delete(s.key); else n.add(s.key); return n; })}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs aria-pressed:bg-primary/[0.06] opacity-60 aria-pressed:opacity-100"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label}
            </button>
          ))}
        </div>
        <Trend data={data} series={shown} currency={currency} xFormat={monthName} legend={false} />
      </ChartCard>
    </>
  );
}

function YearOnYearView() {
  const now = new Date();
  const from = isoDate(startOfMonth(subMonths(now, 23)));
  const to = isoDate(endOfMonth(now));
  const q = useBreakdown({ by: 'none', bucket: 'month', from, to });
  const byMonth = new Map((q.data?.rows ?? []).map((r) => [r.bucket, r.totalMinor]));
  const year = now.getFullYear();
  const data = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const future = year === now.getFullYear() && i > now.getMonth();
    return { bucket: SHORT(`${year}-${m}`), thisYear: future ? undefined : byMonth.get(`${year}-${m}`) ?? 0, lastYear: byMonth.get(`${year - 1}-${m}`) ?? 0 };
  });
  const any = [...byMonth.values()].some((v) => v > 0);
  return (
    <ChartCard title="This year against last year" hint="The same month in each year, to see if you spend more than you did." loading={q.isLoading} error={q.error} empty={!any}>
      <Trend data={data} currency={q.data?.currency ?? 'USD'} xFormat={(v) => v} series={[{ key: 'thisYear', label: String(year), color: 'var(--accent-blue)' }, { key: 'lastYear', label: String(year - 1), color: '#8B8F9C' }]} />
    </ChartCard>
  );
}

function IncomeSourcesView({ from, to, buckets }: { from: string; to: string; buckets: string[] }) {
  const q = useBreakdown({ by: 'category', bucket: 'month', type: 'INCOME', from, to, limit: 6 });
  const { data, series } = useMemo(() => pivotRows(q.data?.rows ?? [], buckets), [q.data, buckets]);
  return (
    <ChartCard title="Where income came from" hint="Each income category, month by month." loading={q.isLoading} error={q.error} empty={series.length === 0} emptyText="No income in this period.">
      <StackedColumns data={data} series={series} currency={q.data?.currency ?? 'USD'} xFormat={monthName} />
    </ChartCard>
  );
}

function FixedVsEverydayView({ from, to, buckets }: { from: string; to: string; buckets: string[] }) {
  const q = useBreakdown({ by: 'kind', bucket: 'month', from, to });
  const { data, series } = useMemo(() => {
    const p = pivotRows(q.data?.rows ?? [], buckets);
    return { data: p.data, series: p.series.map((s) => ({ ...s, color: s.key === 'recurring' ? 'var(--accent-blue)' : '#F2A33A' })) };
  }, [q.data, buckets]);
  return (
    <ChartCard title="Regular bills and everyday spending" hint="Money from recurring items against everything else." loading={q.isLoading} error={q.error} empty={series.length === 0} emptyText="No spending in this period.">
      <StackedColumns data={data} series={series} currency={q.data?.currency ?? 'USD'} xFormat={monthName} />
    </ChartCard>
  );
}

function ThisMonthPaceView() {
  const month = monthKey(new Date());
  const d = useDashboard(month).data;
  return d ? <PaceCard d={d} month={month} /> : <ChartCard title="Spending pace" loading><span /></ChartCard>;
}

function DayByDayView() {
  const now = new Date();
  const from = isoDate(subDays(now, 59));
  const to = isoDate(now);
  const q = useBreakdown({ by: 'none', bucket: 'day', from, to });
  const byDay = new Map((q.data?.rows ?? []).map((r) => [r.bucket, r.totalMinor]));
  const data = Array.from({ length: 60 }, (_, i) => {
    const d = subDays(now, 59 - i);
    return { x: format(d, 'd MMM'), value: byDay.get(isoDate(d)) ?? 0 };
  });
  return (
    <ChartCard title="Day by day" hint="Spending on each of the last 60 days." loading={q.isLoading} error={q.error} empty={byDay.size === 0}>
      <Columns data={data} currency={q.data?.currency ?? 'USD'} height={208} />
    </ChartCard>
  );
}

const CategoriesOverTime = whenVisible(CategoriesOverTimeView);

const YearOnYear = whenVisible(YearOnYearView);

const IncomeSources = whenVisible(IncomeSourcesView);

const FixedVsEveryday = whenVisible(FixedVsEverydayView);

const ThisMonthPace = whenVisible(ThisMonthPaceView);

const DayByDay = whenVisible(DayByDayView);
