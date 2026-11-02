import { Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { Account, QuickCapture } from '../../api/types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAcceptCapture, useDismissCapture } from '../../hooks/useInbox';
import { useCategories } from '../../hooks/useReference';
import { prettyDate } from '../../lib/dates';
import { errorMessage } from '../../lib/http';
import { formatMoney } from '../../lib/money';
import { groupCategories } from '../transactions/TransactionDialog';

/** Entries typed on the phone, waiting for a look before they become real transactions. */
export function QuickAdds({ items, accounts }: { items: QuickCapture[]; accounts: Account[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Quick adds from your phone" className="mb-8">
      <h2 className="text-sm font-medium text-secondary mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Quick adds from your phone</h2>
      <ul className="space-y-3">
        {items.map((c) => <CaptureCard key={c.id} item={c} accounts={accounts} />)}
      </ul>
    </section>
  );
}

function CaptureCard({ item, accounts }: { item: QuickCapture; accounts: Account[] }) {
  const accept = useAcceptCapture();
  const dismiss = useDismissCapture();
  const categories = useCategories().data ?? [];
  const [editing, setEditing] = useState(false);
  const [accountId, setAccountId] = useState(item.accountId ?? '');
  const [categoryId, setCategoryId] = useState(item.categoryId ?? '');
  const [payee, setPayee] = useState(item.payeeText ?? '');
  const [date, setDate] = useState(item.occurredOn);
  const groups = groupCategories(categories.filter((c) => !c.archived), item.type);
  const usable = accounts.some((a) => a.id === accountId);

  const record = (body: Parameters<typeof accept.mutate>[0]['body']) =>
    accept.mutate({ id: item.id, body }, { onError: (e) => toast.error(errorMessage(e)) });

  return (
    <li className="glass-panel p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{item.payeeText ?? item.note ?? (item.type === 'INCOME' ? 'Income' : 'Expense')}</p>
          <p className="text-xs text-secondary truncate">
            {prettyDate(item.occurredOn)} · {item.accountName ?? 'Account removed'}{item.categoryName ? ` · ${item.categoryName}` : ''}
            {item.payeeText && item.note ? ` · ${item.note}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-semibold tabular-nums ${item.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{item.type === 'INCOME' ? '+' : ''}{formatMoney(item.amountMinor, item.currency)}</p>
          {!item.categoryId && <Badge tone="warn">No category</Badge>}
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Account">
            <option value="" disabled>Choose an account</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
            <option value="">No category</option>
            {groups.map((g) => (
              <optgroup key={g.parent.id} label={g.parent.name}>
                <option value={g.parent.id}>{g.parent.name}</option>
                {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </Select>
          <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Paid to" aria-label="Paid to" maxLength={160} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={dismiss.isPending} onClick={() => dismiss.mutate(item.id, { onError: (e) => toast.error(errorMessage(e)) })}>Dismiss</Button>
        {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
        {editing ? (
          <Button size="sm" disabled={accept.isPending || !usable} onClick={() => record({ accountId, categoryId: categoryId || null, payee: payee.trim() || null, occurredOn: date })}>Record</Button>
        ) : (
          <Button size="sm" disabled={accept.isPending || !usable} onClick={() => record({ accountId })}>Record</Button>
        )}
      </div>
    </li>
  );
}
