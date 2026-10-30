import { Copy, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
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
import type { BudgetLine } from '../api/types';

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
          <>
            <div className="glass-panel p-5 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-secondary">Spent so far</span>
                <span className="tabular-nums font-medium">{formatMoney(b.spentMinor, b.currency)} of {formatMoney(b.budgetedMinor, b.currency)}</span>
              </div>
              <ProgressBar value={b.budgetedMinor > 0 ? (b.spentMinor / b.budgetedMinor) * 100 : 0} label="Total budget used" />
            </div>
            <ul className="space-y-3">
              {b.lines.map((l) => {
                const total = l.amountMinor + l.rolloverMinor;
                const pct = total > 0 ? (l.spentMinor / total) * 100 : l.spentMinor > 0 ? 101 : 0;
                return (
                  <li key={l.categoryId} className="glass-panel p-4">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div>
                        <p className="font-medium">{l.categoryName}</p>
                        {l.rolloverMinor > 0 && <p className="text-xs text-secondary">Includes {formatMoney(l.rolloverMinor, b.currency)} carried over</p>}
                      </div>
                      <div className="text-right">
                        <p className={`tabular-nums font-semibold ${l.remainingMinor < 0 ? 'text-red-500' : ''}`}>
                          {l.remainingMinor < 0 ? `${formatMoney(-l.remainingMinor, b.currency)} over` : `${formatMoney(l.remainingMinor, b.currency)} left`}
                        </p>
                        <p className="text-xs text-secondary tabular-nums">{formatMoney(l.spentMinor, b.currency)} / {formatMoney(total, b.currency)}</p>
                      </div>
                    </div>
                    <ProgressBar value={pct} label={l.categoryName} />
                    {canEdit && (
                      <div className="flex gap-1 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(l)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => remove.mutate({ categoryId: l.categoryId, month })}><Trash2 className="w-3.5 h-3.5 mr-1" />Remove</Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </StateView>
      {editing && <BudgetModal line={editing === 'new' ? null : editing} month={month} existing={new Set(b?.lines.map((l) => l.categoryId))} currency={b?.currency ?? 'USD'} onClose={() => setEditing(null)} />}
    </>
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
