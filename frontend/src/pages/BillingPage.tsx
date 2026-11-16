import { Check, Lock, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import type { Billing } from '../api/types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Segmented } from '../components/ui/Segmented';
import { StateView } from '../components/ui/StateView';
import { useBilling, useCheckout, useQuote, useRedeem } from '../hooks/useBilling';
import { cn } from '../lib/cn';
import { errorMessage } from '../lib/http';
import { formatMoney } from '../lib/money';

const SOURCE: Record<string, string> = {
  OPEN: 'Plan limits are not switched on yet, so you have full access.',
  SUBSCRIPTION: 'Your subscription is active.',
  CODE: 'Full access from an access code.',
  ADMIN: 'Full access, given to you directly.',
  GRANDFATHER: 'Full access as an early user.',
};

const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export default function BillingPage() {
  const q = useBilling();
  const b = q.data;
  return (
    <>
      <PageHeader title="Plan & billing" subtitle="What your plan includes, what you have used, and how to upgrade." />
      <StateView isLoading={q.isLoading} error={q.error} onRetry={() => void q.refetch()}>
        {b && (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 [&>*]:min-w-0">
            <div className="space-y-6">
              <PlanCard b={b} />
              <Usage b={b} />
              <Compare b={b} />
            </div>
            <div className="space-y-6">
              <Upgrade b={b} />
              <Redeem />
            </div>
          </div>
        )}
      </StateView>
    </>
  );
}

function PlanCard({ b }: { b: Billing }) {
  const pro = b.plan === 'PRO';
  return (
    <section className={cn('p-6 rounded-[20px]', pro ? 'hero-card' : 'glass-panel')}>
      <div className="flex items-center gap-3">
        <h2 className={cn(pro && 'text-white')}>{pro ? 'Pro' : 'Free'} plan</h2>
        <Badge tone={pro ? 'good' : undefined}>{pro ? 'Active' : 'Current plan'}</Badge>
      </div>
      <p className={cn('text-body mt-2', pro ? 'text-white/75' : 'text-secondary')}>
        {pro ? SOURCE[b.source] ?? 'You have full access.' : 'You are on the Free plan, with the limits below. Everything you have recorded stays yours.'}
      </p>
      {pro && b.proUntil && (
        <p className="text-body text-white mt-3">Access until <strong>{new Date(b.proUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</strong> · {daysLeft(b.proUntil)} days left</p>
      )}
    </section>
  );
}

function Usage({ b }: { b: Billing }) {
  const rows: [string, number, number | null][] = [
    ['Accounts', b.usage.accounts, b.limits.accounts],
    ['Budgets this month', b.usage.budgets, b.limits.budgets],
    ['Goals', b.usage.goals, b.limits.goals],
    ['Investments', b.usage.holdings, b.limits.holdings],
    ['Transactions this month', b.usage.transactionsThisMonth, b.limits.transactionsPerMonth],
  ];
  return (
    <section className="glass-panel p-6">
      <h2>What you have used</h2>
      <p className="text-caption text-secondary mt-0.5 mb-4">{b.plan === 'PRO' ? 'Pro has no limits on these.' : 'The Free plan allows this much of each.'}</p>
      <ul className="space-y-4">
        {rows.map(([label, used, limit]) => (
          <li key={label}>
            <div className="flex justify-between text-body mb-1.5"><span>{label}</span><span className="tabular-nums text-secondary">{used}{limit !== null && b.plan !== 'PRO' ? ` of ${limit}` : ''}</span></div>
            {limit !== null && b.plan !== 'PRO' && <ProgressBar value={Math.min(100, (used / limit) * 100)} label={label} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Compare({ b }: { b: Billing }) {
  const l = b.limits;
  const rows: [string, string, string][] = [
    ['Accounts', String(l.accounts ?? '∞'), 'Unlimited'],
    ['Budgets and goals', `${l.budgets} budgets, ${l.goals} goal`, 'Unlimited'],
    ['Transactions a month', String(l.transactionsPerMonth ?? '∞'), 'Unlimited'],
    ['Charts and history', `${l.historyMonths} months`, 'Everything, all years'],
    ['Investments', `${l.holdings} holdings, prices by hand`, 'Unlimited, live prices and history'],
    ['Import a bank file', '', '✓'],
    ['Weekly digest and Discord', '', '✓'],
    ['Household sharing', '', '✓'],
  ];
  return (
    <section className="glass-panel p-6">
      <h2 className="mb-4">Free and Pro</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead className="text-left text-caption text-secondary"><tr><th className="py-2 font-medium" /><th className="py-2 font-medium">Free</th><th className="py-2 font-medium text-accent">Pro</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map(([name, free, pro]) => (
              <tr key={name}>
                <td className="py-2.5 pr-3">{name}</td>
                <td className="py-2.5 pr-3 text-secondary">{free || <Lock className="w-4 h-4" aria-label="Not included" />}</td>
                <td className="py-2.5 font-medium">{pro === '✓' ? <Check className="w-4 h-4 text-green-600" aria-label="Included" /> : pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Upgrade({ b }: { b: Billing }) {
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [code, setCode] = useState('');
  const quote = useQuote();
  const checkout = useCheckout();
  const price = interval === 'YEARLY' ? b.prices.yearlyMinor : b.prices.monthlyMinor;
  const q = quote.data && quote.data.interval === interval ? quote.data : null;
  const saving = Math.round((1 - b.prices.yearlyMinor / (b.prices.monthlyMinor * 12)) * 100);

  const apply = (e: FormEvent) => {
    e.preventDefault();
    quote.mutate({ interval, code: code.trim() }, { onError: (err) => toast.error(errorMessage(err)) });
  };
  const pay = () =>
    checkout.mutate({ interval, code: q?.code ?? undefined }, {
      onSuccess: (s) => { window.location.assign(s.url); },
      onError: (err) => toast.error(errorMessage(err)),
    });

  return (
    <section className="glass-panel p-6 space-y-4">
      <div><h2 className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" />Upgrade to Pro</h2><p className="text-caption text-secondary mt-0.5">Every feature, no limits.</p></div>
      <Segmented value={interval} onChange={(v) => { setInterval(v); quote.reset(); }} options={[['MONTHLY', 'Monthly'], ['YEARLY', saving > 0 ? `Yearly · save ${saving}%` : 'Yearly']] as const} />
      <div>
        <p className="text-display tabular-nums">{formatMoney(q ? q.firstPaymentMinor : price, b.prices.currency)}</p>
        <p className="text-caption text-secondary">{interval === 'YEARLY' ? 'per year' : 'per month'}{q && q.discountMinor > 0 && <> · <s>{formatMoney(q.baseMinor, b.prices.currency)}</s></>}</p>
        {q?.note && <p className="text-body text-green-600 dark:text-green-400 mt-1.5">{q.code} applied. {q.note}</p>}
      </div>
      <form onSubmit={apply} className="flex gap-2 items-end">
        <Field label="Discount code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter a code" autoComplete="off" maxLength={60} /></Field>
        <Button type="submit" variant="outline" disabled={!code.trim() || quote.isPending}>Apply</Button>
      </form>
      <Button className="w-full" disabled={checkout.isPending || b.plan === 'PRO' && b.source === 'SUBSCRIPTION'} onClick={pay}>Continue to payment</Button>
      {!b.paymentsOpen && <p className="text-caption text-secondary">Online payment is not open yet. If you have an access code, redeem it below.</p>}
    </section>
  );
}

function Redeem() {
  const [code, setCode] = useState('');
  const redeem = useRedeem();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    redeem.mutate(code.trim(), {
      onSuccess: ({ redeemed }) => { setCode(''); toast.success(`${redeemed.days} days of Pro added, until ${new Date(redeemed.accessUntil).toLocaleDateString()}`); },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };
  return (
    <section className="glass-panel p-6">
      <h2>Have an access code?</h2>
      <p className="text-caption text-secondary mt-0.5 mb-4">Access codes give free time on Pro. Time you already have is kept, and the new days are added on top.</p>
      <form onSubmit={submit} className="flex gap-2 items-end">
        <Field label="Access code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX" autoComplete="off" maxLength={60} /></Field>
        <Button type="submit" disabled={!code.trim() || redeem.isPending}>Redeem</Button>
      </form>
    </section>
  );
}
