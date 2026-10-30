import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NetWorthPoint } from '../../api/types';
import { formatMoney } from '../../lib/money';

export default function NetWorthChart({ points, currency }: { points: NetWorthPoint[]; currency: string }) {
  return (
    <div className="h-64" role="img" aria-label="Net worth over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ left: 8, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-color)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            formatter={(v) => [formatMoney(Number(v), currency), 'Net worth']}
            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="netWorthMinor" stroke="var(--accent-blue)" strokeWidth={2} fill="url(#nw)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
