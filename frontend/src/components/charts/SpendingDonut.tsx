import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySpend } from '../../api/types';
import { formatMoney } from '../../lib/money';

import { PALETTE as FALLBACK } from '../../lib/palette';

export default function SpendingDonut({ items, currency }: { items: CategorySpend[]; currency: string }) {
  return (
    <div className="h-64" role="img" aria-label="Spending by category">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={items} dataKey="totalMinor" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} stroke="none">
            {items.map((c, i) => <Cell key={c.categoryId} fill={c.color ?? FALLBACK[i % FALLBACK.length]} />)}
          </Pie>
          <Tooltip
            formatter={(v, name) => [formatMoney(Number(v), currency), name]}
            contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
