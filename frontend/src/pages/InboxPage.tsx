import { Plane } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Account, InboxItem } from '../api/types';
import { Amount } from '../components/ui/Amount';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { Field } from '../components/ui/Field';
import { MoneyInput } from '../components/ui/MoneyInput';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Skeleton, StateView } from '../components/ui/StateView';
import { groupCategories } from '../features/transactions/TransactionDialog';
import { useFxQuote } from '../hooks/useInsights';
import { useAcceptItem, useApplyUpdate, useDismissItem, useInbox, useKeepItem, useRemoveRecords } from '../hooks/useInbox';
import { useAccounts, useCategories } from '../hooks/useReference';
import { useTrips } from '../hooks/useTrips';
import { cn } from '../lib/cn';
import { prettyDate } from '../lib/dates';
import { formatMoney, parseMoney, toInputValue } from '../lib/money';

type Tab = 'todo' | 'done';

export default function InboxPage() {
  const [tab, setTab] = useState<Tab>('todo');
  const inbox = useInbox(tab);
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived && !a.name.startsWith('Owed to friends'));
  const items = inbox.data ?? [];

  return (
    <>
      <PageHeader title="To review" subtitle="Group expenses and settlements from your expense-split app, waiting to be recorded in your ledger" />
      <Segmented className="mb-6" value={tab} onChange={setTab} options={[['todo', 'To review'], ['done', 'Recorded']] as const} />
      <StateView
        isLoading={inbox.isLoading}
        error={inbox.error}
        onRetry={() => void inbox.refetch()}
        isEmpty={items.length === 0}
        emptyTitle={tab === 'todo' ? 'Nothing to review' : 'Nothing recorded yet'}
        emptyHint={tab === 'todo' ? 'Group expenses you enter in the split app show up here. Connect the app in Settings if you have not yet.' : undefined}
        emptyAction={tab === 'todo' ? <Link to="/settings"><Button variant="outline">Connect the app</Button></Link> : undefined}
        skeleton={<Skeleton className="h-28" />}
      >
        <ul className="space-y-4">
          {items.map((i) => (tab === 'done' ? <DoneRow key={i.id} item={i} /> : <ReviewCard key={i.id} item={i} accounts={accounts} />))}
        </ul>
      </StateView>
    </>
  );
}

function DoneRow({ item }: { item: InboxItem }) {
  return (
    <li className="glass-panel p-4 flex items-center gap-3 text-sm">
      <Avatar name={item.groupName ?? item.counterparty ?? item.title ?? 'S'} />
      <span className="flex-1 min-w-0">
        <span className="block font-medium truncate">{item.title ?? (item.kind === 'SETTLEMENT' ? `Settlement with ${item.counterparty}` : 'Shared expense')}</span>
        <span className="block text-xs text-secondary">{item.groupName ? `${item.groupName} · ` : ''}{prettyDate(item.occurredOn)}</span>
      </span>
      <span className="text-right tabular-nums"><span className="block font-semibold">{formatMoney(item.totalMinor, item.currency)}</span>{item.myShareMinor != null && item.kind === 'EXPENSE' && <span className="block text-xs text-secondary">your share {formatMoney(item.myShareMinor, item.currency)}</span>}</span>
    </li>
  );
}

const rememberKey = (i: InboxItem) => `keeper.splitAccount.${i.groupId ?? i.kind}`;
const remembered = (i: InboxItem) => {
  try {
    return localStorage.getItem(rememberKey(i)) ?? '';
  } catch {
    return '';
  }
};

