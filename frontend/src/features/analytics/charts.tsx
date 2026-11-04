import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { Fragment } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, ErrorBar, LabelList, Legend, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis,
} from 'recharts';
import { TOOLTIP_STYLE } from '../../lib/chart';
import { formatMoney } from '../../lib/money';
import { paletteColor } from '../../lib/palette';
import { compact, EXPENSE_COLOR, INCOME_COLOR, OTHER_COLOR, type Series } from './kit';

const AXIS = { fill: 'var(--text-secondary)', fontSize: 11 };
const GRID = 'var(--border-color)';
const shorten = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Horizontal bars, biggest first: the clearest way to compare named things. */
export function RankedBars({ items, currency, label = 'Spent' }: { items: { label: string; value: number; color?: string | null }[]; currency: string; label?: string }) {
  return (
    <div style={{ height: Math.max(120, items.length * 34 + 16) }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ left: 0, right: 76, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={104} tick={AXIS} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => shorten(v)} />
          <Tooltip cursor={{ fill: 'rgba(128,128,128,0.08)' }} formatter={(v) => [formatMoney(Number(v), currency), label]} contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
            {items.map((it, i) => <Cell key={`${it.label}-${i}`} fill={it.color ?? paletteColor(i)} />)}
            <LabelList dataKey="value" content={(p) => <BarValue x={p.x} y={p.y} width={p.width} height={p.height} value={p.value as number | string | undefined} currency={currency} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The amount just past the right end of a bar, so negative bars do not run into the names. */
function BarValue({ x, y, width, height, value, currency }: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: number | string; currency: string }) {
  const left = Number(x ?? 0);
  const right = left + Number(width ?? 0);
  return (
    <text x={Math.max(left, right) + 6} y={Number(y ?? 0) + Number(height ?? 0) / 2} dominantBaseline="central" fontSize={11} fill="var(--text-secondary)">
      {formatMoney(Number(value ?? 0), currency)}
    </text>
  );
}

/** A share-of-the-whole ring with its legend (name, amount and percent) underneath. */
export function Donut({ items, currency }: { items: { label: string; value: number; color?: string | null }[]; currency: string }) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div>
      <div className="h-52" role="img" aria-label="Share of the total">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="none">
              {items.map((it, i) => <Cell key={`${it.label}-${i}`} fill={it.color ?? paletteColor(i)} />)}
            </Pie>
            <Tooltip formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center justify-between gap-2 min-w-0">
            <span className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: it.color ?? paletteColor(i) }} /><span className="truncate">{it.label}</span></span>
            <span className="tabular-nums text-secondary shrink-0">{Math.round((it.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One bar per x. `format` turns a value into text (money by default). */
export function Columns({ data, currency, color = 'var(--accent-blue)', label = 'Spent', format: fmt, height = 224, ticks = true }: {
  data: { x: string; value: number }[]; currency: string; color?: string; label?: string; format?: (v: number) => string; height?: number; ticks?: boolean;
}) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis width={ticks ? 44 : 0} hide={!ticks} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => (fmt ? String(v) : compact(Number(v), currency))} />
          <Tooltip cursor={{ fill: 'rgba(128,128,128,0.08)' }} formatter={(v) => [fmt ? fmt(Number(v)) : formatMoney(Number(v), currency), label]} contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Columns that stack several groups on top of each other. */
export function StackedColumns({ data, series, currency, xFormat, height = 256 }: { data: Record<string, number | string>[]; series: Series[]; currency: string; xFormat: (v: string) => string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Stacked columns">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="bucket" tickFormatter={xFormat} tick={AXIS} tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis width={44} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} />
          <Tooltip cursor={{ fill: 'rgba(128,128,128,0.08)' }} labelFormatter={(v) => xFormat(String(v))} formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Lines, filled areas, or areas stacked into one total. */
export function Trend({ data, series, currency, xFormat, mode = 'line', height = 256, legend = true, dots = false }: {
  data: Record<string, number | string | undefined>[]; series: Series[]; currency: string; xFormat: (v: string) => string; mode?: 'line' | 'area' | 'stack'; height?: number; legend?: boolean; dots?: boolean;
}) {
  const common = (
    <>
      <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
      <XAxis dataKey="bucket" tickFormatter={xFormat} tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
      <YAxis width={44} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} domain={mode === 'stack' ? [0, 'auto'] : ['auto', 'auto']} />
      <Tooltip labelFormatter={(v) => xFormat(String(v))} formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
      {legend && series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
    </>
  );
  return (
    <div style={{ height }} role="img" aria-label="Trend over time">
      <ResponsiveContainer width="100%" height="100%">
        {mode === 'line' ? (
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            {common}
            {series.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={dots ? { r: 3 } : false} connectNulls />)}
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            {common}
            {series.map((s) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} fill={s.color} fillOpacity={mode === 'stack' ? 0.75 : 0.18} strokeWidth={2} stackId={mode === 'stack' ? 'a' : undefined} connectNulls />)}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Saved money per month as bars (red when negative) with the savings rate as a line. */
export function SavingsChart({ data, currency }: { data: { x: string; saved: number; rate: number | null }[]; currency: string }) {
  return (
    <div className="h-64" role="img" aria-label="Saved per month and savings rate">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 0, right: 0, top: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis yAxisId="money" width={44} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} />
          <YAxis yAxisId="rate" orientation="right" width={36} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v, name) => [name === 'Savings rate' ? `${v}%` : formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine yAxisId="money" y={0} stroke={GRID} />
          <Bar yAxisId="money" dataKey="saved" name="Saved" radius={[4, 4, 0, 0]}>
            {data.map((d) => <Cell key={d.x} fill={d.saved >= 0 ? INCOME_COLOR : EXPENSE_COLOR} />)}
          </Bar>
          <Line yAxisId="rate" type="monotone" dataKey="rate" name="Savings rate" stroke="var(--accent-blue)" strokeWidth={2} dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface TreeNode { name: string; label: string; fill: string; size?: number; children?: TreeNode[]; [key: string]: unknown }

/** Rectangles sized by amount: category, then sub-category, then payee inside it. */
export function SpendTreemap({ data, currency }: { data: TreeNode[]; currency: string }) {
  return (
    <div className="h-80" role="img" aria-label="Spending treemap">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={data} dataKey="size" stroke="var(--bg-surface)" isAnimationActive={false} content={<TreeCell />}>
          <Tooltip formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

function TreeCell(props: { x?: number; y?: number; width?: number; height?: number; depth?: number; label?: string; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, depth = 0, label = '', fill = OTHER_COLOR } = props;
  if (depth === 0) return null;
  const top = depth === 1;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={top ? 0.95 : depth === 2 ? 0.6 : 0.35} stroke="var(--bg-surface)" strokeWidth={top ? 2 : 1} />
      {depth <= 2 && width > 56 && height > 22 && <text x={x + 6} y={y + 15} fontSize={top ? 12 : 11} fontWeight={top ? 600 : 400} fill={top ? '#fff' : 'var(--text-primary, #111)'} style={{ pointerEvents: 'none' }}>{shorten(label, Math.floor(width / 7))}</text>}
    </g>
  );
}

/** Each purchase as a dot at its date and size. */
export function PurchaseDots({ items, currency }: { items: { id: string; date: string; title: string; category: string | null; amountMinor: number }[]; currency: string }) {
  const data = items.map((p) => ({ t: parseISO(p.date).getTime(), amount: p.amountMinor, title: p.title, category: p.category }));
  return (
    <div className="h-72" role="img" aria-label="Largest purchases over time">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: 0, right: 12, top: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" />
          <XAxis type="number" dataKey="t" domain={['dataMin', 'dataMax']} scale="time" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(t) => format(new Date(Number(t)), 'd MMM')} name="Date" />
          <YAxis type="number" dataKey="amount" width={44} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} name="Amount" />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={TOOLTIP_STYLE}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!p) return null;
              return (
                <div style={TOOLTIP_STYLE}>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-secondary">{format(new Date(p.t), 'd MMM yyyy')}{p.category ? ` · ${p.category}` : ''}</p>
                  <p className="tabular-nums">{formatMoney(p.amount, currency)}</p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill="var(--accent-blue)" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A forecast per name with the likely range drawn as a whisker. */
export function RangeBars({ items, currency }: { items: { label: string; value: number; low: number; high: number; color?: string | null }[]; currency: string }) {
  const data = items.map((i) => ({ ...i, err: [Math.max(0, i.value - i.low), Math.max(0, i.high - i.value)] as [number, number] }));
  return (
    <div style={{ height: Math.max(140, items.length * 38 + 20) }} role="img" aria-label="Forecast with likely range">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} />
          <YAxis type="category" dataKey="label" width={104} tick={AXIS} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => shorten(v)} />
          <Tooltip formatter={(v) => [formatMoney(Number(v), currency), 'Forecast']} contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" barSize={14} radius={[0, 6, 6, 0]}>
            {data.map((d, i) => <Cell key={d.label} fill={d.color ?? paletteColor(i)} />)}
            <ErrorBar dataKey="err" direction="x" stroke="var(--text-secondary)" width={6} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A goal's saved amount over time, with the pace-based projection dashed and the target marked. */
export function GoalLine({ data, target, currency }: { data: { t: number; saved?: number; projected?: number }[]; target: number; currency: string }) {
  return (
    <div className="h-48" role="img" aria-label="Goal progress">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis type="number" dataKey="t" domain={['dataMin', 'dataMax']} scale="time" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(t) => format(new Date(Number(t)), 'MMM yy')} />
          <YAxis width={44} tick={AXIS} tickLine={false} axisLine={false} domain={[0, Math.max(target, 1)]} tickFormatter={(v) => compact(Number(v), currency)} />
          <Tooltip labelFormatter={(t) => format(new Date(Number(t)), 'd MMM yyyy')} formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
          <ReferenceLine y={target} stroke={INCOME_COLOR} strokeDasharray="4 4" label={{ value: 'Target', fill: 'var(--text-secondary)', fontSize: 11, position: 'insideTopLeft' }} />
          <Line type="monotone" dataKey="saved" name="Saved" stroke="var(--accent-blue)" strokeWidth={2} dot={false} connectNulls />
          <Line type="linear" dataKey="projected" name="At this pace" stroke="var(--accent-blue)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A band between a low and a high estimate around a central line. */
export function BandChart({ data, currency, centreLabel }: { data: { x: string; mid: number; band: [number, number] }[]; currency: string; centreLabel: string }) {
  return (
    <div className="h-64" role="img" aria-label="Projection with likely range">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis width={44} tick={AXIS} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => compact(Number(v), currency)} />
          <Tooltip formatter={(v, name) => [Array.isArray(v) ? `${formatMoney(Number(v[0]), currency)} to ${formatMoney(Number(v[1]), currency)}` : formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
          <Area dataKey="band" name="Likely range" stroke="none" fill="var(--accent-blue)" fillOpacity={0.15} />
          <Line type="monotone" dataKey="mid" name={centreLabel} stroke="var(--accent-blue)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A calendar of squares, weeks across and weekdays down, darker for days with more spending. */
export function CalendarHeat({ from, to, days, currency }: { from: string; to: string; days: Map<string, number>; currency: string }) {
  const start = startOfWeek(parseISO(from), { weekStartsOn: 1 });
  const end = parseISO(to);
  const weeks = Math.ceil((differenceInCalendarDays(end, start) + 1) / 7);
  const max = Math.max(1, ...days.values());
  return (
    <div className="overflow-x-auto pb-1" role="img" aria-label="Spending per day">
      <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: `auto repeat(${weeks}, 12px)`, gridTemplateRows: 'auto repeat(7, 12px)' }}>
        <span />
        {Array.from({ length: weeks }, (_, w) => {
          const d = addDays(start, w * 7);
          return <span key={w} className="text-[9px] text-secondary leading-none whitespace-nowrap">{d.getDate() <= 7 ? format(d, 'MMM') : ''}</span>;
        })}
        {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((name, row) => (
          <Fragment key={row}>
            <span className="text-[9px] text-secondary pr-1 leading-[12px]">{name}</span>
            {Array.from({ length: weeks }, (_, w) => {
              const d = addDays(start, w * 7 + row);
              const key = format(d, 'yyyy-MM-dd');
              const inRange = d >= parseISO(from) && d <= end;
              const v = days.get(key) ?? 0;
              return (
                <span
                  key={w}
                  title={inRange ? `${format(d, 'EEE d MMM')}: ${formatMoney(v, currency)}` : undefined}
                  className="rounded-[3px]"
                  style={{ background: !inRange ? 'transparent' : v === 0 ? 'rgba(128,128,128,0.12)' : 'var(--accent-blue)', opacity: !inRange || v === 0 ? 1 : 0.2 + 0.8 * (v / max) }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      <p className="text-[11px] text-secondary mt-2">Darker means more spent that day. Sundays are at the bottom.</p>
    </div>
  );
}

/** Categories down the side, months across; each cell shows how much of the budget was used. */
export function BudgetHeat({ months, rows }: { months: string[]; rows: { name: string; cells: (number | null)[] }[] }) {
  const tone = (ratio: number) => (ratio > 1 ? 'rgba(238,93,124,0.85)' : ratio > 0.85 ? 'rgba(242,163,58,0.75)' : 'rgba(47,182,124,0.55)');
  return (
    <div className="overflow-x-auto pb-1">
      <table className="text-xs border-separate border-spacing-1 w-full" aria-label="Budget used per month">
        <thead><tr><th className="text-left font-normal text-secondary" />{months.map((m) => <th key={m} className="font-normal text-secondary min-w-12">{format(parseISO(`${m}-01`), 'MMM')}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="pr-2 truncate max-w-28 whitespace-nowrap">{r.name}</td>
              {r.cells.map((c, i) => (
                <td key={i} className="text-center rounded-md py-1.5 tabular-nums" style={{ background: c === null ? 'rgba(128,128,128,0.08)' : tone(c), color: c === null ? 'var(--text-secondary)' : '#111' }}>{c === null ? '–' : `${Math.round(c * 100)}%`}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-secondary mt-2">Green: within budget. Amber: nearly used up. Red: over.</p>
    </div>
  );
}


/** Two bars per x (for example budget and spent, or income and spending). */
export function PairColumns({ data, currency, a, b }: { data: { x: string; a: number; b: number }[]; currency: string; a: { name: string; color: string }; b: { name: string; color: string } }) {
  return (
    <div className="h-64" role="img" aria-label={`${a.name} and ${b.name}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis width={44} tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} />
          <Tooltip cursor={{ fill: 'rgba(128,128,128,0.08)' }} formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="a" name={a.name} fill={a.color} radius={[4, 4, 0, 0]} />
          <Bar dataKey="b" name={b.name} fill={b.color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two horizontal bars per name (for example lent, and paid back). `red` marks the second as a warning when it passes the first. */
export function PairBars({ data, currency, a, b, redWhenOver = false }: { data: { label: string; a: number; b: number }[]; currency: string; a: { name: string; color: string }; b: { name: string; color: string }; redWhenOver?: boolean }) {
  return (
    <div style={{ height: Math.max(140, data.length * 54 + 40) }} role="img" aria-label={`${a.name} and ${b.name}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 4" horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} />
          <YAxis type="category" dataKey="label" width={92} tick={AXIS} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => shorten(v, 14)} />
          <Tooltip cursor={{ fill: 'rgba(128,128,128,0.08)' }} formatter={(v, name) => [formatMoney(Number(v), currency), name]} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="a" name={a.name} fill={a.color} barSize={12} radius={[0, 4, 4, 0]} />
          <Bar dataKey="b" name={b.name} fill={b.color} barSize={12} radius={[0, 4, 4, 0]}>
            {redWhenOver && data.map((d) => <Cell key={d.label} fill={d.b > d.a ? EXPENSE_COLOR : b.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
