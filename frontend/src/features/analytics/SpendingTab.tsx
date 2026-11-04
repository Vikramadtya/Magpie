import { eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Segmented } from '../../components/ui/Segmented';
import { Select } from '../../components/ui/Select';
import { useBreakdown, useSpendTree } from '../../hooks/useCharts';
import { useCategories } from '../../hooks/useReference';
import { useTrips } from '../../hooks/useTrips';
import { isoDate } from '../../lib/dates';
import { paletteColor } from '../../lib/palette';
import { Columns, Donut, RankedBars, SpendTreemap, type TreeNode } from './charts';
import { ChartCard, OTHER_COLOR } from './kit';
import type { BreakdownBy } from '../../api/types';

interface Range { from: string; to: string }

export default function SpendingTab({ from, to }: Range) {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <CategoryChart from={from} to={to} />
        <SubCategoryChart from={from} to={to} />
      </div>
      <TreemapChart from={from} to={to} />
      <div className="grid lg:grid-cols-2 gap-6">
        <PayeeChart from={from} to={to} />
        <PayeeOverTime />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <GroupChart from={from} to={to} by="account" title="By account or card" hint="Which account or card the money left from." />
        <GroupChart from={from} to={to} by="tag" title="By tag" hint="A purchase with two tags is counted under each of them." emptyText="Tag some transactions to see them here." />
      </div>
      <TripChart from={from} to={to} />
      <div className="grid lg:grid-cols-2 gap-6">
        <GroupChart from={from} to={to} by="person" title="Spent by other people" hint="What others spent from your accounts. It is not in your own totals." emptyText="Nobody else spent from your accounts in this period." />
        <GroupChart from={from} to={to} by="currency" title="By currency" hint="What each purchase was paid in, shown in your main currency." donut />
      </div>
    </div>
  );
}

function GroupChart({ from, to, by, title, hint, emptyText, donut }: Range & { by: BreakdownBy; title: string; hint: string; emptyText?: string; donut?: boolean }) {
  const q = useBreakdown({ by, from, to });
  const rows = q.data?.rows ?? [];
  const items = rows.map((r) => ({ label: r.label, value: r.totalMinor, color: r.key === 'other' ? OTHER_COLOR : r.color }));
  return (
    <ChartCard title={title} hint={hint} loading={q.isLoading} error={q.error} empty={rows.length === 0} emptyText={emptyText}>
      {donut ? <Donut items={items} currency={(q.data?.currency ?? 'USD')} /> : <RankedBars items={items} currency={(q.data?.currency ?? 'USD')} />}
    </ChartCard>
  );
}

function CategoryChart({ from, to }: Range) {
  const [view, setView] = useState<'bars' | 'share'>('bars');
  const q = useBreakdown({ by: 'category', from, to, limit: 10 });
  const rows = q.data?.rows ?? [];
  const items = rows.map((r) => ({ label: r.label, value: r.totalMinor, color: r.key === 'other' ? OTHER_COLOR : r.color }));
  return (
    <ChartCard
      title="Spending by category"
      hint="Each category with its sub-categories added in."
      loading={q.isLoading}
      error={q.error}
      empty={rows.length === 0}
      emptyText="No spending in this period."
      actions={<Segmented value={view} onChange={setView} options={[['bars', 'Bars'], ['share', 'Share']]} />}
    >
      {view === 'bars' ? <RankedBars items={items} currency={(q.data?.currency ?? 'USD')} /> : <Donut items={items} currency={(q.data?.currency ?? 'USD')} />}
    </ChartCard>
  );
}