function ReviewCard({ item, accounts }: { item: InboxItem; accounts: Account[] }) {
  const categories = useCategories().data ?? [];
  const trips = useTrips().data ?? [];
  const accept = useAcceptItem();
  const dismiss = useDismissItem();
  const applyUpdate = useApplyUpdate();
  const removeRecords = useRemoveRecords();
  const keep = useKeepItem();

  const needsAccount = item.kind === 'SETTLEMENT' || item.paidByMe === true;
  const [accountId, setAccountId] = useState(() => {
    const saved = remembered(item);
    return accounts.some((a) => a.id === saved) ? saved : item.accountId && accounts.some((a) => a.id === item.accountId) ? item.accountId : '';
  });
  const [categoryId, setCategoryId] = useState('');
  const [tripChoice, setTripChoice] = useState('auto'); // auto | none | <trip id>
  const [chargedText, setChargedText] = useState('');
  const [chargedTouched, setChargedTouched] = useState(false);

  const account = accounts.find((a) => a.id === accountId);
  const foreign = needsAccount && !!account && account.currency !== item.currency;
  const quote = useFxQuote(foreign ? item.totalMinor : null, item.currency, account?.currency ?? item.currency);
  useEffect(() => {
    if (foreign && !chargedTouched && quote.data?.convertedMinor != null && account) setChargedText(toInputValue(quote.data.convertedMinor, account.currency));
  }, [foreign, chargedTouched, quote.data, account]);

  const matchingTrip = useMemo(() => trips.find((t) => item.groupName && t.name.toLowerCase() === item.groupName.toLowerCase()), [trips, item.groupName]);
  const expenseGroups = groupCategories(categories, 'EXPENSE');
  const mine = item.myShareMinor ?? 0;
  const changed = item.status === 'CHANGED';
  const removed = item.status === 'REMOVED';

  const body = () => ({
    accountId: needsAccount ? accountId || null : null,
    categoryId: categoryId || null,
    tripId: tripChoice !== 'auto' && tripChoice !== 'none' ? tripChoice : null,
    noTrip: tripChoice === 'none',
    accountAmountMinor: foreign && chargedText ? parseMoney(chargedText, account!.currency) : null,
  });

  const save = (fn: 'accept' | 'update') => {
    if (needsAccount && !accountId) return;
    if (accountId) {
      try {
        localStorage.setItem(rememberKey(item), accountId);
      } catch {
        /* remembering the account is a convenience only */
      }
    }
    (fn === 'accept' ? accept : applyUpdate).mutate({ id: item.id, body: body() });
  };

  const others = item.shares.filter((s) => s.shareMinor > 0);
  const summary = (() => {
    if (item.kind === 'SETTLEMENT') {
      return item.direction === 'RECEIVED'
        ? `${item.counterparty} paid you ${formatMoney(item.totalMinor, item.currency)}. It will repay what they owe you; it is not income.`
        : `You paid ${item.counterparty} ${formatMoney(item.totalMinor, item.currency)}. It clears what you owe them; it is not spending.`;
    }
    if (item.paidByMe) {
      return `${account ? account.name : 'The account'} is charged ${formatMoney(item.totalMinor, item.currency)}. ${mine > 0 ? `Your share, ${formatMoney(mine, item.currency)}, counts as your spending. ` : ''}${others.length ? `${others.map((s) => `${s.name} owes you ${formatMoney(s.shareMinor, item.currency)}`).join(', ')}.` : ''}`;
    }
    return `A friend paid ${formatMoney(item.totalMinor, item.currency)}. Your share, ${formatMoney(mine, item.currency)}, counts as your spending and is owed to them until you settle (tracked on “Owed to friends”).`;
  })();

  return (
    <li className={cn('glass-panel p-5 space-y-4', (changed || removed) && 'border-amber-500/50')}>
      {(changed || removed) && (
        <p className="text-sm rounded-lg bg-amber-500/10 px-3 py-2">
          {removed ? 'This was deleted in the split app.' : 'This changed in the split app after you recorded it.'} Keeper still has the version you accepted.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.title ?? (item.kind === 'SETTLEMENT' ? `Settlement with ${item.counterparty}` : 'Shared expense')}</p>
          <p className="text-xs text-secondary mt-0.5 flex items-center gap-2">
            {prettyDate(item.occurredOn)}
            {item.groupName && <span className="inline-flex items-center gap-1 text-accent"><Plane className="w-3 h-3" />{item.groupName}</span>}
          </p>
        </div>
        <div className="text-right">
          <Amount minor={item.totalMinor} currency={item.currency} className="font-semibold" />
          {item.kind === 'EXPENSE' && <p className="text-xs text-secondary">your share {formatMoney(mine, item.currency)}</p>}
        </div>
      </div>

      {!removed && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {needsAccount && (
              <Field label={item.kind === 'SETTLEMENT' && item.direction === 'RECEIVED' ? 'Received into' : item.kind === 'SETTLEMENT' ? 'Paid from' : 'Paid with'}>
                <Select value={accountId} onChange={(e) => { setAccountId(e.target.value); setChargedTouched(false); }} aria-label="Account">
                  <option value="">Choose…</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                </Select>
              </Field>
            )}
            {foreign && account && (
              <Field label={`Charged to account (${account.currency})`} hint={quote.data?.rate ? `Rate ${quote.data.rate.toFixed(4)}. Edit if your bank charged differently.` : undefined}>
                <MoneyInput value={chargedText} currency={account.currency} onChange={(v) => { setChargedText(v); setChargedTouched(true); }} aria-label="Amount charged to account" />
              </Field>
            )}
            {item.kind === 'EXPENSE' && mine > 0 && (
              <Field label="Category (your share)">
                <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
                  <option value="">Uncategorized</option>
                  {expenseGroups.map((g) => <optgroup key={g.parent.id} label={g.parent.name}>{[g.parent, ...g.children].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
                </Select>
              </Field>
            )}
            {item.kind === 'EXPENSE' && item.groupName && (
              <Field label="Trip" hint={tripChoice === 'auto' ? (matchingTrip ? `Adds to your “${matchingTrip.name}” trip` : `Creates a trip “${item.groupName}”`) : undefined}>
                <Select value={tripChoice} onChange={(e) => setTripChoice(e.target.value)} aria-label="Trip">
                  <option value="auto">{matchingTrip ? matchingTrip.name : `New trip: ${item.groupName}`}</option>
                  {trips.filter((t) => t.id !== matchingTrip?.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value="none">No trip</option>
                </Select>
              </Field>
            )}
          </div>
          <p className="text-sm text-secondary">{summary}</p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {item.status === 'PENDING' && (
          <>
            <Button onClick={() => save('accept')} disabled={accept.isPending || (needsAccount && !accountId)}>Record</Button>
            <Button variant="ghost" onClick={() => dismiss.mutate(item.id)} disabled={dismiss.isPending}>Dismiss</Button>
          </>
        )}
        {changed && (
          <>
            <Button onClick={() => save('update')} disabled={applyUpdate.isPending || (needsAccount && !accountId)}>Update Keeper</Button>
            <Button variant="outline" onClick={() => keep.mutate(item.id)} disabled={keep.isPending}>Keep what I have</Button>
            <Button variant="ghost" onClick={() => removeRecords.mutate(item.id)} disabled={removeRecords.isPending}>Remove from Keeper</Button>
          </>
        )}
        {removed && (
          <>
            <Button onClick={() => removeRecords.mutate(item.id)} disabled={removeRecords.isPending}>Remove from Keeper</Button>
            <Button variant="outline" onClick={() => keep.mutate(item.id)} disabled={keep.isPending}>Keep it</Button>
          </>
        )}
      </div>
    </li>
  );
}
