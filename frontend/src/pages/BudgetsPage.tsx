import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useWorkspace } from '../auth/AuthProvider';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Field } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { MonthPicker } from '../components/ui/MonthPicker';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { groupCategories } from '../features/transactions/TransactionDialog';
import { useCopyBudgets, useBudgets, useRemoveBudget, useSetBudget } from '../hooks/usePlanning';
import { useCategories, usePeople } from '../hooks/useReference';
import { monthKey } from '../lib/dates';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';
import type { BudgetLine, BudgetSummary } from '../api/types';
import { Ring } from '../components/ui/Ring';

export default function BudgetsPage() {
  const { canEdit } = useWorkspace();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const budgets = useBudgets(month);
  const copy = useCopyBudgets();
  const remove = useRemoveBudget();
  const [editing, setEditing] = useState<BudgetLine | 'new' | null>(null);
  const b = budgets.data;

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Monthly limits per category"
        actions={
          <>
            <MonthPicker month={month} onChange={setMonth} />
            {canEdit && <Button variant="outline" size="sm" onClick={() => copy.mutate(month)} disabled={copy.isPending}><Copy className="w-4 h-4 mr-2" />Copy last month</Button>}
            {canEdit && <Button size="sm" onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />Add</Button>}
          </>
        }
      />
      <StateView
        isLoading={budgets.isLoading}
        error={budgets.error}
        onRetry={() => void budgets.refetch()}
        isEmpty={!!b && b.lines.length === 0}
        emptyTitle="No budgets this month"
        emptyHint="Set a limit for a category, or copy last month's budgets."
      >
        {b && (
          <div className="space-y-6">
            <Summary b={b} />
            <ul className="grid md:grid-cols-2 gap-4">
              {b.lines.map((l) => {
                const total = l.amountMinor + l.rolloverMinor;
                const pct = total > 0 ? (l.spentMinor / total) * 100 : l.spentMinor > 0 ? 101 : 0;
                const over = l.remainingMinor < 0;
                return (
                  <li key={l.categoryId} className="glass-panel p-5 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color ?? 'var(--accent-blue)' }} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{l.categoryName}</p>
                          <p className="text-xs text-secondary tabular-nums">{formatMoney(l.spentMinor, b.currency)} of {formatMoney(total, b.currency)}</p>
                        </div>
                      </div>
                      <Badge tone={over ? 'bad' : pct >= 85 ? 'warn' : 'good'}>{over ? 'Over' : `${Math.round(pct)}% used`}</Badge>
                    </div>
                    <p className={`mt-4 mb-2 text-2xl font-semibold tabular-nums tracking-[-0.025em] ${over ? 'text-red-500' : ''}`}>
                      {over ? formatMoney(-l.remainingMinor, b.currency) : formatMoney(l.remainingMinor, b.currency)}
                      <span className="ml-1.5 text-sm font-normal text-secondary">{over ? 'over' : 'left'}</span>
                    </p>
                    <ProgressBar value={pct} label={l.categoryName} />
                    <div className="flex items-center justify-between mt-3 min-h-8">
                      <p className="text-xs text-secondary">
                        {l.rolloverMinor > 0 ? `Includes ${formatMoney(l.rolloverMinor, b.currency)} carried over` : l.rollover ? 'Unspent carries over' : ''}
                        {l.includeOthers ? `${l.rollover ? ' · ' : ''}Counts others' spending` : ''}
                      </p>
                      {canEdit && (
                        <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <IconButton label="Edit budget" onClick={() => setEditing(l)}><Pencil className="w-4 h-4" /></IconButton>
                          <IconButton label="Remove budget" onClick={() => remove.mutate({ categoryId: l.categoryId, month })}><Trash2 className="w-4 h-4" /></IconButton>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </StateView>
      {editing && <BudgetModal line={editing === 'new' ? null : editing} month={month} existing={new Set(b?.lines.map((l) => l.categoryId))} currency={b?.currency ?? 'USD'} onClose={() => setEditing(null)} />}
    </>
  );
}

function Summary({ b }: { b: BudgetSummary }) {
  const pct = b.budgetedMinor > 0 ? (b.spentMinor / b.budgetedMinor) * 100 : 0;
  const left = b.budgetedMinor - b.spentMinor;
  return (
    <section className="glass-panel p-6 flex flex-wrap items-center gap-6">
      <Ring value={pct} size={96} stroke={9} color={pct > 100 ? '#E5484D' : pct >= 85 ? '#F2A33A' : '#30A46C'}>{Math.round(pct)}%</Ring>
      <div className="grid grid-cols-3 gap-6 flex-1 min-w-[16rem]">
        <div><p className="text-[13px] text-secondary">Budgeted</p><p className="text-xl font-semibold tabular-nums tracking-[-0.02em] mt-1">{formatMoney(b.budgetedMinor, b.currency)}</p></div>
        <div><p className="text-[13px] text-secondary">Spent</p><p className="text-xl font-semibold tabular-nums tracking-[-0.02em] mt-1">{formatMoney(b.spentMinor, b.currency)}</p></div>
        <div><p className="text-[13px] text-secondary">{left < 0 ? 'Over' : 'Left'}</p><p className={`text-xl font-semibold tabular-nums tracking-[-0.02em] mt-1 ${left < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{formatMoney(Math.abs(left), b.currency)}</p></div>
      </div>
    </section>
  );
}

function BudgetModal({ line, month, existing, currency, onClose }: { line: BudgetLine | null; month: string; existing: Set<string>; currency: string; onClose: () => void }) {
  const categories = useCategories().data ?? [];
  const set = useSetBudget();
  const groups = useMemo(() => groupCategories(categories, 'EXPENSE'), [categories]);
  const [categoryId, setCategoryId] = useState(line?.categoryId ?? '');
  const [amount, setAmount] = useState(line ? toInputValue(line.amountMinor, currency) : '');
  const [rollover, setRollover] = useState(line?.rollover ?? false);
  const [includeOthers, setIncludeOthers] = useState(line?.includeOthers ?? false);
  const hasPeople = (usePeople().data ?? []).length > 0;
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, currency);
    if (!categoryId) return setError('Choose a category');
    if (minor === null) return setError('Enter a valid amount');
    set.mutate({ categoryId, month, amountMinor: minor, rollover, includeOthers }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} title={line ? `Edit ${line.categoryName}` : 'Add budget'}>
      <form onSubmit={submit} className="space-y-4">
        {!line && (
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select…</option>
              {groups.map((g) => (
                <optgroup key={g.parent.id} label={g.parent.name}>
                  {[g.parent, ...g.children].map((c) => <option key={c.id} value={c.id} disabled={existing.has(c.id)}>{c.name}{existing.has(c.id) ? ' (set)' : ''}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
        )}
        <Field label={`Monthly limit (${currency})`} error={error}><MoneyInput value={amount} currency={currency} onChange={setAmount} autoFocus /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} /> Carry unspent amount into next month</label>
        {(hasPeople || includeOthers) && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeOthers} onChange={(e) => setIncludeOthers(e.target.checked)} /> Include spending by others on your accounts</label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={set.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
