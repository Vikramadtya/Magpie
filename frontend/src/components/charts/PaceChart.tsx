import { TOOLTIP_STYLE } from '../../lib/chart';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../lib/money';

const cumulative = (daily: number[], upTo: number) => {
  let sum = 0;
  return daily.map((v, i) => (i < upTo ? (sum += v) : null));
};

/** Running total of spending this month against last month, day by day. */
export default function PaceChart({ current, previous, currency, daysSoFar }: { current: number[]; previous: number[]; currency: string; daysSoFar: number }) {
  const now = cumulative(current, daysSoFar);
  const before = cumulative(previous, previous.length);
  const days = Math.max(current.length, previous.length);
  const data = Array.from({ length: days }, (_, i) => ({ day: i + 1, now: now[i] ?? null, before: before[i] ?? null }));
  return (
    <div className="h-56" role="img" aria-label="Spending so far this month compared with last month">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} interval={4} />
          <YAxis hide />
          <Tooltip
            formatter={(v, name) => [formatMoney(Number(v), currency), name === 'now' ? 'This month' : 'Last month']}
            labelFormatter={(d) => `Day ${d}`}
            contentStyle={TOOLTIP_STYLE}
          />
          <Line type="monotone" dataKey="before" stroke="var(--text-secondary)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="now" stroke="var(--accent-blue)" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
