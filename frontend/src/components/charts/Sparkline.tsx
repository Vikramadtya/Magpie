import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

/** A tiny trend line with no axes, for hero figures. */
export default function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div className="h-16 -mx-1" role="img" aria-label="Trend">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A5B4FF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#A5B4FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area type="monotone" dataKey="v" stroke="#C7D2FF" strokeWidth={2.25} fill="url(#spark)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
