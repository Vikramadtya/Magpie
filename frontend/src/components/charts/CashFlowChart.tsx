import { format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthFlow } from '../../api/types';
import { formatMoney } from '../../lib/money';

export default function CashFlowChart({ months, currency }: { months: MonthFlow[]; currency: string }) {
  return (
    <div className="h-64" role="img" aria-label="Income and spending per month">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={months} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="month" tickFormatter={(m: string) => format(parseISO(`${m}-01`), 'MMM yy')} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis hide />
          <Tooltip
            formatter={(v, name) => [formatMoney(Number(v), currency), name]}
            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }}
          />
          <Legend />
          <Bar dataKey="incomeMinor" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenseMinor" name="Spending" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
