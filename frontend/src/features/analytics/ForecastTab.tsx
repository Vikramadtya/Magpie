import { FxWarning } from '../../components/FxWarning';
import { Segmented } from '../../components/ui/Segmented';
import { StateView } from '../../components/ui/StateView';
import { useDashboard } from '../../hooks/useInsights';
import { useForecast } from '../../hooks/useExtras';
import { cn } from '../../lib/cn';
import { monthKey, monthLabel, shortDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { addMonths, format, parseISO } from 'date-fns';
import { useState } from 'react';
import { BandChart, RangeBars } from './charts';
import { ChartCard } from './kit';

export default function ForecastTab() {
  const forecast = useForecast();
  const f = forecast.data;
  const noData = !!f && f.monthsOfHistory === 0 && f.fixedExpenses.length === 0 && f.fixedIncome.length === 0;

  return (
    <StateView
      isLoading={forecast.isLoading}
      error={forecast.error}
      onRetry={() => void forecast.refetch()}
      isEmpty={noData}
      emptyTitle="Not enough data to forecast yet"
      emptyHint="Add a few months of transactions, or set up recurring bills and income, and a forecast appears here."
    >
      {f && (
        <div className="space-y-6">
          <FxWarning currencies={f.missingCurrencies} base={f.currency} />
          <p className="text-sm text-secondary">
            A rough guess for <strong>{monthLabel(f.month)}</strong>, from your recurring items{f.monthsOfHistory > 0 ? ` and ${f.monthsOfHistory} month${f.monthsOfHistory === 1 ? '' : 's'} of history` : ''}.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <Card label="Likely to earn" value={f.income.totalMinor} currency={f.currency} sub={`${formatMoney(f.income.fixedMinor, f.currency)} regular, ${formatMoney(f.income.variableMinor, f.currency)} other`} tone="up" />
            <Card label="Likely to spend" value={f.expense.totalMinor} currency={f.currency} sub={`${formatMoney(f.expense.fixedMinor, f.currency)} bills, ${formatMoney(f.expense.variableMinor, f.currency)} everyday`} tone="down" />
            <Card label="Likely left over" value={f.netMinor} currency={f.currency} sub={f.netMinor >= 0 ? 'Earned minus spent' : 'You may spend more than you earn'} tone={f.netMinor >= 0 ? 'up' : 'down'} />
          </div>

          {f.categories.length > 0 && (
            <ChartCard title="Everyday spending by category" hint="The expected amount for each category next month. The whisker is the range it will probably stay within.">
              <RangeBars currency={f.currency} items={f.categories.slice(0, 8).map((c) => ({ label: c.name, value: c.forecastMinor, low: c.lowMinor, high: c.highMinor, color: c.color }))} />
            </ChartCard>
          )}

          <NetWorthProjection f={f} />

          <div className="grid lg:grid-cols-2 gap-6">
            <FixedList title="Regular bills" items={f.fixedExpenses} currency={f.currency} empty="No recurring expenses next month." />
            <FixedList title="Regular income" items={f.fixedIncome} currency={f.currency} empty="No recurring income next month." />
          </div>
        </div>
      )}
    </StateView>
  );
}

function Card({ label, value, currency, sub, tone }: { label: string; value: number; currency: string; sub: string; tone: 'up' | 'down' }) {
  return (
    <div className="glass-panel p-4">
      <p className="text-xs text-secondary">{label}</p>
      <p className={cn('text-2xl font-bold mt-1 tabular-nums', tone === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>{formatMoney(value, currency)}</p>
      <p className="text-xs text-secondary mt-1">{sub}</p>
    </div>
  );
}

function FixedList({ title, items, currency, empty }: { title: string; items: { ruleId: string; name: string; amountMinor: number; date: string }[]; currency: string; empty: string }) {
  return (
    <section className="glass-panel p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-secondary">{empty}</p> : (
        <ul className="divide-y divide-border text-sm">
          {items.map((i) => (
            <li key={`${i.ruleId}-${i.date}`} className="py-2 flex justify-between"><span>{i.name} <span className="text-xs text-secondary">· {shortDate(i.date)}</span></span><span className="tabular-nums">{formatMoney(i.amountMinor, currency)}</span></li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Today's net worth carried forward as if every coming month looked like next month's forecast. */
function NetWorthProjection({ f }: { f: import('../../api/types').Forecast }) {
  const [months, setMonths] = useState(12);
  const now = useDashboard(monthKey(new Date())).data;
  const base = now?.netWorthMinor ?? 0;
  const start = parseISO(`${f.month}-01`);
  const low = f.income.lowMinor - f.expense.highMinor;
  const high = f.income.highMinor - f.expense.lowMinor;
  const data = [{ x: 'Now', mid: base, band: [base, base] as [number, number] }, ...Array.from({ length: months }, (_, i) => ({
    x: format(addMonths(start, i), 'MMM yy'),
    mid: base + f.netMinor * (i + 1),
    band: [base + low * (i + 1), base + high * (i + 1)] as [number, number],
  }))];
  return (
    <ChartCard
      title="Net worth ahead (an estimate)"
      hint={`Your net worth today, if every coming month looks like next month's forecast (${formatMoney(f.netMinor, f.currency)} left over). Real life will differ.`}
      loading={!now}
      actions={<Segmented value={String(months)} onChange={(v) => setMonths(Number(v))} options={[['6', '6 months'], ['12', '12 months']]} />}
    >
      <BandChart data={data} currency={f.currency} centreLabel="Expected" />
    </ChartCard>
  );
}
