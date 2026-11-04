import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Transaction } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { useMarkForRefund } from '../../hooks/useRefunds';
import { prettyDate } from '../../lib/dates';
import { errorMessage } from '../../lib/http';
import { formatMoney, parseMoney, toInputValue } from '../../lib/money';

/** What can be refunded: something you paid for, not a transfer, a loan or income. */
export const canBeRefunded = (t: Transaction) => t.type === 'EXPENSE' && !t.loanId && !t.transferId;

export const purchaseTitle = (t: Transaction) => t.payeeName ?? t.note ?? t.categoryName ?? 'Purchase';

/** Marks a purchase as waiting for money back, for the whole amount or part of it. */
export function MarkForRefund({ tx, onClose, onDone }: { tx: Transaction; onClose: () => void; onDone?: () => void }) {
  const mark = useMarkForRefund();
  const [amount, setAmount] = useState(toInputValue(tx.amountMinor, tx.currency));
  const [note, setNote] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseMoney(amount, tx.currency);
    if (!minor) return toast.error('Enter the amount you expect back');
    if (minor > tx.amountMinor) return toast.error(`That is more than the ${formatMoney(tx.amountMinor, tx.currency)} you paid`);
    mark.mutate(
      { transactionId: tx.id, expectedMinor: minor, note: note.trim() || null },
      { onSuccess: () => { toast.success('Added to Refunds'); onDone?.(); onClose(); }, onError: (err) => toast.error(errorMessage(err)) },
    );
  };

  return (
    <Modal isOpen onClose={onClose} title="Mark for refund">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-primary/[0.04] p-3 text-sm">
          <p className="font-medium">{purchaseTitle(tx)}</p>
          <p className="text-xs text-secondary">{prettyDate(tx.occurredOn)} · {tx.accountName} · paid {formatMoney(tx.amountMinor, tx.currency)}</p>
        </div>
        <Field label={`Amount you expect back (${tx.currency})`}>
          <MoneyInput value={amount} currency={tx.currency} onChange={setAmount} autoFocus />
        </Field>
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Order number, who to chase, deadline…" /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mark.isPending}>Mark for refund</Button>
        </div>
      </form>
    </Modal>
  );
}
