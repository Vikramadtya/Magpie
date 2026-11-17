import { ArrowDown, ArrowUp, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Rule, RuleInput, RuleTest } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { groupCategories } from '../features/transactions/TransactionDialog';
import { useCategories } from '../hooks/useReference';
import { useRuleActions, useRules } from '../hooks/useRules';
import { errorMessage } from '../lib/http';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';

const TEXT_OPS = [['CONTAINS', 'contains'], ['STARTS_WITH', 'starts with'], ['EQUALS', 'is exactly']] as const;
const AMOUNT_OPS = [['GT', 'is more than'], ['LT', 'is less than'], ['EQ', 'is exactly'], ['BETWEEN', 'is between']] as const;

function sentence(r: Rule, currency: string): string {
  const parts: string[] = [];
  if (r.text) parts.push(`the payee or note ${TEXT_OPS.find(([k]) => k === r.textOp)?.[1] ?? 'contains'} “${r.text}”`);
  if (r.amountOp) {
    const lo = formatMoney(r.amountMin ?? 0, currency);
    parts.push(`the amount ${AMOUNT_OPS.find(([k]) => k === r.amountOp)?.[1]} ${r.amountOp === 'BETWEEN' ? `${lo} and ${formatMoney(r.amountMax ?? 0, currency)}` : lo}`);
  }
  return `When ${parts.join(' and ')}`;
}

