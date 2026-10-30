import { format, parseISO } from 'date-fns';
import { Pause, Play, Plus, Zap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Frequency, RecurringRule } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { groupCategories } from '../features/transactions/TransactionDialog';
import { useDeleteRecurring, usePostRecurringNow, useRecurring, useSaveRecurring, useToggleRecurring } from '../hooks/usePlanning';
import { useAccounts, useCategories } from '../hooks/useReference';
import { today } from '../lib/dates';
import { parseMoney, toInputValue } from '../lib/money';

const FREQ: Record<Frequency, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', QUARTERLY: 'quarter', YEARLY: 'year' };
const describe = (r: RecurringRule) => (r.intervalN === 1 ? `Every ${FREQ[r.frequency]}` : `Every ${r.intervalN} ${FREQ[r.frequency]}s`);

export default function RecurringPage() {
  const { canEdit } = useWorkspace();
  const rules = useRecurring();
  const [editing, setEditing] = useState<RecurringRule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RecurringRule | null>(null);
  const post = usePostRecurringNow();
  const toggle = useToggleRecurring();
  const del = useDeleteRecurring();
  const list = rules.data ?? [];

  return (
    <>
      <PageHeader title="Recurring" subtitle="Subscriptions, bills and regular income that post themselves" actions={canEdit && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />New</Button>} />
      <StateView
        isLoading={rules.isLoading}
        error={rules.error}
        onRetry={() => void rules.refetch()}
        isEmpty={list.length === 0}
        emptyTitle="Nothing recurring yet"
        emptyHint="Add rent, a subscription or your salary and Keeper will record it on schedule."
        emptyAction={canEdit && <Button onClick={() => setEditing('new')}>Add recurring item</Button>}
      >
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className={`glass-panel p-4 flex flex-wrap items-center justify-between gap-3 ${r.status === 'PAUSED' ? 'opacity-60' : ''}`}>
              <div className="min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-xs text-secondary">{describe(r)} · next {format(parseISO(r.nextRunOn), 'd MMM yyyy')}{r.status === 'PAUSED' ? ' · paused' : ''}{!r.autoPost ? ' · manual' : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <Amount minor={r.type === 'INCOME' ? r.amountMinor : -r.amountMinor} currency={r.currency} signed className="font-semibold" />
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" title="Post next occurrence now" onClick={() => post.mutate(r.id)}><Zap className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" title={r.status === 'ACTIVE' ? 'Pause' : 'Resume'} onClick={() => toggle.mutate({ id: r.id, pause: r.status === 'ACTIVE' })}>
                      {r.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(r)}>Delete</Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </StateView>
      {editing && <RuleModal rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete recurring item?" message="Past transactions it created are kept." onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }} />
    </>
  );
}

function RuleModal({ rule, onClose }: { rule: RecurringRule | null; onClose: () => void }) {
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
  const categories = useCategories().data ?? [];
  const save = useSaveRecurring();
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(rule?.type ?? 'EXPENSE');
  const [name, setName] = useState(rule?.name ?? '');
  const [accountId, setAccountId] = useState(rule?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? 'MONTHLY');
  const [interval, setIntervalN] = useState(rule?.intervalN ?? 1);
  const [startOn, setStartOn] = useState(rule?.nextRunOn ?? today());
  const [endOn, setEndOn] = useState(rule?.endOn ?? '');
  const [autoPost, setAutoPost] = useState(rule?.autoPost ?? true);
  const [error, setError] = useState('');

  const account = accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? rule?.currency ?? 'USD';
  const initialAmount = rule && amount === '' ? toInputValue(rule.amountMinor, rule.currency) : amount;
  const groups = groupCategories(categories, type);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(initialAmount, currency);
    if (!name.trim()) return setError('Give it a name');
    if (!minor) return setError('Enter an amount');
    if (!accountId) return setError('Choose an account');
    save.mutate(
      { id: rule?.id, body: { name: name.trim(), accountId, categoryId: categoryId || null, type, amountMinor: minor, frequency, intervalN: interval, startOn, endOn: endOn || null, autoPost } },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={rule ? 'Edit recurring item' : 'New recurring item'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/10">
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setType(t); setCategoryId(''); }} className={`py-1.5 text-sm font-medium rounded-md ${type === t ? 'bg-surface shadow-sm' : 'text-secondary'}`}>{t === 'EXPENSE' ? 'Expense' : 'Income'}</button>
          ))}
        </div>
        <Field label="Name" error={error}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix, Rent, Salary…" maxLength={160} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`}><MoneyInput value={initialAmount} currency={currency} onChange={setAmount} /></Field>
          <Field label="Account"><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        </div>
        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {groups.map((g) => <optgroup key={g.parent.id} label={g.parent.name}>{[g.parent, ...g.children].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Repeats"><Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>{Object.keys(FREQ).map((f) => <option key={f} value={f}>{f[0] + f.slice(1).toLowerCase()}</option>)}</Select></Field>
          <Field label="Every"><Input type="number" min={1} max={52} value={interval} onChange={(e) => setIntervalN(Math.max(1, Math.min(52, Number(e.target.value) || 1)))} /></Field>
          <Field label={rule ? 'Next date' : 'Starts'}><Input type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} /></Field>
        </div>
        <Field label="Ends (optional)"><Input type="date" value={endOn} onChange={(e) => setEndOn(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} /> Record automatically on the due date</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}
