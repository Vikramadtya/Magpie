import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GoalProgress } from '../../api/types';
import { Select } from '../../components/ui/Select';
import { useBudgetHistory, useGoalProgress } from '../../hooks/useCharts';
import { formatMoney } from '../../lib/money';
import { BudgetHeat, GoalLine, PairBars, PairColumns } from './charts';
import { ChartCard, EXPENSE_COLOR, INCOME_COLOR, monthName } from './kit';

export default function BudgetsTab() {
  const [months, setMonths] = useState(6);
  const q = useBudgetHistory(months);
  const history = useMemo(() => q.data ?? [], [q.data]);
  const current = history[history.length - 1];
  const currency = current?.currency ?? 'USD';
  const anyBudget = history.some((m) => m.lines.length > 0);

  const heat = useMemo(() => {
    const names = new Map<string, string>();
    history.forEach((m) => m.lines.forEach((l) => names.set(l.categoryId, l.categoryName)));
    return [...names.entries()].map(([id, name]) => ({
      name,
      cells: history.map((m) => {
        const line = m.lines.find((l) => l.categoryId === id);
        const total = line ? line.amountMinor + line.rolloverMinor : 0;
        return line && total > 0 ? line.spentMinor / total : null;
      }),
    }));
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select className="w-44" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="How far back">
          {[3, 6, 12].map((n) => <option key={n} value={n}>Last {n} months</option>)}
        </Select>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard
          title="This month: planned and spent"
          hint="Each budget against what is spent so far. Red means it is used up."
          loading={q.isLoading}
          error={q.error}
          empty={!current || current.lines.length === 0}
          emptyText="No budgets this month."
          actions={<Link to="/budgets" className="text-sm text-accent">Manage</Link>}
        >
          <PairBars
            data={(current?.lines ?? []).map((l) => ({ label: l.categoryName, a: l.amountMinor + l.rolloverMinor, b: l.spentMinor }))}
            currency={currency}
            a={{ name: 'Budget', color: '#8B8F9C' }}
            b={{ name: 'Spent', color: 'var(--accent-blue)' }}
            redWhenOver
          />
        </ChartCard>
        <ChartCard title="Budgets over the months" hint="All your budgets added together against what you spent in those categories." loading={q.isLoading} error={q.error} empty={!anyBudget} emptyText="Set budgets to see how you do against them.">
          <PairColumns data={history.map((m) => ({ x: monthName(m.month), a: m.budgetedMinor, b: m.spentMinor }))} currency={currency} a={{ name: 'Budgeted', color: INCOME_COLOR }} b={{ name: 'Spent', color: EXPENSE_COLOR }} />
        </ChartCard>
      </div>
      <ChartCard title="Where you go over budget" hint="Share of each budget used, month by month." loading={q.isLoading} error={q.error} empty={heat.length === 0} emptyText="Set budgets to see how you do against them.">
        <BudgetHeat months={history.map((m) => m.month)} rows={heat} />
      </ChartCard>
      <Goals />
    </div>
  );
}

/** Average saved per day over the last 90 days (or since the first contribution, if that is more recent). */
function paceFor(g: GoalProgress, today: Date): number {
  if (g.points.length === 0) return 0;
  const first = parseISO(g.points[0].date);
  const windowStart = addDays(today, -90);
  const start = first > windowStart ? first : windowStart;
  const before = [...g.points].reverse().find((p) => parseISO(p.date) < start)?.cumulativeMinor ?? 0;
  const days = Math.max(30, differenceInCalendarDays(today, start));
  return (g.savedMinor - before) / days;
}

function Goals() {
  const q = useGoalProgress();
  const goals = q.data ?? [];
  return (
    <ChartCard title="Goal progress" hint="What you have saved towards each goal, and when you would reach it at your recent pace." loading={q.isLoading} error={q.error} empty={goals.length === 0} emptyText="Create a goal to track it here." actions={<Link to="/goals" className="text-sm text-accent">Goals</Link>}>
      <div className="grid lg:grid-cols-2 gap-6">
        {goals.map((g) => <GoalCard key={g.id} g={g} />)}
      </div>
    </ChartCard>
  );
}

function GoalCard({ g }: { g: GoalProgress }) {
  const today = new Date();
  const pace = paceFor(g, today);
  const remaining = g.targetMinor - g.savedMinor;
  const daysToGo = pace > 0 && remaining > 0 ? Math.ceil(remaining / pace) : null;
  const finish = daysToGo !== null && daysToGo < 365 * 5 ? addDays(today, daysToGo) : null;
  const data = useMemo(() => {
    const rows: { t: number; saved?: number; projected?: number }[] = g.points.map((p) => ({ t: parseISO(p.date).getTime(), saved: p.cumulativeMinor }));
    rows.push({ t: today.getTime(), saved: g.savedMinor, projected: g.savedMinor });
    if (finish) rows.push({ t: finish.getTime(), projected: g.targetMinor });
    return rows.sort((a, b) => a.t - b.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, finish?.getTime()]);
  const done = remaining <= 0;
  return (
    <div className="min-w-0">
      <div className="flex justify-between gap-3 text-sm mb-1">
        <span className="font-medium truncate">{g.name}</span>
        <span className="tabular-nums text-secondary shrink-0">{formatMoney(g.savedMinor, g.currency)} of {formatMoney(g.targetMinor, g.currency)}</span>
      </div>
      <p className="text-xs text-secondary mb-2">
        {done ? 'Goal reached.' : finish ? `At your recent pace you would reach it around ${format(finish, 'MMM yyyy')}${g.targetDate ? ` (your target date is ${format(parseISO(g.targetDate), 'MMM yyyy')})` : ''}.` : 'Add to this goal regularly to see when you would reach it.'}
      </p>
      <GoalLine data={data} target={g.targetMinor} currency={g.currency} />
    </div>
  );
}
