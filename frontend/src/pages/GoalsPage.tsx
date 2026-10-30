import { format, parseISO } from 'date-fns';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Goal } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Ring } from '../components/ui/Ring';
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
          {list.map((g) => {
            const done = g.percent >= 100;
            return (
              <li key={g.id} className="glass-panel p-5 group">
                <div className="flex items-start gap-5">
                  <Ring value={g.percent} size={84} stroke={8} color={done ? '#30A46C' : 'var(--accent-blue)'}>{g.percent}%</Ring>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold truncate">{g.name}</h2>
                      {canEdit && (
                        <div className="flex gap-0.5 -mt-1 -mr-1 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <IconButton label="Edit goal" onClick={() => setEditing(g)}><Pencil className="w-4 h-4" /></IconButton>
                          <IconButton label="Delete goal" onClick={() => setDeleting(g)}><Trash2 className="w-4 h-4" /></IconButton>
                        </div>
                      )}
                    </div>
                    <p className="text-[22px] font-semibold tabular-nums tracking-[-0.025em] mt-1">{formatMoney(g.savedMinor, g.currency)}</p>
                    <p className="text-xs text-secondary tabular-nums">of {formatMoney(g.targetMinor, g.currency)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-secondary flex items-center gap-1.5 flex-wrap">
                    {done ? <Badge tone="good">Goal reached</Badge> : g.projectedDate ? <Badge tone="accent">On pace for {format(parseISO(g.projectedDate), 'd MMM yyyy')}</Badge> : <Badge>No pace yet</Badge>}
                    {g.targetDate && <span>Target {format(parseISO(g.targetDate), 'd MMM yyyy')}</span>}
                  </p>
                  {canEdit && !done && <Button size="sm" variant="outline" onClick={() => setFunding(g)}><Plus className="w-4 h-4 mr-1.5" />Add funds</Button>}
                </div>
              </li>
            );
          })}
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
