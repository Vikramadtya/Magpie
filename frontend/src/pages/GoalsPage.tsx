import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Goal } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StateView } from '../components/ui/StateView';
import { useContribute, useDeleteGoal, useGoals, useSaveGoal } from '../hooks/usePlanning';
import { today } from '../lib/dates';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';

export default function GoalsPage() {
  const { canEdit, baseCurrency } = useWorkspace();
  const goals = useGoals();
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const [funding, setFunding] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  const del = useDeleteGoal();
  const list = goals.data ?? [];

  return (
    <>
      <PageHeader title="Goals" subtitle="Save towards what matters" actions={canEdit && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />New goal</Button>} />
      <StateView
        isLoading={goals.isLoading}
        error={goals.error}
        onRetry={() => void goals.refetch()}
        isEmpty={list.length === 0}
        emptyTitle="No goals yet"
        emptyHint="An emergency fund or a trip: set a target and track progress."
        emptyAction={canEdit && <Button onClick={() => setEditing('new')}>Create a goal</Button>}
      >
        <ul className="grid md:grid-cols-2 gap-4">
          {list.map((g) => (
            <li key={g.id} className="glass-panel p-5">
              <div className="flex justify-between items-start mb-3">
                <h2 className="font-semibold">{g.name}</h2>
                <span className="text-sm font-medium tabular-nums">{g.percent}%</span>
              </div>
              <ProgressBar value={g.percent} tone="accent" label={g.name} />
              <p className="text-sm mt-2 tabular-nums">{formatMoney(g.savedMinor, g.currency)} <span className="text-secondary">of {formatMoney(g.targetMinor, g.currency)}</span></p>
              <p className="text-xs text-secondary mt-1">
                {g.percent >= 100 ? 'Goal reached 🎉' : g.projectedDate ? `At your current pace: ${format(parseISO(g.projectedDate), 'd MMM yyyy')}` : 'Add contributions to see a projection'}
                {g.targetDate ? ` · target ${format(parseISO(g.targetDate), 'd MMM yyyy')}` : ''}
              </p>
              {canEdit && (
                <div className="flex gap-1 mt-3">
                  <Button size="sm" onClick={() => setFunding(g)}>Add funds</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(g)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(g)}>Delete</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </StateView>
      {editing && <GoalModal goal={editing === 'new' ? null : editing} currency={baseCurrency} onClose={() => setEditing(null)} />}
      {funding && <FundModal goal={funding} onClose={() => setFunding(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete goal?" message={`"${deleting?.name}" and its contribution history will be removed.`} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }} />
    </>
  );
}

function GoalModal({ goal, currency, onClose }: { goal: Goal | null; currency: string; onClose: () => void }) {
  const save = useSaveGoal();
  const cur = goal?.currency ?? currency;
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? toInputValue(goal.targetMinor, cur) : '');
  const [date, setDate] = useState(goal?.targetDate ?? '');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(target, cur);
    if (!name.trim()) return setError('Name your goal');
    if (!minor) return setError('Enter a target amount');
    save.mutate({ id: goal?.id, name: name.trim(), targetMinor: minor, currency: cur, targetDate: date || null }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" error={error}><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} autoFocus /></Field>
        <Field label={`Target (${cur})`}><MoneyInput value={target} currency={cur} onChange={setTarget} /></Field>
        <Field label="Target date (optional)"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function FundModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const contribute = useContribute();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, goal.currency);
    if (!minor) return;
    contribute.mutate({ id: goal.id, amountMinor: minor, occurredOn: date }, { onSuccess: onClose });
  };
  return (
    <Modal isOpen onClose={onClose} title={`Add funds to ${goal.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={`Amount (${goal.currency})`}><MoneyInput value={amount} currency={goal.currency} onChange={setAmount} autoFocus /></Field>
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={contribute.isPending}>Add</Button></div>
      </form>
    </Modal>
  );
}
