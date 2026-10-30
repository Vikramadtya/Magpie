import { TOOLTIP_STYLE } from '../../lib/chart';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../../lib/money';

/** A single-series bar chart of money values. */
export default function SimpleBars({ data, currency, label, color = 'var(--accent-blue)' }: { data: { label: string; value: number }[]; currency: string; label: string; color?: string }) {
  return (
    <div className="h-56" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis hide />
          <Tooltip formatter={(v) => [formatMoney(Number(v), currency), label]} contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
