import { format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../lib/money';
import { paletteColor } from '../../lib/palette';

/** Monthly spending split into the biggest categories. */
export default function StackedMonths({ months, categories, currency }: { months: { month: string; byCategory: Record<string, number> }[]; categories: string[]; currency: string }) {
  const data = months.map((m) => ({ month: format(parseISO(`${m.month}-01`), 'MMM'), ...m.byCategory }));
  return (
    <div className="h-64" role="img" aria-label="Monthly spending by category">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip
            formatter={(v, name) => [formatMoney(Number(v), currency), name]}
            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {categories.map((c, i) => <Bar key={c} dataKey={c} stackId="m" fill={c === 'Other' ? '#8E8E93' : paletteColor(i)} radius={i === categories.length - 1 ? [4, 4, 0, 0] : 0} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
