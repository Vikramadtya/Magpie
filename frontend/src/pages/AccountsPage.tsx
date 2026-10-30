import { Banknote, CreditCard, Landmark, Pencil, PiggyBank, Plus, Share2, Trash2, TrendingUp, Wallet, X, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Account, AccountType } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from '../hooks/useReference';
import { useLend, useRevokeShare, useShares } from '../hooks/useLending';
import { CURRENCIES, parseSignedMoney, toInputValue } from '../lib/money';

const TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Checking', SAVINGS: 'Savings', CREDIT_CARD: 'Credit card', CASH: 'Cash', LOAN: 'Loan', INVESTMENT: 'Investment', OTHER: 'Other',
};

const TYPE_ICONS: Record<AccountType, LucideIcon> = {
  CHECKING: Landmark, SAVINGS: PiggyBank, CREDIT_CARD: CreditCard, CASH: Wallet, LOAN: Banknote, INVESTMENT: TrendingUp, OTHER: Wallet,
};

export default function AccountsPage() {
  const { canEdit, baseCurrency } = useWorkspace();
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [sharing, setSharing] = useState<Account | null>(null);
  const remove = useDeleteAccount();
  const navigate = useNavigate();
  const list = accounts.data ?? [];

  const groups = (Object.keys(TYPE_LABELS) as AccountType[])
    .map((t) => ({ type: t, items: list.filter((a) => a.type === t) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Where your money lives"
        actions={canEdit && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4 mr-2" />New account</Button>}
      />
      <StateView
        isLoading={accounts.isLoading}
        error={accounts.error}
        onRetry={() => void accounts.refetch()}
        isEmpty={list.length === 0}
        emptyTitle="No accounts yet"
        emptyHint="Add a bank account, card or wallet to begin."
        emptyAction={canEdit && <Button onClick={() => setEditing('new')}>Add account</Button>}
      >
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.type}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">{TYPE_LABELS[g.type]}</h2>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((a) => (
                  <li key={a.id} className="glass-panel p-5 group">
                    <button className="w-full text-left" onClick={() => navigate(`/transactions?account=${a.id}`)}>
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">{(() => { const Icon = TYPE_ICONS[a.type]; return <Icon className="w-[18px] h-[18px]" />; })()}</span>
                        <p className="font-medium truncate flex-1">{a.name}</p>
                        <span className="text-[11px] font-medium text-secondary border border-border rounded-full px-2 py-0.5">{a.currency}</span>
                      </div>
                      <p className="text-[26px] leading-tight font-semibold mt-4 tabular-nums tracking-[-0.025em]"><Amount minor={a.balanceMinor} currency={a.currency} /></p>
                      {a.memo && <p className="text-[11px] text-accent mt-0.5">{a.shareStatus === 'ACTIVE' ? 'Lent to you · not in your net worth' : 'No longer shared with you'}</p>}
                      {a.currency !== baseCurrency && <p className="text-xs text-secondary mt-1">Converted to {baseCurrency} in reports</p>}
                    </button>
                    {canEdit && (
                      <div className="flex gap-1 mt-3 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {!a.memo && <Button variant="ghost" size="sm" onClick={() => setSharing(a)}><Share2 className="w-3.5 h-3.5 mr-1.5" />Lend</Button>}
                        <Button variant="ghost" size="sm" onClick={() => setEditing(a)}><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(a)}><Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete</Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </StateView>

      {sharing && <LendModal account={sharing} onClose={() => setSharing(null)} />}
      {editing && <AccountModal account={editing === 'new' ? null : editing} defaultCurrency={baseCurrency} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'account'}?`}
        message="Accounts that have transactions are archived instead, so your history stays intact."
        confirmLabel="Delete"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) remove.mutate(deleting.id); setDeleting(null); }}
      />
    </>
  );
}

function AccountModal({ account, defaultCurrency, onClose }: { account: Account | null; defaultCurrency: string; onClose: () => void }) {
  const create = useCreateAccount();
  const update = useUpdateAccount();
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'CHECKING');
  const [currency, setCurrency] = useState(account?.currency ?? defaultCurrency);
  const [opening, setOpening] = useState(account ? toInputValue(account.openingBalanceMinor, account.currency) : '');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const openingMinor = opening === '' ? 0 : parseSignedMoney(opening, currency);
    if (!name.trim()) return setError('Give the account a name');
    if (openingMinor === null) return setError('Opening balance is not a valid amount');
    const done = { onSuccess: onClose };
    if (account) update.mutate({ id: account.id, body: { name: name.trim(), type, openingBalanceMinor: openingMinor } }, done);
    else create.mutate({ name: name.trim(), type, currency, openingBalanceMinor: openingMinor }, done);
  };

  return (
    <Modal isOpen onClose={onClose} title={account ? 'Edit account' : 'New account'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" error={error}><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Currency" hint={account ? 'Cannot be changed' : undefined}>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!!account}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Opening balance" hint="Credit cards and loans: use a negative balance if you owe money.">
          <Input
            inputMode="decimal"
            value={opening}
            onChange={(e) => /^-?\d*\.?\d*$/.test(e.target.value) && setOpening(e.target.value)}
            placeholder="0.00"
            aria-label="Opening balance"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending || update.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function LendModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const shares = useShares(account.id);
  const lend = useLend(account.id);
  const revoke = useRevokeShare(account.id);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    lend.mutate(email.trim(), {
      onSuccess: () => setEmail(''),
      onError: () => setError('Could not share with that email. Is it already shared?'),
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={`Lend ${account.name}`}>
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Invite someone who uses Keeper. They get a copy of this account in their own ledger. What they spend on it appears in yours as spending by them, and in theirs as their own. They never see your balance or your other transactions.
        </p>
        <ul className="divide-y divide-border">
          {(shares.data ?? []).map((s) => (
            <li key={s.id} className="py-2 flex items-center justify-between text-sm">
              <span>{s.guestName ?? s.guestEmail} <span className="text-xs text-secondary">· {s.status === 'ACTIVE' ? 'active' : 'waiting for them to accept'}</span></span>
              <button aria-label={`Stop sharing with ${s.guestEmail}`} onClick={() => revoke.mutate(s.id)}><X className="w-4 h-4" /></button>
            </li>
          ))}
          {shares.data?.length === 0 && <li className="py-2 text-sm text-secondary">Not shared with anyone.</li>}
        </ul>
        <form onSubmit={submit} className="flex gap-2">
          <Field label="" error={error}><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their@email.com" aria-label="Their email" maxLength={255} /></Field>
          <Button type="submit" disabled={lend.isPending || !email.trim()}>Invite</Button>
        </form>
      </div>
    </Modal>
  );
}
