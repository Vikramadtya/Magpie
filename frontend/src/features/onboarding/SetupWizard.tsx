import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { budgetsApi, sampleApi, workspaceApi } from '../../api/endpoints';
import type { AccountType } from '../../api/types';
import { useAuth, useWorkspace } from '../../auth/AuthProvider';
import logo from '../../assets/logo.svg';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Select } from '../../components/ui/Select';
import { useCategories, useCreateAccount } from '../../hooks/useReference';
import { monthKey } from '../../lib/dates';
import { errorMessage } from '../../lib/http';
import { formatMoney, CURRENCIES, parseMoney } from '../../lib/money';
import { cn } from '../../lib/cn';
import { useTransactionDialog } from '../transactions/TransactionDialog';

/** Share of take-home pay to suggest for each common category: a starting point, not advice. */
const SUGGESTED: [string, number][] = [
  ['Rent', 0.28], ['Housing', 0.28], ['Groceries', 0.12], ['Dining Out', 0.06], ['Public Transit', 0.05], ['Fuel', 0.04], ['Shopping', 0.07], ['Entertainment', 0.04], ['Health', 0.04],
];

const ACCOUNT_TYPES: [AccountType, string][] = [['CHECKING', 'Bank account'], ['SAVINGS', 'Savings'], ['CASH', 'Cash'], ['CREDIT_CARD', 'Credit card']];
const STEPS = ['Currency', 'Account', 'Budget', 'Done'];

/** Four short steps for an empty ledger, or a one-click tour with sample data. */
export function SetupWizard() {
  const ws = useWorkspace();
  const { reload } = useAuth();
  const qc = useQueryClient();
  const dialog = useTransactionDialog();
  const categories = useCategories().data ?? [];
  const createAccount = useCreateAccount();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [currency, setCurrency] = useState(ws.baseCurrency);
  const [accName, setAccName] = useState('Main account');
  const [accType, setAccType] = useState<AccountType>('CHECKING');
  const [balance, setBalance] = useState('');
  const [income, setIncome] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: ['ws', ws.id] });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const saveCurrency = () => run(async () => {
    if (currency !== ws.baseCurrency) {
      await workspaceApi.rename(ws.id, ws.name, currency);
      await reload();
    }
    setStep(1);
  });

  const saveAccount = (e: FormEvent) => {
    e.preventDefault();
    const minor = balance.trim() === '' ? 0 : parseMoney(balance, currency);
    if (!accName.trim() || minor === null) return toast.error('Check the name and balance');
    void run(async () => {
      await createAccount.mutateAsync({ name: accName.trim(), type: accType, currency, openingBalanceMinor: accType === 'CREDIT_CARD' ? -Math.abs(minor) : minor });
      setStep(2);
    });
  };

  const incomeMinor = parseMoney(income, currency) ?? 0;
  const proposals = SUGGESTED.flatMap(([name, share]) => {
    const c = categories.find((x) => x.kind === 'EXPENSE' && x.name.toLowerCase() === name.toLowerCase());
    return c && incomeMinor > 0 ? [{ id: c.id, name: c.name, minor: Math.round((incomeMinor * share) / 100) * 100 }] : [];
  });
  const unique = proposals.filter((p, i) => proposals.findIndex((q) => q.id === p.id) === i);

  const saveBudgets = () => run(async () => {
    const month = monthKey(new Date());
    const chosen = unique.filter((p) => picked[p.id] ?? true);
    await Promise.all(chosen.map((p) => budgetsApi.set(ws.id, p.id, month, p.minor, false, false)));
    await refresh();
    setStep(3);
  });

  const loadSample = () => run(async () => {
    await sampleApi.load(ws.id);
    await refresh();
    toast.success('Sample data added. Clear it any time from the Home page.');
  });

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-10">
      <div className="text-center mb-8">
        <img src={logo} alt="" className="w-14 h-14 rounded-2xl mx-auto mb-4 shadow-lift" />
        <h1 className="text-title">Welcome to Keeper</h1>
        <p className="text-body text-secondary mt-1.5">Three quick steps and you are ready to track.</p>
      </div>

      <ol className="flex items-center justify-center gap-2 mb-6" aria-label="Setup progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
            <span className={cn('w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center transition-colors', i < step ? 'bg-accent text-white' : i === step ? 'bg-accent/15 text-accent' : 'bg-primary/[0.06] text-secondary')}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className={cn('text-caption hidden sm:inline', i === step ? 'font-medium' : 'text-secondary')}>{label}</span>
            {i < STEPS.length - 1 && <span className="w-6 h-px bg-border" />}
          </li>
        ))}
      </ol>

      <section className="glass-panel p-6 sm:p-8 page-enter" key={step}>
        {step === 0 && (
          <div className="space-y-5">
            <div><h2>Which currency do you mostly use?</h2><p className="text-body text-secondary mt-1">Your totals and charts are shown in this. You can still add accounts in other currencies later.</p></div>
            <Field label="Main currency"><Select value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Button className="w-full" disabled={busy} onClick={() => void saveCurrency()}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
            <div className="pt-4 border-t border-border text-center">
              <p className="text-caption text-secondary mb-2">Just looking around?</p>
              <Button variant="outline" disabled={busy} onClick={() => void loadSample()}><Sparkles className="w-4 h-4 mr-2" />Fill with sample data</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={saveAccount} className="space-y-5">
            <div><h2>Add your first account</h2><p className="text-body text-secondary mt-1">Where your money sits today. You can add the rest later under Wealth.</p></div>
            <Field label="Name"><Input value={accName} onChange={(e) => setAccName(e.target.value)} maxLength={120} autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type"><Select value={accType} onChange={(e) => setAccType(e.target.value as AccountType)}>{ACCOUNT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
              <Field label={accType === 'CREDIT_CARD' ? `You owe (${currency})` : `Balance today (${currency})`}><MoneyInput value={balance} currency={currency} onChange={setBalance} /></Field>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div><h2>A starting budget</h2><p className="text-body text-secondary mt-1">Tell us roughly what you take home each month and we will suggest limits. Change them any time.</p></div>
            <Field label={`Monthly income (${currency})`}><MoneyInput value={income} currency={currency} onChange={setIncome} autoFocus /></Field>
            {unique.length > 0 && (
              <ul className="divide-y divide-border rounded-xl bg-primary/[0.03] px-4">
                {unique.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5 text-body">
                    <input type="checkbox" className="w-4 h-4" checked={picked[p.id] ?? true} onChange={(e) => setPicked({ ...picked, [p.id]: e.target.checked })} aria-label={`Budget for ${p.name}`} />
                    <span className="flex-1">{p.name}</span>
                    <span className="tabular-nums text-secondary">{formatMoney(p.minor, currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(3)}>Skip for now</Button>
              <Button className="flex-1" disabled={busy || unique.length === 0} onClick={() => void saveBudgets()}>Create budgets</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 text-green-600 flex items-center justify-center mx-auto saved-ring"><Check className="w-7 h-7" /></div>
            <div><h2>You are all set</h2><p className="text-body text-secondary mt-1">Add what you spent today, or head to your Home page.</p></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="flex-1" onClick={() => { void refresh(); dialog.open(); }}>Add a transaction</Button>
              <Button variant="outline" className="flex-1" onClick={() => void refresh()}>Go to Home</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