function SubCategoryChart({ from, to }: Range) {
  const categories = useCategories().data ?? [];
  const tops = useBreakdown({ by: 'category', from, to, limit: 0 });
  const withSubs = (tops.data?.rows ?? []).filter((r) => r.key && categories.some((c) => c.parentId === r.key));
  const [chosen, setChosen] = useState('');
  const parent = withSubs.some((r) => r.key === chosen) ? chosen : withSubs[0]?.key ?? '';
  const q = useBreakdown({ by: 'subcategory', from, to, categoryId: parent, limit: 12 }, !!parent);
  const items = (q.data?.rows ?? []).map((r) => ({ label: r.key === parent ? `${r.label} (general)` : r.label, value: r.totalMinor, color: r.color }));
  return (
    <ChartCard
      title="Inside one category"
      hint="The sub-categories of the category you pick."
      loading={tops.isLoading || (!!parent && q.isLoading)}
      error={tops.error ?? q.error}
      empty={withSubs.length === 0}
      emptyText="Add sub-categories (for example Food, then Groceries) to see them here."
      actions={<Select className="w-40" value={parent} onChange={(e) => setChosen(e.target.value)} aria-label="Category">{withSubs.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</Select>}
    >
      <RankedBars items={items} currency={q.data?.currency ?? 'USD'} />
    </ChartCard>
  );
}

function TreemapChart({ from, to }: Range) {
  const q = useSpendTree(from, to);
  const data = useMemo<TreeNode[]>(() => {
    const cats = new Map<string, Map<string, Map<string, number>>>();
    (q.data?.leaves ?? []).forEach((l) => {
      const subs = cats.get(l.category) ?? new Map<string, Map<string, number>>();
      const payees = subs.get(l.subcategory ?? 'General') ?? new Map<string, number>();
      payees.set(l.payee ?? 'No payee', (payees.get(l.payee ?? 'No payee') ?? 0) + l.totalMinor);
      subs.set(l.subcategory ?? 'General', payees);
      cats.set(l.category, subs);
    });
    return [...cats.entries()].map(([cat, subs], i) => {
      const fill = paletteColor(i);
      return {
        name: cat, label: cat, fill,
        children: [...subs.entries()].map(([sub, payees]) => ({
          name: `${cat} › ${sub}`, label: sub, fill,
          children: [...payees.entries()].map(([payee, size]) => ({ name: `${cat} › ${sub} › ${payee}`, label: payee, fill, size })),
        })),
      };
    });
  }, [q.data]);
  return (
    <ChartCard title="Everything at a glance" hint="Bigger rectangles are bigger spending: category, then sub-category, then who it was paid to. Hover for details." loading={q.isLoading} error={q.error} empty={data.length === 0} emptyText="No spending in this period.">
      <SpendTreemap data={data} currency={q.data?.currency ?? 'USD'} />
    </ChartCard>
  );
}

function PayeeChart({ from, to }: Range) {
  const q = useBreakdown({ by: 'payee', from, to, limit: 10 });
  const rows = q.data?.rows ?? [];
  return (
    <ChartCard title="Top payees" hint="Who you paid the most in this period." loading={q.isLoading} error={q.error} empty={rows.length === 0} emptyText="Add a payee when you record spending to see it here.">
      <RankedBars items={rows.map((r) => ({ label: r.label, value: r.totalMinor, color: r.key === 'other' ? OTHER_COLOR : undefined }))} currency={(q.data?.currency ?? 'USD')} />
    </ChartCard>
  );
}

function PayeeOverTime() {
  const now = new Date();
  const from = isoDate(startOfMonth(subMonths(now, 11)));
  const to = isoDate(endOfMonth(now));
  const top = useBreakdown({ by: 'payee', from, to, limit: 0 });
  const payees = (top.data?.rows ?? []).filter((r) => r.key).slice(0, 30);
  const [chosen, setChosen] = useState('');
  const payeeId = payees.some((p) => p.key === chosen) ? chosen : payees[0]?.key ?? '';
  const q = useBreakdown({ by: 'none', bucket: 'month', from, to, payeeId }, !!payeeId);
  const months = useMemo(() => {
    const out: string[] = [];
    for (let i = 11; i >= 0; i--) out.push(format(subMonths(now, i), 'yyyy-MM'));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);
  const byMonth = new Map((q.data?.rows ?? []).map((r) => [r.bucket, r.totalMinor]));
  return (
    <ChartCard
      title="One payee, month by month"
      hint="What you paid the payee you pick, over the last 12 months."
      loading={top.isLoading || (!!payeeId && q.isLoading)}
      error={top.error ?? q.error}
      empty={payees.length === 0}
      emptyText="Add a payee when you record spending to see it here."
      actions={<Select className="w-40" value={payeeId} onChange={(e) => setChosen(e.target.value)} aria-label="Payee">{payees.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>}
    >
      <Columns data={months.map((m) => ({ x: format(parseISO(`${m}-01`), 'MMM'), value: byMonth.get(m) ?? 0 }))} currency={q.data?.currency ?? 'USD'} label="Paid" />
    </ChartCard>
  );
}

function TripChart({ from, to }: Range) {
  const trips = useTrips().data ?? [];
  const byTrip = useBreakdown({ by: 'trip', from, to });
  const [chosen, setChosen] = useState('');
  const trip = trips.find((t) => t.id === chosen) ?? trips.find((t) => (byTrip.data?.rows ?? []).some((r) => r.key === t.id));
  const inside = useBreakdown({ by: 'category', from: trip?.startDate ?? from, to: trip?.endDate ?? to, tripId: trip?.id, limit: 8 }, !!trip);
  const rows = byTrip.data?.rows ?? [];
  const days = trip ? eachDayOfInterval({ start: parseISO(trip.startDate), end: parseISO(trip.endDate) }).length : 0;
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <ChartCard title="Spending by trip" hint="Trips that had spending in this period." loading={byTrip.isLoading} error={byTrip.error} empty={rows.length === 0} emptyText="Assign transactions to a trip to see it here.">
        <RankedBars items={rows.map((r) => ({ label: r.label, value: r.totalMinor }))} currency={(byTrip.data?.currency ?? 'USD')} />
        <p className="text-xs text-secondary mt-2">Open a trip on the <Link to="/trips" className="text-accent">Trips</Link> page for its budget and daily detail.</p>
      </ChartCard>
      <ChartCard
        title="A trip by category"
        hint={trip ? `${trip.name}: ${days} days.` : 'Pick a trip.'}
        loading={inside.isLoading && !!trip}
        error={inside.error}
        empty={!trip || (inside.data?.rows ?? []).length === 0}
        emptyText="No trip spending to show."
        actions={trips.length > 0 ? <Select className="w-40" value={trip?.id ?? ''} onChange={(e) => setChosen(e.target.value)} aria-label="Trip">{trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select> : undefined}
      >
        <Donut items={(inside.data?.rows ?? []).map((r) => ({ label: r.label, value: r.totalMinor, color: r.key === 'other' ? OTHER_COLOR : r.color }))} currency={inside.data?.currency ?? 'USD'} />
      </ChartCard>
    </div>
  );
}