export default function RulesPage() {
  const { canEdit, baseCurrency } = useWorkspace();
  const rules = useRules();
  const actions = useRuleActions();
  const [editing, setEditing] = useState<Rule | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Rule | null>(null);
  const list = rules.data ?? [];

  const move = (i: number, by: number) => {
    const ids = list.map((r) => r.id);
    [ids[i], ids[i + by]] = [ids[i + by], ids[i]];
    actions.order.mutate(ids);
  };
  const apply = (id?: string) =>
    actions.apply.mutate(id, {
      onSuccess: (r) => toast.success(r.updated === 0 ? 'Nothing to change: every matching entry already has a category.' : `Filed ${r.updated} past ${r.updated === 1 ? 'entry' : 'entries'}`),
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <>
      <PageHeader
        title="Rules"
        subtitle="File entries under a category by what they look like. The first matching rule wins, and rules only touch entries with no category."
        actions={canEdit && <><Button variant="outline" disabled={list.length === 0 || actions.apply.isPending} onClick={() => apply()}><Play className="w-4 h-4 mr-2" />Apply all to past entries</Button><Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />New rule</Button></>}
      />
      <StateView isLoading={rules.isLoading} error={rules.error} onRetry={() => void rules.refetch()} isEmpty={list.length === 0} emptyTitle="No rules yet" emptyHint="Say “anything with Swiggy or Zomato is Dining out” once, and Keeper does it every time, and can tidy your past entries too." emptyAction={canEdit && <Button onClick={() => setEditing('new')}>Create a rule</Button>}>
        <ul className="space-y-3">
          {list.map((r, i) => (
            <li key={r.id} className="glass-panel p-5 group">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">{r.name}{!r.active && <Badge>Off</Badge>}</p>
                  <p className="text-body text-secondary mt-1">{sentence(r, baseCurrency)}, file it under <strong className="text-primary">{r.categoryName}</strong>.</p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-0.5">
                    <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></IconButton>
                    <IconButton label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></IconButton>
                    <Button size="sm" variant="outline" className="mx-1" disabled={actions.apply.isPending} onClick={() => apply(r.id)}>Apply to past</Button>
                    <IconButton label="Edit" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /></IconButton>
                    <IconButton label="Delete" onClick={() => setDeleting(r)}><Trash2 className="w-4 h-4" /></IconButton>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </StateView>
      {editing && <RuleModal rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete this rule?" message="Entries it already filed keep their category." onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) actions.remove.mutate(deleting.id); setDeleting(null); }} />
    </>
  );
}

function RuleModal({ rule, onClose }: { rule: Rule | null; onClose: () => void }) {
  const { baseCurrency } = useWorkspace();
  const categories = useCategories().data ?? [];
  const { save, test } = useRuleActions();
  const [name, setName] = useState(rule?.name ?? '');
  const [kind, setKind] = useState<'EXPENSE' | 'INCOME'>(rule?.type ?? 'EXPENSE');
  const [text, setText] = useState(rule?.text ?? '');
  const [textOp, setTextOp] = useState<Rule['textOp']>(rule?.textOp ?? 'CONTAINS');
  const [useAmount, setUseAmount] = useState(!!rule?.amountOp);
  const [amountOp, setAmountOp] = useState<NonNullable<Rule['amountOp']>>(rule?.amountOp ?? 'GT');
  const [min, setMin] = useState(rule?.amountMin != null ? toInputValue(rule.amountMin, baseCurrency) : '');
  const [max, setMax] = useState(rule?.amountMax != null ? toInputValue(rule.amountMax, baseCurrency) : '');
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '');
  const [result, setResult] = useState<RuleTest | null>(null);
  const groups = groupCategories(categories.filter((c) => !c.archived), kind);

  const body = (): RuleInput | string => {
    if (!categoryId) return 'Choose the category to file them under';
    const lo = useAmount ? parseMoney(min || '0', baseCurrency) : null;
    const hi = useAmount && amountOp === 'BETWEEN' ? parseMoney(max || '0', baseCurrency) : null;
    if (useAmount && lo === null) return 'Check the amount';
    if (!text.trim() && !useAmount) return 'Add words to look for, an amount condition, or both';
    return { name: name.trim() || text.trim() || 'Rule', text: text.trim() || null, textOp, amountOp: useAmount ? amountOp : null, amountMin: lo, amountMax: hi, type: kind, categoryId };
  };

  const run = (e?: FormEvent) => {
    e?.preventDefault();
    const b = body();
    if (typeof b === 'string') return toast.error(b);
    test.mutate(b, { onSuccess: setResult, onError: (err) => toast.error(errorMessage(err)) });
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const b = body();
    if (typeof b === 'string') return toast.error(b);
    save.mutate({ id: rule?.id, body: { ...b, active: rule?.active ?? true } }, { onSuccess: () => { toast.success('Rule saved'); onClose(); }, onError: (err) => toast.error(errorMessage(err)) });
  };

  return (
    <Modal isOpen onClose={onClose} title={rule ? 'Edit rule' : 'New rule'} className="sm:max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <Segmented value={kind} onChange={(k) => { setKind(k); setCategoryId(''); setResult(null); }} options={[['EXPENSE', 'Spending'], ['INCOME', 'Income']] as const} />
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Food delivery" /></Field>
        <div className="grid grid-cols-[9rem_1fr] gap-3 items-end">
          <Field label="When the payee or note"><Select value={textOp} onChange={(e) => setTextOp(e.target.value as Rule['textOp'])}>{TEXT_OPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="" hint="Separate several with commas: swiggy, zomato"><Input value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} maxLength={200} placeholder="swiggy, zomato" aria-label="Words to look for" /></Field>
        </div>
        <label className="flex items-center gap-2 text-body"><input type="checkbox" className="w-4 h-4" checked={useAmount} onChange={(e) => { setUseAmount(e.target.checked); setResult(null); }} /> Also look at the amount</label>
        {useAmount && (
          <div className="grid grid-cols-3 gap-3 items-end">
            <Field label="The amount"><Select value={amountOp} onChange={(e) => setAmountOp(e.target.value as NonNullable<Rule['amountOp']>)}>{AMOUNT_OPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label={amountOp === 'BETWEEN' ? 'From' : 'Amount'}><MoneyInput value={min} currency={baseCurrency} onChange={(v) => { setMin(v); setResult(null); }} /></Field>
            {amountOp === 'BETWEEN' && <Field label="To"><MoneyInput value={max} currency={baseCurrency} onChange={(v) => { setMax(v); setResult(null); }} /></Field>}
          </div>
        )}
        <Field label="File it under">
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setResult(null); }}>
            <option value="">Choose a category…</option>
            {groups.map((g) => (
              <optgroup key={g.parent.id} label={g.parent.name}>
                <option value={g.parent.id}>{g.parent.name}</option>
                {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>

        <div className="rounded-xl bg-primary/[0.04] p-4 space-y-2">
          <div className="flex items-center justify-between gap-3"><span className="text-body">Try it on your past entries</span><Button type="button" size="sm" variant="outline" disabled={test.isPending} onClick={() => run()}>Test</Button></div>
          {result && (
            <>
              <p className="text-body"><strong>{result.matches}</strong> uncategorised {result.matches === 1 ? 'entry matches' : 'entries match'}.</p>
              {result.samples.length > 0 && <ul className="text-caption text-secondary space-y-0.5">{result.samples.map((s, i) => <li key={i} className="flex justify-between"><span className="truncate">{s.title}</span><span className="tabular-nums">{formatMoney(s.amountMinor, baseCurrency)}</span></li>)}</ul>}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>Save rule</Button></div>
      </form>
    </Modal>
  );
}
