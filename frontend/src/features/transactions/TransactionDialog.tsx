import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { toast } from 'sonner';
import { payeesApi } from '../../api/endpoints';
import type { Category, Transaction, TxType } from '../../api/types';
import { useAuth, useWorkspace } from '../../auth/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Select } from '../../components/ui/Select';
import { today } from '../../lib/dates';
import { errorMessage } from '../../lib/http';
import { CURRENCIES, formatMoney, parseMoney, toInputValue } from '../../lib/money';
import { cn } from '../../lib/cn';
import { qk } from '../../hooks/keys';
import { useAccounts, useCategories, usePayees, useTags } from '../../hooks/useReference';
import { useCreateTransaction, useSetNormalised, useShareTransaction, useTransfer, useUpdateTransaction } from '../../hooks/useTransactions';
import { useFxQuote } from '../../hooks/useInsights';
import { useQueryClient } from '@tanstack/react-query';

interface DialogApi {
  open: (tx?: Transaction | null, preset?: Partial<{ type: TxType; accountId: string }>) => void;
}
const DialogContext = createContext<DialogApi | null>(null);

export function useTransactionDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useTransactionDialog needs TransactionDialogProvider');
  return ctx;
}

export function TransactionDialogProvider({ children }: { children: ReactNode }) {
  const { canEdit, kind } = useWorkspace();
  const [state, setState] = useState<{ tx: Transaction | null; preset?: { type?: TxType; accountId?: string } } | null>(null);
  const open = useCallback<DialogApi['open']>(
    (tx, preset) => {
      if (!canEdit) {
        return toast.info(
          kind === 'SHARED'
            ? 'A shared ledger is view-only. Record the expense in your own ledger and share it there.'
            : 'You have view-only access to this workspace',
        );
      }
      setState({ tx: tx ?? null, preset });
    },
    [canEdit],
  );
  const api = useMemo(() => ({ open }), [open]);
  return (
    <DialogContext.Provider value={api}>
      {children}
      {state && <TransactionForm tx={state.tx} preset={state.preset} onClose={() => setState(null)} />}
    </DialogContext.Provider>
  );
}

const LAST_ACCOUNT = 'keeper.lastAccount';
const readLast = () => {
  try {
    return localStorage.getItem(LAST_ACCOUNT) ?? '';
  } catch {
    return '';
  }
};

interface FormProps {
  tx: Transaction | null;
  preset?: { type?: TxType; accountId?: string };
  onClose: () => void;
}

