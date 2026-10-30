import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../lib/money';

const COLORS = ['#0A84FF', '#FF9F0A', '#32D74B', '#BF5AF2', '#FF375F', '#64D2FF'];

/** One stacked bar per row (e.g. month); each key in `keys` is a series (e.g. a person). */
export default function StackedBars({ rows, keys, currency }: { rows: Record<string, string | number>[]; keys: string[]; currency: string }) {
  return (
    <div className="h-64" role="img" aria-label="Spending per member by month">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
          <Legend />
          {keys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
