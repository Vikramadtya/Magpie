import { useId } from 'react';

/**
 * A small hand-drawn line chart in plain SVG: no chart library, so it costs almost nothing to load.
 * Values are plotted evenly; `tone` follows the accent unless a colour is given.
 */
export function Sparkline({ values, compare, label, color = 'var(--accent-blue)', height = 64, className }: { values: number[]; compare?: number[]; label: string; color?: string; height?: number; className?: string }) {
  const gradient = useId();
  if (values.length < 2) return <div style={{ height }} className={className} />;
  const width = 300;
  const all = compare ? [...values, ...compare] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 4;
  const longest = Math.max(values.length, compare?.length ?? 0);
  const place = (xs: number[]) => xs.map((v, i) => [pad + (i / (longest - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const points = place(values);
  const other = compare && compare.length > 1 ? place(compare).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') : null;
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;
  const [lx, ly] = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label} className={className} style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {other && <path d={other} fill="none" stroke="var(--text-secondary)" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      <path d={area} fill={`url(#${gradient})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3.5" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
