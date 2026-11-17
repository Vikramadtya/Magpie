import { ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Transaction } from '../../api/types';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useLinkTransfer, useTransferMatches } from '../../hooks/useTransactions';
import { prettyDate } from '../../lib/dates';
import { errorMessage } from '../../lib/http';

/** Turns two entries (spending in one account, income of the same amount in another) into one transfer. */
export function LinkTransferModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const matches = useTransferMatches(tx.id);
  const link = useLinkTransfer();
  const join = (other: Transaction) =>
    link.mutate({ firstId: tx.id, secondId: other.id }, {
      onSuccess: () => { toast.success('Joined as a transfer'); onClose(); },
      onError: (e) => toast.error(errorMessage(e)),
    });
  return (
    <Modal isOpen onClose={onClose} title="Is this a transfer?">
      <div className="space-y-4">
        <p className="text-body text-secondary">If you paid yourself between two accounts, join the two entries. They stop counting as spending and income, and your balances stay as they are.</p>
        <div className="rounded-xl bg-primary/[0.04] px-4 py-3 text-body flex justify-between gap-3">
          <span>{tx.payeeName ?? tx.note ?? tx.categoryName ?? 'This entry'} <span className="text-caption text-secondary">· {tx.accountName} · {prettyDate(tx.occurredOn)}</span></span>
          <Amount minor={tx.direction * tx.amountMinor} currency={tx.currency} signed />
        </div>
        <h3>Possible other halves</h3>
        {matches.isLoading ? <p className="text-body text-secondary">Looking…</p> : (matches.data ?? []).length === 0 ? (
          <p className="text-body text-secondary">Nothing in another account has the same amount within five days. Add the other side first, then come back.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {(matches.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-body">
                <span className="min-w-0 truncate">{m.payeeName ?? m.note ?? m.categoryName ?? 'Entry'} <span className="text-caption text-secondary">· {m.accountName} · {prettyDate(m.occurredOn)}</span></span>
                <Button size="sm" disabled={link.isPending} onClick={() => join(m)}><ArrowLeftRight className="w-4 h-4 mr-1.5" />Join</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
