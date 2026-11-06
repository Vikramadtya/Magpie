import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Segmented } from '../../components/ui/Segmented';
import { Select } from '../../components/ui/Select';
import { useInvestmentHistory, useWealth } from '../../hooks/useCharts';
import { assetKind } from '../../lib/assetKinds';
import { paletteColor } from '../../lib/palette';
import { Donut, PurchaseDots, RankedBars, Trend } from './charts';
import { ChartCard, EXPENSE_COLOR, INCOME_COLOR, monthName, type Series, whenVisible } from './kit';

const DEBT_TYPES = new Set(['CREDIT_CARD', 'LOAN']);
const GROUPS: { key: string; label: string; types: string[]; color: string }[] = [
  { key: 'bank', label: 'Bank accounts', types: ['CHECKING'], color: '#5B6CF2' },
  { key: 'savings', label: 'Savings', types: ['SAVINGS'], color: '#2FB67C' },
  { key: 'cash', label: 'Cash', types: ['CASH'], color: '#F2A33A' },
  { key: 'other', label: 'Other accounts', types: [], color: '#8B8F9C' },
];

export default function WealthTab() {
  const [months, setMonths] = useState(12);
  const q = useWealth(months);
  const w = q.data;
  const currency = w?.currency ?? 'USD';

  const model = useMemo(() => {
    if (!w) return null;
    const n = w.months.length;
    const groups = GROUPS.map((g) => ({ ...g, values: Array<number>(n).fill(0) }));
    const debts = Array<number>(n).fill(0);
    w.accounts.forEach((a) =>
      a.values.forEach((v, i) => {
        if (v >= 0 && !DEBT_TYPES.has(a.type)) {
          const g = groups.find((x) => x.types.includes(a.type)) ?? groups[3];
          g.values[i] += v;
        } else debts[i] += v;
      }),
    );
    const assets = w.months.map((_, i) => groups.reduce((s, g) => s + g.values[i], 0) + w.investments[i] + w.ownAssets[i]);
    return { groups, debts, assets, net: assets.map((a, i) => a + debts[i]) };
  }, [w]);

  const composition = useMemo(() => {
    if (!w || !model) return { data: [] as Record<string, number | string>[], series: [] as Series[] };
    const series: Series[] = [
      ...model.groups.map((g) => ({ key: g.key, label: g.label, color: g.color })),
      { key: 'inv', label: 'Investments', color: '#A06CF2' },
      { key: 'own', label: 'Gold, property and other', color: '#D9B93A' },
    ];
    const data: Record<string, number | string>[] = w.months.map((m, i) => ({
      bucket: m,
      ...Object.fromEntries(model.groups.map((g) => [g.key, g.values[i]])),
      inv: w.investments[i],
      own: w.ownAssets[i],
    }));
    return { data, series: series.filter((s) => data.some((d) => Number(d[s.key]) > 0)) };
  }, [w, model]);

  const accountLines = useMemo(() => {
    if (!w) return { data: [] as Record<string, number | string>[], series: [] as Series[] };
    const top = [...w.accounts].sort((a, b) => Math.abs(b.values[b.values.length - 1] ?? 0) - Math.abs(a.values[a.values.length - 1] ?? 0)).slice(0, 8);
    return {
      series: top.map((a, i) => ({ key: a.id, label: a.name, color: paletteColor(i) })),
      data: w.months.map((m, i) => ({ bucket: m, ...Object.fromEntries(top.map((a) => [a.id, a.values[i]])) })),
    };
  }, [w]);

  const debtLines = useMemo(() => {
    if (!w) return { data: [] as Record<string, number | string>[], series: [] as Series[] };
    const owed = w.accounts.filter((a) => DEBT_TYPES.has(a.type) || a.values.some((v) => v < 0));
    return {
      series: owed.map((a, i) => ({ key: a.id, label: a.name, color: paletteColor(i + 4) })),
      data: w.months.map((m, i) => ({ bucket: m, ...Object.fromEntries(owed.map((a) => [a.id, Math.max(0, -a.values[i])])) })),
    };
  }, [w]);

  const empty = !w || w.accounts.length === 0;
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select className="w-44" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="How far back">
          {[6, 12, 24].map((n) => <option key={n} value={n}>Last {n} months</option>)}
        </Select>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Net worth" hint="Everything you have, minus what you owe, at the end of each month. Past months count investments at what you paid." loading={q.isLoading} error={q.error} empty={empty} emptyText="Add an account to see your net worth.">
          {model && w && <Trend data={w.months.map((m, i) => ({ bucket: m, net: model.net[i] }))} currency={currency} xFormat={monthName} mode="area" series={[{ key: 'net', label: 'Net worth', color: 'var(--accent-blue)' }]} />}
        </ChartCard>
        <ChartCard title="What you have and what you owe" hint="Total assets against total debts, month by month." loading={q.isLoading} error={q.error} empty={empty}>
          {model && w && <Trend data={w.months.map((m, i) => ({ bucket: m, assets: model.assets[i], debts: Math.abs(Math.min(0, model.debts[i])) }))} currency={currency} xFormat={monthName} series={[{ key: 'assets', label: 'Assets', color: INCOME_COLOR }, { key: 'debts', label: 'Debts', color: EXPENSE_COLOR }]} />}
        </ChartCard>
      </div>
      <ChartCard title="What your wealth is made of" hint="Each kind of asset stacked, so you can see which part is growing." loading={q.isLoading} error={q.error} empty={empty || composition.series.length === 0}>
        <Trend data={composition.data} series={composition.series} currency={currency} xFormat={monthName} mode="stack" height={288} />
      </ChartCard>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Balance of each account" hint="Your biggest accounts, month by month." loading={q.isLoading} error={q.error} empty={empty}>
          <Trend data={accountLines.data} series={accountLines.series} currency={currency} xFormat={monthName} />
        </ChartCard>
        <ChartCard title="Debt over time" hint="What you owe on each card or loan. Falling is good." loading={q.isLoading} error={q.error} empty={empty || debtLines.series.length === 0} emptyText="You have no cards or loans with a balance owed.">
          <Trend data={debtLines.data} series={debtLines.series} currency={currency} xFormat={monthName} mode="stack" />
        </ChartCard>
      </div>
      <Investments />
    </div>
  );
}