function TransactionForm({ tx, preset, onClose }: FormProps) {
  const { id: ws } = useWorkspace();
  const qc = useQueryClient();
  const accounts = (useAccounts().data ?? []).filter((a) => !a.archived);
  const categories = useCategories().data ?? [];
  const payees = usePayees().data ?? [];
  const tags = useTags().data ?? [];
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const transfer = useTransfer();
  const share = useShareTransaction();
  const { workspaces, workspace } = useAuth();
  // a personal ledger can share an expense to any shared ledger it belongs to
  const households = workspace?.kind === 'PERSONAL' ? workspaces.filter((w) => w.kind === 'SHARED' && w.role !== 'VIEWER') : [];
  const [householdId, setHouseholdId] = useState('');

  const editing = tx !== null;
  const isTransferLeg = tx?.type === 'TRANSFER';
  const [type, setType] = useState<TxType>(tx?.type ?? preset?.type ?? 'EXPENSE');
  const [accountId, setAccountId] = useState(tx?.accountId ?? preset?.accountId ?? readLast());
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [destAmount, setDestAmount] = useState('');
  // '' means "the account's currency"; picking another currency converts server-side.
  const [entryCurrency, setEntryCurrency] = useState(tx?.origCurrency ?? '');
  const [accountAmount, setAccountAmount] = useState('');
  const [accountAmountTouched, setAccountAmountTouched] = useState(!!tx?.origCurrency);
  const [destTouched, setDestTouched] = useState(false);
  const [date, setDate] = useState(tx?.occurredOn ?? today());
  const [categoryId, setCategoryId] = useState(tx?.categoryId ?? '');
  const [payeeName, setPayeeName] = useState(tx?.payeeName ?? '');
  const [note, setNote] = useState(tx?.note ?? '');
  const [tagIds, setTagIds] = useState<string[]>(tx?.tagIds ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // One key per dialog session: a retried submit can never create a duplicate.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const accountCurrency = account?.currency ?? tx?.currency ?? 'USD';
  const currency = type === 'TRANSFER' ? accountCurrency : entryCurrency || accountCurrency;
  const foreign = type !== 'TRANSFER' && currency !== accountCurrency;
  const crossCurrency = type === 'TRANSFER' && !!toAccount && !!account && toAccount.currency !== account.currency;
  const typedMinor = parseMoney(amount, currency);
  const quote = useFxQuote(foreign ? typedMinor : null, currency, accountCurrency);
  const transferQuote = useFxQuote(crossCurrency ? typedMinor : null, accountCurrency, toAccount?.currency ?? accountCurrency);
  const currencyOptions = [...new Set([accountCurrency, ...CURRENCIES, currency])];

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    if (!tx) return;
    if (tx.origCurrency && tx.origAmountMinor) {
      setAmount(toInputValue(tx.origAmountMinor, tx.origCurrency));
      setAccountAmount(toInputValue(tx.amountMinor, tx.currency));
    } else {
      setAmount(toInputValue(tx.amountMinor, tx.currency));
    }
  }, [tx]);

  // Prefill the converted amounts from the server's rates until the user types their own.
  const convertedForAccount = quote.data?.convertedMinor;
  useEffect(() => {
    if (foreign && !accountAmountTouched && convertedForAccount != null) {
      setAccountAmount(toInputValue(convertedForAccount, accountCurrency));
    }
  }, [foreign, accountAmountTouched, convertedForAccount, accountCurrency]);

  const convertedForTransfer = transferQuote.data?.convertedMinor;
  useEffect(() => {
    if (crossCurrency && !destTouched && convertedForTransfer != null) {
      setDestAmount(toInputValue(convertedForTransfer, toAccount!.currency));
    }
  }, [crossCurrency, destTouched, convertedForTransfer, toAccount]);

  const kind = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const categoryOptions = useMemo(() => groupCategories(categories, kind), [categories, kind]);

  const onPayeeChange = (name: string) => {
    setPayeeName(name);
    const known = payees.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    if (known?.defaultCategoryId && !categoryId) setCategoryId(known.defaultCategoryId);
  };

  const submit = async (e: FormEvent, addAnother = false) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const amountMinor = parseMoney(amount, currency);
    if (!amountMinor || amountMinor <= 0) next.amount = 'Enter an amount greater than zero';
    if (!accountId) next.account = 'Choose an account';
    if (type === 'TRANSFER' && !editing) {
      if (!toAccountId) next.toAccount = 'Choose a destination';
      else if (toAccountId === accountId) next.toAccount = 'Pick a different account';
    }
    const accountMinor = foreign && accountAmount ? parseMoney(accountAmount, accountCurrency) : null;
    if (foreign && !accountMinor && quote.data?.available === false) next.accountAmount = `No rate available: enter the amount in ${accountCurrency}`;
    const destMinor = crossCurrency ? parseMoney(destAmount, toAccount!.currency) : null;
    if (crossCurrency && (!destMinor || destMinor <= 0)) next.destAmount = 'Enter the received amount';
    if (!date) next.date = 'Pick a date';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      localStorage.setItem(LAST_ACCOUNT, accountId);
    } catch {
      /* ignore */
    }
    try {
      if (type === 'TRANSFER' && !editing) {
        await transfer.mutateAsync({
          key: idempotencyKey,
          input: { fromAccountId: accountId, toAccountId, amountMinor: amountMinor!, destAmountMinor: destMinor, occurredOn: date, note: note || null },
        });
      } else {
        let payeeId: string | null = null;
        if (payeeName.trim() && !isTransferLeg) {
          const known = payees.find((p) => p.name.toLowerCase() === payeeName.trim().toLowerCase());
          payeeId = known?.id ?? (await payeesApi.create(ws, payeeName.trim())).id;
          if (!known) void qc.invalidateQueries({ queryKey: qk.payees(ws) });
        }
        const input = {
          accountId, type: (type === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE', amountMinor: amountMinor!,
          occurredOn: date, categoryId: categoryId || null, payeeId, note: note || null, tagIds,
          currency: foreign ? currency : undefined, accountAmountMinor: foreign ? accountMinor : null,
        };
        if (editing) await update.mutateAsync({ tx: tx!, input });
        else if (householdId && type === 'EXPENSE') {
          const created = await create.mutateAsync({ input, key: idempotencyKey });
          await share.mutateAsync({ id: created.id, householdId });
        } else create.mutate({ input, key: idempotencyKey }); // optimistic: don't wait for the server
      }
      if (addAnother && !editing) {
        setAmount('');
        setNote('');
        setDestAmount('');
        setIdempotencyKey(crypto.randomUUID());
        toast.success('Saved');
      } else {
        onClose();
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const selectedTags = new Set(tagIds);

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Edit transaction' : 'Add transaction'}>
      <form onSubmit={(e) => submit(e)} className="space-y-4" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && void submit(e as unknown as FormEvent)}>
        {!editing && (
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/10" role="tablist">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={type === t}
                onClick={() => {
                  setType(t);
                  setCategoryId('');
                }}
                className={cn('py-1.5 text-sm font-medium rounded-md transition-colors', type === t ? 'bg-surface shadow-sm' : 'text-secondary')}
              >
                {t[0] + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" error={errors.amount}>
            <div className="flex gap-2">
              <MoneyInput autoFocus value={amount} currency={currency} onChange={(v) => { setAmount(v); }} disabled={isTransferLeg} aria-label="Amount" />
              {type !== 'TRANSFER' && (
                <Select
                  className="w-24 shrink-0"
                  value={currency}
                  aria-label="Currency"
                  disabled={isTransferLeg}
                  onChange={(e) => { setEntryCurrency(e.target.value === accountCurrency ? '' : e.target.value); setAccountAmountTouched(false); setAccountAmount(''); }}
                >
                  {currencyOptions.map((c) => <option key={c}>{c}</option>)}
                </Select>
              )}
            </div>
          </Field>
          <Field label="Date" error={errors.date}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label={type === 'TRANSFER' ? 'From account' : 'Account'} error={errors.account}>
          <Select value={accountId} onChange={(e) => { setAccountId(e.target.value); setEntryCurrency(''); setAccountAmountTouched(false); setAccountAmount(''); }} disabled={isTransferLeg}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
            ))}
          </Select>
        </Field>

        {foreign && (
          <Field
            label={`Charged to account (${accountCurrency})`}
            error={errors.accountAmount}
            hint={quote.data?.available && quote.data.rate ? `Rate: 1 ${currency} = ${quote.data.rate.toFixed(4)} ${accountCurrency}. Edit if your bank charged differently.` : quote.isFetching ? 'Getting rate…' : undefined}
          >
            <MoneyInput value={accountAmount} currency={accountCurrency} onChange={(v) => { setAccountAmount(v); setAccountAmountTouched(true); }} aria-label="Amount charged to account" />
          </Field>
        )}

        {type === 'TRANSFER' && !editing && (
          <>
            <Field label="To account" error={errors.toAccount}>
              <Select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                <option value="">Select…</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </Select>
            </Field>
            {crossCurrency && (
              <Field label={`Amount received (${toAccount!.currency})`} error={errors.destAmount}>
                <MoneyInput value={destAmount} currency={toAccount!.currency} onChange={(v) => { setDestAmount(v); setDestTouched(true); }} />
              </Field>
            )}
          </>
        )}

        {type !== 'TRANSFER' && (
          <>
            <Field label="Payee">
              <Input list="payee-options" value={payeeName} onChange={(e) => onPayeeChange(e.target.value)} placeholder="Who was it?" maxLength={160} />
              <datalist id="payee-options">
                {payees.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </Field>
            <Field label="Category">
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categoryOptions.map((g) => (
                  <optgroup key={g.parent.id} label={`${g.parent.icon ?? ''} ${g.parent.name}`.trim()}>
                    <option value={g.parent.id}>{g.parent.name}</option>
                    {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            {tags.length > 0 && (
              <Field label="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      aria-pressed={selectedTags.has(t.id)}
                      onClick={() => setTagIds(selectedTags.has(t.id) ? tagIds.filter((x) => x !== t.id) : [...tagIds, t.id])}
                      className={cn('px-2.5 py-1 rounded-full text-xs border', selectedTags.has(t.id) ? 'bg-accent text-white border-accent' : 'border-border text-secondary')}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {editing && tx && <NormalisedBox tx={tx} />}

        {!editing && type === 'EXPENSE' && households.length > 0 && (
          <Field label="Also share to" hint="Records a linked copy in that shared ledger (a trip, a flat…), credited to you.">
            <Select value={householdId} onChange={(e) => setHouseholdId(e.target.value)}>
              <option value="">Just me</option>
              {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
        )}

        <Field label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" maxLength={1000} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {!editing && <Button type="button" variant="secondary" disabled={saving} onClick={(e) => submit(e as unknown as FormEvent, true)}>Save & add another</Button>}
          <Button type="submit" disabled={saving}>{editing ? 'Save changes' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Parents with their children, for one kind (income/expense). */
export function groupCategories(all: Category[], kind: 'INCOME' | 'EXPENSE') {
  const ofKind = all.filter((c) => c.kind === kind);
  return ofKind
    .filter((c) => !c.parentId)
    .map((parent) => ({ parent, children: ofKind.filter((c) => c.parentId === parent.id) }));
}

/**
 * Reports count each transaction in the workspace's base currency at the rate of the day it
 * happened. This shows that value and lets the user set their own (or go back to the day's rate).
 */
function NormalisedBox({ tx }: { tx: Transaction }) {
  const { baseCurrency } = useWorkspace();
  const setNormalised = useSetNormalised();
  const [value, setValue] = useState(tx.baseAmountMinor != null ? toInputValue(tx.baseAmountMinor, baseCurrency) : '');
  const [overridden, setOverridden] = useState(tx.baseOverridden);
  const [rate, setRate] = useState(tx.baseFxRate);
  if (tx.type === 'TRANSFER' || tx.loanId || tx.currency === baseCurrency) return null;

  const apply = (minor: number | null) =>
    setNormalised.mutate(
      { id: tx.id, baseAmountMinor: minor },
      {
        onSuccess: (updated) => {
          setValue(updated.baseAmountMinor != null ? toInputValue(updated.baseAmountMinor, baseCurrency) : '');
          setOverridden(updated.baseOverridden);
          setRate(updated.baseFxRate);
          toast.success(minor === null ? "Back to that day's rate" : 'Value updated');
        },
      },
    );

  const parsed = parseMoney(value, baseCurrency);
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <p className="text-sm font-medium">Counted in reports as ({baseCurrency})</p>
      <p className="text-xs text-secondary">
        {tx.baseAmountMinor == null
          ? `No exchange rate was available for ${tx.occurredOn}. Enter a value to include it.`
          : `${formatMoney(tx.baseAmountMinor, baseCurrency)} at ${rate?.toFixed(4)} on ${tx.occurredOn}${overridden ? ' (set by you)' : ''}`}
      </p>
      <div className="flex gap-2">
        <MoneyInput value={value} currency={baseCurrency} onChange={setValue} aria-label={`Value in ${baseCurrency}`} />
        <Button type="button" variant="secondary" disabled={!parsed || setNormalised.isPending} onClick={() => parsed && apply(parsed)}>Set</Button>
        {overridden && <Button type="button" variant="outline" disabled={setNormalised.isPending} onClick={() => apply(null)}>Reset</Button>}
      </div>
    </div>
  );
}
