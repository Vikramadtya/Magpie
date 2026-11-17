import { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { useBreakdown } from '../../hooks/useCharts';
import { TOOLTIP_STYLE } from '../../lib/chart';
import { formatCompact, formatMoney } from '../../lib/money';
import { paletteColor } from '../../lib/palette';
import { ChartCard, EXPENSE_COLOR, INCOME_COLOR, OTHER_COLOR, whenVisible } from './kit';

interface Node { name: string; color: string }
interface Link { source: number; target: number; value: number }

/** The shape of the flow: income sources into one pot, and out to what was spent and what was kept. */
export function flowData(income: { label: string; value: number }[], spend: { label: string; value: number }[]) {
  const earned = income.reduce((a, r) => a + r.value, 0);
  const spent = spend.reduce((a, r) => a + r.value, 0);
  const nodes: Node[] = [];
  const links: Link[] = [];
  const add = (name: string, color: string) => nodes.push({ name, color }) - 1;
  const pot = add('Money in', '#5B6CF2');
  income.forEach((r, i) => links.push({ source: add(r.label, i === 0 ? INCOME_COLOR : paletteColor(i + 2)), target: pot, value: r.value }));
  // spending more than came in is paid from savings, shown as one more source
  if (spent > earned) links.push({ source: add('From savings', OTHER_COLOR), target: pot, value: spent - earned });
  spend.forEach((r, i) => links.push({ source: pot, target: add(r.label, paletteColor(i)), value: r.value }));
  if (earned > spent) links.push({ source: pot, target: add('Kept', INCOME_COLOR), value: earned - spent });
  return { nodes, links, earned, spent };
}

function top(rows: { label: string; totalMinor: number }[], keep: number, rest: string) {
  const sorted = [...rows].filter((r) => r.totalMinor > 0).sort((a, b) => b.totalMinor - a.totalMinor);
  const head = sorted.slice(0, keep).map((r) => ({ label: r.label, value: r.totalMinor }));
  const tail = sorted.slice(keep).reduce((a, r) => a + r.totalMinor, 0);
  return tail > 0 ? [...head, { label: rest, value: tail }] : head;
}

function FlowNode({ x, y, width, height, payload, containerWidth }: { x: number; y: number; width: number; height: number; payload: Node & { value: number }; containerWidth: number }) {
  const right = x > containerWidth / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(height, 2)} rx={3} fill={payload.color} />
      <text x={right ? x - 6 : x + width + 6} y={y + height / 2} textAnchor={right ? 'end' : 'start'} dominantBaseline="middle" fontSize={11} fill="var(--text-primary)">{payload.name}</text>
    </g>
  );
}

function MoneyFlowView({ from, to }: { from: string; to: string }) {
  const income = useBreakdown({ by: 'category', type: 'INCOME', from, to, limit: 5 });
  const spend = useBreakdown({ by: 'category', type: 'EXPENSE', from, to, limit: 8 });
  const currency = spend.data?.currency ?? income.data?.currency ?? 'USD';
  const data = useMemo(() => flowData(top(income.data?.rows ?? [], 5, 'Other income'), top(spend.data?.rows ?? [], 8, 'Everything else')), [income.data, spend.data]);
  const empty = data.earned === 0 && data.spent === 0;
  return (
    <ChartCard title="Where the money flowed" hint="Income on the left, then out to what you spent and what you kept." loading={income.isLoading || spend.isLoading} error={income.error ?? spend.error} empty={empty} emptyText="Record some income and spending to see the flow.">
      <div className="h-80" role="img" aria-label="Money flow from income to spending">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes: data.nodes, links: data.links }}
            nodeWidth={10}
            nodePadding={14}
            margin={{ top: 8, right: 110, bottom: 8, left: 8 }}
            link={{ stroke: 'var(--accent-blue)', strokeOpacity: 0.18 }}
            node={<FlowNode x={0} y={0} width={0} height={0} payload={{ name: '', color: '', value: 0 }} containerWidth={640} />}
          >
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => formatMoney(Number(v), currency)} />
          </Sankey>
        </ResponsiveContainer>
      </div>
      <p className="text-caption text-secondary mt-2">In {formatCompact(data.earned, currency)} · spent {formatCompact(data.spent, currency)}{data.earned > data.spent ? ` · kept ${formatCompact(data.earned - data.spent, currency)}` : ''}</p>
    </ChartCard>
  );
}

export const MoneyFlow = whenVisible(MoneyFlowView);
