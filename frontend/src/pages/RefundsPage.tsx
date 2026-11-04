import { CheckCircle2, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Refund, Transaction } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Avatar } from '../components/ui/Avatar';
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
import { Stat } from '../components/ui/Stat';
import { canBeRefunded, MarkForRefund, purchaseTitle } from '../features/refunds/MarkForRefund';
import { useAccounts } from '../hooks/useReference';
import { useCompleteRefund, useDeleteRefund, useRefunds, useUpdateRefund } from '../hooks/useRefunds';
import { useTransactionList } from '../hooks/useTransactions';
import { prettyDate, today } from '../lib/dates';
import { errorMessage } from '../lib/http';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';

const TABS = [['PENDING', 'Waiting'], ['DONE', 'Done']] as const;

export default function RefundsPage() {
  const { canEdit } = useWorkspace();
  const refunds = useRefunds();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('PENDING');
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<Refund | null>(null);
  const [completing, setCompleting] = useState<Refund | null>(null);
  const [deleting, setDeleting] = useState<Refund | null>(null);
  const del = useDeleteRefund();
  const data = refunds.data;
  const shown = useMemo(() => (data?.items ?? []).filter((r) => r.status === tab), [data, tab]);

  return (
    <>
      <PageHeader
        title="Refunds"
        subtitle="Purchases you expect money back for. Mark one received when it arrives."
        actions={canEdit && <Button onClick={() => setPicking(true)}><Plus className="w-4 h-4 mr-2" />Mark a purchase</Button>}
      />
      <StateView
        isLoading={refunds.isLoading}
        error={refunds.error}
        onRetry={() => void refunds.refetch()}
        isEmpty={!!data && data.items.length === 0}
        emptyTitle="Nothing to get back"
        emptyHint="Pick a purchase you are returning or disputing, set how much you expect back, and tick it off when the money arrives. You can also do this from any transaction."
        emptyAction={canEdit && <Button onClick={() => setPicking(true)}>Mark a purchase</Button>}
      >
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Stat icon={<Clock className="w-4 h-4" />} label="Waiting for" value={formatMoney(data.pendingMinor, data.currency)} footer={<>{data.pendingCount} {data.pendingCount === 1 ? 'refund' : 'refunds'}</>} />
              <Stat icon={<CheckCircle2 className="w-4 h-4" />} tone="income" label="Received" value={formatMoney(data.receivedMinor, data.currency)} footer={<>{data.doneCount} completed</>} />
            </div>

            <Segmented value={tab} onChange={setTab} options={TABS.map(([k, l]) => [k, `${l} (${k === 'PENDING' ? data.pendingCount : data.doneCount})`] as const)} />

            {shown.length === 0 ? (
              <p className="text-sm text-secondary py-6 text-center">{tab === 'PENDING' ? 'Nothing is waiting for a refund.' : 'No completed refunds yet.'}</p>
            ) : (
              <ul className="space-y-3">
                {shown.map((r) => (
                  <li key={r.id} className="glass-panel p-5 group">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={r.categoryName ?? r.title} size={40} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{r.title}</p>
                          <p className="text-xs text-secondary mt-0.5">Bought {prettyDate(r.purchasedOn)} · {r.accountName}{r.categoryName ? ` · ${r.categoryName}` : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {r.status === 'DONE' ? (
                          <>
                            <Badge tone="good">Received {formatMoney(r.receivedMinor ?? 0, r.currency)}</Badge>
                            <p className="text-xs text-secondary mt-1">{r.completedOn ? prettyDate(r.completedOn) : ''}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xl font-semibold tabular-nums tracking-[-0.02em]">{formatMoney(r.expectedMinor, r.currency)} <span className="text-sm font-normal text-secondary">expected</span></p>
                            <p className="text-xs text-secondary tabular-nums mt-0.5">of {formatMoney(r.purchaseMinor, r.currency)} paid</p>
                          </>
                        )}
                      </div>
                    </div>
                    {r.note && <p className="text-sm text-secondary mt-3 whitespace-pre-wrap break-words">{r.note}</p>}
                    {canEdit && (
                      <div className="flex items-center gap-2 mt-4">
                        {r.status === 'PENDING' && <Button size="sm" onClick={() => setCompleting(r)}><CheckCircle2 className="w-4 h-4 mr-2" />Mark received</Button>}
                        {r.status === 'PENDING' && <IconButton label="Change amount or note" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /></IconButton>}
                        <IconButton className="ml-auto sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" label="Remove from refunds" onClick={() => setDeleting(r)}><Trash2 className="w-4 h-4" /></IconButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </StateView>

      {picking && <PickPurchase onClose={() => setPicking(false)} marked={new Set((data?.items ?? []).map((r) => r.transactionId))} />}
      {editing && <EditModal refund={editing} onClose={() => setEditing(null)} />}
      {completing && <CompleteModal refund={completing} onClose={() => setCompleting(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title="Remove from refunds?"
        message="The purchase stays in your transactions. If you added the refund money to an account, that income stays too."
        busy={del.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) del.mutate(deleting.id, { onError: (e) => toast.error(errorMessage(e)) }); setDeleting(null); }}
      />
    </>
  );
}

/** Search recent purchases and choose the one to be refunded. */
function PickPurchase({ marked, onClose }: { marked: Set<string>; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<Transaction | null>(null);
  const list = useTransactionList({ type: 'EXPENSE', q: q.trim() || undefined, sort: 'date_desc' });
  const rows = (list.data?.pages.flatMap((p) => p.items) ?? []).filter((t) => canBeRefunded(t) && !marked.has(t.id)).slice(0, 12);

  if (chosen) return <MarkForRefund tx={chosen} onClose={onClose} />;
  return (
    <Modal isOpen onClose={onClose} title="Which purchase?">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by payee, note, category or amount" autoFocus aria-label="Search purchases" />
      <ul className="mt-3 divide-y divide-border max-h-80 overflow-y-auto">
        {rows.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => setChosen(t)} className="w-full flex justify-between gap-3 py-2.5 text-left text-sm hover:bg-primary/[0.03] rounded-lg px-2 -mx-2">
              <span className="min-w-0"><span className="font-medium block truncate">{purchaseTitle(t)}</span><span className="text-xs text-secondary">{prettyDate(t.occurredOn)} · {t.accountName}</span></span>
              <span className="tabular-nums shrink-0">{formatMoney(t.amountMinor, t.currency)}</span>
            </button>
          </li>
        ))}
        {!list.isLoading && rows.length === 0 && <li className="py-6 text-sm text-secondary text-center">No matching purchases.</li>}
      </ul>
    </Modal>
  );
}

function EditModal({ refund, onClose }: { refund: Refund; onClose: () => void }) {
  const update = useUpdateRefund();
  const [amount, setAmount] = useState(toInputValue(refund.expectedMinor, refund.currency));
  const [note, setNote] = useState(refund.note ?? '');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, refund.currency);
    if (!minor) return toast.error('Enter the amount you expect back');
    if (minor > refund.purchaseMinor) return toast.error(`That is more than the ${formatMoney(refund.purchaseMinor, refund.currency)} you paid`);
    update.mutate({ id: refund.id, body: { expectedMinor: minor, note: note.trim() || null } }, { onSuccess: onClose, onError: (err) => toast.error(errorMessage(err)) });
  };
  return (
    <Modal isOpen onClose={onClose} title={`Refund for ${refund.title}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={`Amount you expect back (${refund.currency})`}><MoneyInput value={amount} currency={refund.currency} onChange={setAmount} autoFocus /></Field>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={update.isPending}>Save</Button></div>
      </form>
    </Modal>
  );
}

function CompleteModal({ refund, onClose }: { refund: Refund; onClose: () => void }) {
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived && !a.memo && a.currency === refund.currency);
  const complete = useCompleteRefund();
  const [amount, setAmount] = useState(toInputValue(refund.expectedMinor, refund.currency));
  const [date, setDate] = useState(today());
  // Accounts may still be loading when this opens, so what is chosen is derived, not copied once.
  const [skipMoney, setSkipMoney] = useState(false);
  const [picked, setPicked] = useState('');
  const addMoney = !skipMoney && accounts.length > 0;
  const accountId = accounts.some((a) => a.id === picked) ? picked : accounts.find((a) => a.id === refund.accountId)?.id ?? accounts[0]?.id ?? '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, refund.currency) ?? (amount.trim() === '0' ? 0 : null);
    if (minor === null) return toast.error('Enter the amount you received');
    if (minor > refund.purchaseMinor) return toast.error(`That is more than the ${formatMoney(refund.purchaseMinor, refund.currency)} you paid`);
    complete.mutate(
      { id: refund.id, body: { receivedMinor: minor, receivedOn: date, accountId: addMoney && accountId ? accountId : null } },
      { onSuccess: () => { toast.success('Refund complete'); onClose(); }, onError: (err) => toast.error(errorMessage(err)) },
    );
  };

  return (
    <Modal isOpen onClose={onClose} title="Mark refund received">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-secondary">{refund.title}: you expected {formatMoney(refund.expectedMinor, refund.currency)}.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Received (${refund.currency})`}><MoneyInput value={amount} currency={refund.currency} onChange={setAmount} autoFocus /></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {accounts.length > 0 ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addMoney} onChange={(e) => setSkipMoney(!e.target.checked)} className="w-4 h-4" /> Add this money to an account</label>
            {addMoney && <Select value={accountId} onChange={(e) => setPicked(e.target.value)} aria-label="Account">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}
            <p className="text-xs text-secondary">Adds it as income with the same payee. Leave it off if you already recorded the refund yourself.</p>
          </div>
        ) : (
          <p className="text-xs text-secondary">You have no {refund.currency} account to add it to, so this only closes the refund.</p>
        )}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={complete.isPending}>Done</Button></div>
      </form>
    </Modal>
  );
}
