import { eachDayOfInterval, format, getDate, getISODay, min, parseISO, startOfMonth, subMonths } from 'date-fns';
import { useMemo } from 'react';
import { useBreakdown, usePurchases, useSizes } from '../../hooks/useCharts';
import { isoDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { CalendarHeat, Columns, PurchaseDots } from './charts';
import { ChartCard, compact, whenVisible } from './kit';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PARTS = ['Days 1–7', 'Days 8–14', 'Days 15–21', 'Day 22 on'];

/** The days of the range that have already happened (the rest of this month cannot have spending yet). */
function elapsedDays(from: string, to: string) {
  const end = min([parseISO(to), new Date()]);
  const start = parseISO(from);
  return start > end ? [] : eachDayOfInterval({ start, end });
}

export default function HabitsTab({ from, to }: { from: string; to: string }) {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Weekdays from={from} to={to} />
        <PartOfMonth from={from} to={to} />
      </div>
      <Calendar />
      <div className="grid lg:grid-cols-2 gap-6">
        <Sizes from={from} to={to} />
        <Biggest from={from} to={to} />
      </div>
    </div>
  );
}

function WeekdaysView({ from, to }: { from: string; to: string }) {
  const q = useBreakdown({ by: 'weekday', from, to });
  const days = useMemo(() => elapsedDays(from, to), [from, to]);
  const totals = new Map((q.data?.rows ?? []).map((r) => [Number(r.key), r.totalMinor]));
  const data = WEEKDAYS.map((name, i) => {
    const n = days.filter((d) => getISODay(d) === i + 1).length;
    return { x: name, value: n > 0 ? Math.round((totals.get(i + 1) ?? 0) / n) : 0 };
  });
  return (
    <ChartCard title="Which days you spend most" hint="Average spent on each weekday in this period." loading={q.isLoading} error={q.error} empty={totals.size === 0} emptyText="No spending in this period.">
      <Columns data={data} currency={q.data?.currency ?? 'USD'} label="Average" />
    </ChartCard>
  );
}

function PartOfMonthView({ from, to }: { from: string; to: string }) {
  const q = useBreakdown({ by: 'daypart', from, to });
  const days = useMemo(() => elapsedDays(from, to), [from, to]);
  const totals = new Map((q.data?.rows ?? []).map((r) => [Number(r.key), r.totalMinor]));
  const data = PARTS.map((name, i) => {
    const n = days.filter((d) => Math.min(Math.floor((getDate(d) - 1) / 7), 3) === i).length;
    return { x: name, value: n > 0 ? Math.round((totals.get(i) ?? 0) / n) : 0 };
  });
  return (
    <ChartCard title="Through the month" hint="Average spent per day in each part of the month, for example around payday." loading={q.isLoading} error={q.error} empty={totals.size === 0} emptyText="No spending in this period.">
      <Columns data={data} currency={q.data?.currency ?? 'USD'} color="#F2A33A" label="Average per day" />
    </ChartCard>
  );
}

function CalendarView() {
  const now = new Date();
  const from = isoDate(startOfMonth(subMonths(now, 5)));
  const to = isoDate(now);
  const q = useBreakdown({ by: 'none', bucket: 'day', from, to });
  const days = useMemo(() => new Map((q.data?.rows ?? []).map((r) => [r.bucket, r.totalMinor])), [q.data]);
  return (
    <ChartCard title="Spending calendar" hint="Every day of the last six months, darker for bigger spending days." loading={q.isLoading} error={q.error} empty={days.size === 0} emptyText="No spending in the last six months.">
      <CalendarHeat from={from} to={to} days={days} currency={q.data?.currency ?? 'USD'} />
    </ChartCard>
  );
}

function SizesView({ from, to }: { from: string; to: string }) {
  const q = useSizes(from, to);
  const currency = q.data?.currency ?? 'USD';
  const data = (q.data?.buckets ?? []).map((b) => ({
    x: b.fromMinor === null ? `under ${compact(b.toMinor ?? 0, currency)}` : b.toMinor === null ? `${compact(b.fromMinor, currency)}+` : `${compact(b.fromMinor, currency)}–${compact(b.toMinor, currency)}`,
    value: b.count,
  }));
  return (
    <ChartCard title="How big your purchases are" hint={q.data ? `${q.data.total} purchases sorted by size: many small ones, a few large ones?` : 'Purchases sorted by size.'} loading={q.isLoading} error={q.error} empty={(q.data?.total ?? 0) === 0} emptyText="No spending in this period.">
      <Columns data={data} currency={currency} color="#A06CF2" label="Purchases" format={(v) => String(Math.round(v))} />
    </ChartCard>
  );
}

function BiggestView({ from, to }: { from: string; to: string }) {
  const q = usePurchases(from, to);
  const items = q.data?.items ?? [];
  const top = items[0];
  return (
    <ChartCard title="Biggest purchases over time" hint={top ? `Each dot is one purchase. The largest: ${top.title}, ${formatMoney(top.amountMinor, (q.data?.currency ?? "USD"))} on ${format(parseISO(top.date), 'd MMM')}.` : 'Each dot is one purchase.'} loading={q.isLoading} error={q.error} empty={items.length === 0} emptyText="No spending in this period.">
      <PurchaseDots items={items} currency={q.data?.currency ?? 'USD'} />
    </ChartCard>
  );
}

const Weekdays = whenVisible(WeekdaysView);

const PartOfMonth = whenVisible(PartOfMonthView);

const Calendar = whenVisible(CalendarView);

const Sizes = whenVisible(SizesView);

const Biggest = whenVisible(BiggestView);