const dayName = (d: string) => format(parseISO(d), 'd MMM yy');

function InvestmentsView() {
  const q = useInvestmentHistory();
  const d = q.data;
  const currency = d?.currency ?? 'USD';
  const [by, setBy] = useState<'holding' | 'type'>('holding');

  const growth = useMemo(() => {
    if (!d) return [];
    const dates = [...new Set([...d.invested.map((p) => p.date), ...d.value.map((p) => p.date), new Date().toISOString().slice(0, 10)])].sort();
    let inv = 0;
    let val: number | undefined;
    return dates.map((date) => {
      d.invested.filter((p) => p.date === date).forEach((p) => (inv = p.minor));
      d.value.filter((p) => p.date === date).forEach((p) => (val = p.minor));
      return { bucket: date, invested: inv, value: val };
    });
  }, [d]);

  const market = (d?.holdings ?? []).filter((h) => !assetKind(h.assetType));
  const allocation = useMemo(() => {
    const all = (d?.holdings ?? []).filter((h) => h.valueMinor > 0);
    if (by === 'holding') return all.map((h) => ({ label: h.name, value: h.valueMinor }));
    const types = new Map<string, number>();
    all.forEach((h) => { const k = assetKind(h.assetType)?.label ?? 'Stocks and funds'; types.set(k, (types.get(k) ?? 0) + h.valueMinor); });
    return [...types.entries()].map(([label, value]) => ({ label, value }));
  }, [d, by]);

  const gains = (d?.holdings ?? []).filter((h) => h.costMinor > 0).map((h) => ({ label: h.name, value: h.valueMinor - h.costMinor, color: h.valueMinor >= h.costMinor ? INCOME_COLOR : EXPENSE_COLOR })).sort((a, b) => b.value - a.value);

  const own = useMemo(() => {
    const rows = d?.ownValues ?? [];
    const names = [...new Map(rows.map((r) => [r.holdingId, r.name])).entries()];
    const dates = [...new Set(rows.map((r) => r.asOf))].sort();
    const last = new Map<string, number>();
    const data = dates.map((date) => {
      rows.filter((r) => r.asOf === date).forEach((r) => last.set(r.holdingId, r.valueMinor));
      return { bucket: date, ...Object.fromEntries(names.map(([id]) => [id, last.get(id)])) };
    });
    return { data, series: names.map(([id, name], i) => ({ key: id, label: name, color: paletteColor(i) })) };
  }, [d]);

  const noMarket = market.length === 0;
  return (
    <>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Investments: paid in and worth now" hint="The total you put in against the value of your stocks and funds. Value history starts the day price tracking was added." loading={q.isLoading} error={q.error} empty={noMarket} emptyText="Add a stock or fund to see it here." actions={<Link to="/investments" className="text-sm text-accent">Investments</Link>}>
          <Trend data={growth} currency={currency} xFormat={dayName} dots series={[{ key: 'invested', label: 'Paid in', color: '#8B8F9C' }, { key: 'value', label: 'Worth', color: 'var(--accent-blue)' }]} />
        </ChartCard>
        <ChartCard title="Gain or loss per holding" hint="Today's value minus what you paid." loading={q.isLoading} error={q.error} empty={gains.length === 0} emptyText="Add a holding with its purchase cost to see this.">
          <RankedBars items={gains} currency={currency} label="Gain or loss" />
        </ChartCard>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="What you own"
          hint="Share of your total holdings by value."
          loading={q.isLoading}
          error={q.error}
          empty={allocation.length === 0}
          emptyText="Add a holding to see its share."
          actions={<Segmented value={by} onChange={setBy} options={[['holding', 'Holding'], ['type', 'Type']]} />}
        >
          <Donut items={allocation} currency={currency} />
        </ChartCard>
        <ChartCard title="Every purchase on a timeline" hint="Each dot is one buy: when, and how much you paid." loading={q.isLoading} error={q.error} empty={(d?.lots ?? []).length === 0} emptyText="Record purchases on a holding to see them here.">
          <PurchaseDots items={(d?.lots ?? []).map((l, i) => ({ id: `${l.holdingId}-${i}`, date: l.boughtOn, title: l.name, category: null, amountMinor: l.costMinor }))} currency={currency} />
        </ChartCard>
      </div>
      <ChartCard title="Gold, land and other assets" hint="The value you have set for each. History is kept from when you first saved a value, so it grows over time." loading={q.isLoading} error={q.error} empty={own.series.length === 0} emptyText="Add gold, land or another asset on the Assets page." actions={<Link to="/assets" className="text-sm text-accent">Assets</Link>}>
        <Trend data={own.data} series={own.series} currency={currency} xFormat={dayName} dots />
      </ChartCard>
    </>
  );
}

const Investments = whenVisible(InvestmentsView);
