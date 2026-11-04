import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useBreakdown, useLoanHistory } from '../../hooks/useCharts';
import { useHouseholds, useHouseholdSummary } from '../../hooks/useHousehold';
import { monthKey } from '../../lib/dates';
import { Donut, PairBars, StackedColumns, Trend } from './charts';
import { ChartCard, EXPENSE_COLOR, INCOME_COLOR, monthName, type Series } from './kit';
import { paletteColor } from '../../lib/palette';
import type { HouseholdSummary } from '../../api/types';

export default function PeopleTab({ from, to }: { from: string; to: string }) {
  const q = useLoanHistory(12);
  const currency = q.data?.currency ?? 'USD';
  const people = q.data?.people ?? [];
  const lent = people.filter((p) => p.lentMinor > 0);
  const borrowed = people.filter((p) => p.borrowedMinor > 0);
  const others = useBreakdown({ by: 'person', bucket: 'month', from, to });
  const otherRows = others.data?.rows ?? [];
  return (
    <div className="space-y-6">
      <ChartCard title="Money lent and borrowed" hint="What people owe you and what you owe them, at the end of each of the last 12 months." loading={q.isLoading} error={q.error} empty={(q.data?.history ?? []).every((m) => m.owedToMeMinor === 0 && m.iOweMinor === 0)} emptyText="Record a loan to see it here." actions={<Link to="/loans" className="text-sm text-accent">Loans</Link>}>
        <Trend
          mode="area"
          currency={currency}
          xFormat={monthName}
          series={[{ key: 'owed', label: 'Owed to you', color: INCOME_COLOR }, { key: 'owe', label: 'You owe', color: EXPENSE_COLOR }]}
          data={(q.data?.history ?? []).map((m) => ({ bucket: m.month, owed: m.owedToMeMinor, owe: m.iOweMinor }))}
        />
      </ChartCard>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Lent, and paid back" hint="For each person you lent to: the total, and how much has come back." loading={q.isLoading} error={q.error} empty={lent.length === 0} emptyText="You have not lent anything.">
          <PairBars data={lent.map((p) => ({ label: p.person, a: p.lentMinor, b: p.lentRepaidMinor }))} currency={currency} a={{ name: 'Lent', color: '#8B8F9C' }} b={{ name: 'Paid back', color: INCOME_COLOR }} />
        </ChartCard>
        <ChartCard title="Borrowed, and repaid" hint="For each person you borrowed from: the total, and how much you have repaid." loading={q.isLoading} error={q.error} empty={borrowed.length === 0} emptyText="You have not borrowed anything.">
          <PairBars data={borrowed.map((p) => ({ label: p.person, a: p.borrowedMinor, b: p.borrowedRepaidMinor }))} currency={currency} a={{ name: 'Borrowed', color: '#8B8F9C' }} b={{ name: 'Repaid', color: INCOME_COLOR }} />
        </ChartCard>
      </div>
      <ChartCard title="What others spent from your accounts" hint="By person, in this period. It is not in your own totals." loading={others.isLoading} error={others.error} empty={otherRows.length === 0} emptyText="Nobody else spent from your accounts in this period.">
        <Donut items={sumByLabel(otherRows)} currency={others.data?.currency ?? 'USD'} />
      </ChartCard>
      <HouseholdShare />
    </div>
  );
}

function sumByLabel(rows: { label: string; totalMinor: number }[]) {
  const totals = new Map<string, number>();
  rows.forEach((r) => totals.set(r.label, (totals.get(r.label) ?? 0) + r.totalMinor));
  return [...totals.entries()].map(([label, value]) => ({ label, value }));
}

/** Who in your household spent what this month. Appears only when you are in a household. */
export function HouseholdShare() {
  const list = useHouseholds();
  const household = (list.data ?? []).find((h) => h.myStatus === 'ACTIVE');
  const q = useHouseholdSummary(household?.id ?? '', monthKey(new Date()));
  if (!household) {
    return <ChartCard title="Household spending" hint="Who in your household spends what." loading={list.isLoading} empty emptyText="Join or create a household to compare spending."><span /></ChartCard>;
  }
  return <HouseholdCharts name={household.name} summary={q.data} loading={q.isLoading} error={q.error} />;
}

/** Each member's share of the month, and the biggest categories split by member. */
export function HouseholdCharts({ name, summary: s, loading, error }: { name: string; summary: HouseholdSummary | undefined; loading?: boolean; error?: unknown }) {
  const members = s?.byMember ?? [];
  const series: Series[] = members.map((m, i) => ({ key: m.memberId, label: m.name, color: paletteColor(i) }));
  const cats = (s?.categories ?? []).slice(0, 8).map((c) => ({ bucket: c.name, ...Object.fromEntries(members.map((m) => [m.memberId, c.byMember.find((x) => x.memberId === m.memberId)?.amountMinor ?? 0])) }));
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <ChartCard title={`${name}: who spent what`} hint={s ? `Each member's share of ${format(parseISO(`${s.month}-01`), 'MMMM')}.` : undefined} loading={loading} error={error} empty={members.length === 0 || s?.spentMinor === 0} emptyText="No shared spending this month.">
        <Donut items={members.map((m, i) => ({ label: m.name, value: m.amountMinor, color: paletteColor(i) }))} currency={s?.currency ?? 'USD'} />
      </ChartCard>
      <ChartCard title="Categories by member" hint="The biggest shared categories, split by who spent." loading={loading} error={error} empty={cats.length === 0} emptyText="No shared spending this month.">
        <StackedColumns data={cats} series={series} currency={s?.currency ?? 'USD'} xFormat={(v) => v} />
      </ChartCard>
    </div>
  );
}
