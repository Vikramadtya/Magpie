import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Loan } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Stat } from '../components/ui/Stat';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { useCreateLoan, useDeleteLoan, useLoanDetail, useLoans, useRepayLoan } from '../hooks/useExtras';
import { useAccounts } from '../hooks/useReference';
import { cn } from '../lib/cn';
import { prettyDate, today } from '../lib/dates';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';

export default function LoansPage() {
  const { canEdit } = useWorkspace();
  const loans = useLoans();
  const [creating, setCreating] = useState(false);
  const [repaying, setRepaying] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState<Loan | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const del = useDeleteLoan();
  const data = loans.data;

  return (
    <>
      <PageHeader
        title="Loans"
        subtitle="Money you've borrowed or lent. Not counted as income or spending."
        actions={canEdit && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />New loan</Button>}
      />
      <StateView
        isLoading={loans.isLoading}
        error={loans.error}
        onRetry={() => void loans.refetch()}
        isEmpty={!!data && data.loans.length === 0}
        emptyTitle="No loans yet"
        emptyHint="Record money you lent to a friend or borrowed from family and track repayments."
        emptyAction={canEdit && <Button onClick={() => setCreating(true)}>Record a loan</Button>}
      >
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Stat icon={<ArrowDownLeft className="w-4 h-4" />} tone="income" label="Owed to you" value={formatMoney(data.owedToMeMinor, data.currency)} />
              <Stat icon={<ArrowUpRight className="w-4 h-4" />} tone="expense" label="You owe" value={formatMoney(data.iOweMinor, data.currency)} />
              <Stat className="col-span-2 lg:col-span-1" label="Net" value={<Amount minor={data.owedToMeMinor - data.iOweMinor} currency={data.currency} signed />} />
            </div>

            {data.people.length > 0 && (
              <section className="glass-panel p-5">
                <h2 className="font-semibold mb-3">By person</h2>
                <ul className="divide-y divide-border">
                  {data.people.map((p) => (
                    <li key={p.person} className="py-3 flex items-center gap-3 text-sm">
                      <Avatar name={p.person} />
                      <span className="flex-1 min-w-0"><span className="font-medium">{p.person}</span> <span className="text-xs text-secondary">· {p.openLoans} open</span></span>
                      <Badge tone={p.netMinor >= 0 ? 'good' : 'bad'} className="text-xs px-2.5 py-1">
                        {p.netMinor >= 0 ? `owes you ${formatMoney(p.netMinor, data.currency)}` : `you owe ${formatMoney(-p.netMinor, data.currency)}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ul className="space-y-3">
              {data.loans.map((l) => (
                <li key={l.id} className={cn('glass-panel p-5 group', l.status === 'SETTLED' && 'opacity-70')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={l.person} size={40} />
                      <div className="min-w-0">
                        <p className="font-semibold">{l.direction === 'LENT' ? `Lent to ${l.person}` : `Borrowed from ${l.person}`}</p>
                        <p className="text-xs text-secondary mt-0.5">
                          {prettyDate(l.occurredOn)}{l.dueOn ? ` · due ${prettyDate(l.dueOn)}` : ''}{l.note ? ` · ${l.note}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {l.status === 'SETTLED' ? <Badge tone="good">Settled</Badge> : <p className="text-xl font-semibold tabular-nums tracking-[-0.02em]">{formatMoney(l.outstandingMinor, l.currency)} <span className="text-sm font-normal text-secondary">left</span></p>}
                      <p className="text-xs text-secondary tabular-nums mt-0.5">{formatMoney(l.repaidMinor, l.currency)} of {formatMoney(l.principalMinor, l.currency)} repaid</p>
                    </div>
                  </div>
                  <div className="mt-4"><ProgressBar tone="accent" value={(l.repaidMinor / l.principalMinor) * 100} label="Repaid" /></div>
                  <div className="flex items-center gap-2 mt-4">
                    {canEdit && l.status === 'OPEN' && <Button size="sm" variant="outline" onClick={() => setRepaying(l)}>{l.direction === 'LENT' ? 'Record repayment received' : 'Record repayment'}</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? 'Hide history' : 'History'}</Button>
                    {canEdit && <IconButton className="ml-auto sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" label="Delete loan" onClick={() => setDeleting(l)}><Trash2 className="w-4 h-4" /></IconButton>}
                  </div>
                  {open === l.id && <History id={l.id} />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </StateView>
      {creating && <NewLoanModal people={data?.people.map((p) => p.person) ?? []} onClose={() => setCreating(false)} />}
      {repaying && <RepayModal loan={repaying} onClose={() => setRepaying(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title="Delete this loan?"
        message="The loan and all its payments are removed and your account balances are restored. You can bring individual transactions back from Recently deleted."
        busy={del.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) del.mutate(deleting.id); setDeleting(null); }}
      />
    </>
  );
}

function History({ id }: { id: string }) {
  const detail = useLoanDetail(id);
  return (
    <ul className="mt-3 divide-y divide-border text-sm border-t border-border">
      {(detail.data?.transactions ?? []).map((t) => (
        <li key={t.id} className="py-2 flex justify-between">
          <span>{t.note ?? t.type} <span className="text-xs text-secondary">· {prettyDate(t.occurredOn)} · {t.accountName}</span></span>
          <Amount minor={t.direction * t.amountMinor} currency={t.currency} signed />
        </li>
      ))}
    </ul>
  );
}

function NewLoanModal({ people, onClose }: { people: string[]; onClose: () => void }) {
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
  const create = useCreateLoan();
  const [direction, setDirection] = useState<'LENT' | 'BORROWED'>('LENT');
  const [person, setPerson] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [dueOn, setDueOn] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const account = accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? 'USD';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, currency);
    if (!person.trim()) return setError('Who is it with?');
    if (!minor) return setError('Enter an amount');
    if (!accountId) return setError('Choose an account');
    create.mutate({ person: person.trim(), direction, accountId, amountMinor: minor, occurredOn: date, dueOn: dueOn || null, note: note || null }, { onSuccess: onClose });
  };

  return (
    <Modal isOpen onClose={onClose} title="New loan">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/10" role="tablist">
          {([['LENT', 'I lent money'], ['BORROWED', 'I borrowed money']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={direction === k} onClick={() => setDirection(k)} className={cn('py-1.5 text-sm font-medium rounded-md', direction === k ? 'bg-surface shadow-sm' : 'text-secondary')}>{label}</button>
          ))}
        </div>
        <Field label={direction === 'LENT' ? 'Lent to' : 'Borrowed from'} error={error}>
          <Input list="loan-people" value={person} onChange={(e) => setPerson(e.target.value)} maxLength={160} autoFocus />
          <datalist id="loan-people">{people.map((p) => <option key={p} value={p} />)}</datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`}><MoneyInput value={amount} currency={currency} onChange={setAmount} /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label={direction === 'LENT' ? 'Paid from' : 'Received into'}>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date (optional)"><Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} /></Field>
          <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={create.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function RepayModal({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived && a.currency === loan.currency);
  const repay = useRepayLoan();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [amount, setAmount] = useState(toInputValue(loan.outstandingMinor, loan.currency));
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, loan.currency);
    if (!minor || !accountId) return;
    repay.mutate({ id: loan.id, body: { accountId, amountMinor: minor, occurredOn: date, note: note || null } }, { onSuccess: onClose });
  };
  return (
    <Modal isOpen onClose={onClose} title={loan.direction === 'LENT' ? `Repayment from ${loan.person}` : `Repay ${loan.person}`}>
      {accounts.length === 0 ? (
        <p className="text-sm text-secondary">You need a {loan.currency} account to record this repayment.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-secondary">{formatMoney(loan.outstandingMinor, loan.currency)} outstanding.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Amount (${loan.currency})`}><MoneyInput value={amount} currency={loan.currency} onChange={setAmount} autoFocus /></Field>
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <Field label={loan.direction === 'LENT' ? 'Received into' : 'Paid from'}>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          </Field>
          <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={repay.isPending}>Record</Button></div>
        </form>
      )}
    </Modal>
  );
}
