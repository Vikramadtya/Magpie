import { Copy, Power } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { CodeInput, PlanCode } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { IconButton } from '../components/ui/IconButton';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Segmented } from '../components/ui/Segmented';
import { Select } from '../components/ui/Select';
import { StateView } from '../components/ui/StateView';
import { useAdminCodes, useCodeMutations, useCodeRedemptions } from '../hooks/useBilling';
import { cn } from '../lib/cn';
import { errorMessage } from '../lib/http';

const STATUS: Record<PlanCode['status'], [string, 'good' | 'bad' | 'accent' | undefined]> = {
  ACTIVE: ['Active', 'good'], SCHEDULED: ['Starts later', 'accent'], EXPIRED: ['Expired', 'bad'], USED_UP: ['Used up', 'bad'], OFF: ['Switched off', undefined],
};

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null);

function describe(c: PlanCode): string {
  if (c.kind === 'ACCESS') return `${c.accessDays} days of Pro`;
  const off = c.discountPercent ? `${c.discountPercent}% off` : `${((c.discountMinor ?? 0) / 100).toLocaleString()} off`;
  const when = c.discountCycles === null ? 'every payment' : c.discountCycles === 1 ? 'the first payment' : `the first ${c.discountCycles} payments`;
  return `${off}, ${when}`;
}

export default function AdminCodesPage() {
  const { isAdmin } = useAuth();
  const codes = useAdminCodes();
  if (!isAdmin) return <Navigate to="/settings" replace />;
  return (
    <>
      <PageHeader title="Codes and access" subtitle="Access codes give free Pro time. Discount codes take money off a paid plan." />
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6 [&>*]:min-w-0">
        <div className="space-y-6">
          <CreateCode />
          <GrantAccess />
        </div>
        <StateView isLoading={codes.isLoading} error={codes.error} onRetry={() => void codes.refetch()} isEmpty={(codes.data ?? []).length === 0} emptyTitle="No codes yet" emptyHint="Create one on the left.">
          <ul className="space-y-3">{(codes.data ?? []).map((c) => <CodeRow key={c.id} c={c} />)}</ul>
        </StateView>
      </div>
    </>
  );
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function CreateCode() {
  const { create } = useCodeMutations();
  const [kind, setKind] = useState<'ACCESS' | 'DISCOUNT'>('ACCESS');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState('30');
  const [type, setType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [value, setValue] = useState('20');
  const [cycles, setCycles] = useState('1');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [max, setMax] = useState('');
  const [perUser, setPerUser] = useState('1');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body: CodeInput = {
      kind, code: code.trim() || undefined, description: description.trim() || undefined,
      startsAt: toIso(from), expiresAt: toIso(until), maxRedemptions: max ? Number(max) : null, perUserLimit: Number(perUser) || 1,
    };
    if (kind === 'ACCESS') body.accessDays = Number(days);
    else {
      if (type === 'PERCENT') body.discountPercent = Number(value);
      else body.discountMinor = Math.round(Number(value) * 100);
      body.discountCycles = cycles === 'ALL' ? null : Number(cycles);
    }
    create.mutate(body, {
      onSuccess: (made) => { setCode(''); setDescription(''); toast.success(`Created ${made.code}`); },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <form onSubmit={submit} className="glass-panel p-6 space-y-4">
      <h2>New code</h2>
      <Segmented value={kind} onChange={setKind} options={[['ACCESS', 'Access code'], ['DISCOUNT', 'Discount code']] as const} />
      <Field label="Code" hint="Leave blank to make a readable one, like K7QD-M2XP."><Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} placeholder="Generated" /></Field>
      <Field label="Note to yourself"><Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Who or what it is for" /></Field>

      {kind === 'ACCESS' ? (
        <Field label="How long the access lasts (days)" hint="Counted from the day someone redeems it, and added after any access they already have."><Input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} /></Field>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Takes off"><Select value={type} onChange={(e) => setType(e.target.value as 'PERCENT' | 'AMOUNT')}><option value="PERCENT">A percentage</option><option value="AMOUNT">A fixed amount</option></Select></Field>
          <Field label={type === 'PERCENT' ? 'Percent' : 'Amount'}><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} /></Field>
          <div className="col-span-2"><Field label="For how long"><Select value={cycles} onChange={(e) => setCycles(e.target.value)}><option value="1">The first payment only</option><option value="3">The first 3 payments</option><option value="12">The first 12 payments</option><option value="ALL">Every payment</option></Select></Field></div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Works from"><Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Works until"><Input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
        <Field label="Total uses" hint="Blank means no limit."><Input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Uses per person"><Input inputMode="numeric" value={perUser} onChange={(e) => setPerUser(e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <Button type="submit" className="w-full" disabled={create.isPending}>Create code</Button>
    </form>
  );
}

function GrantAccess() {
  const { grant } = useCodeMutations();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('31');
  const [note, setNote] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    grant.mutate({ email: email.trim(), days: Number(days), note: note.trim() || undefined }, {
      onSuccess: (g) => { setEmail(''); setNote(''); toast.success(`${g.email} has Pro until ${new Date(g.accessUntil).toLocaleDateString()}`); },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };
  return (
    <form onSubmit={submit} className="glass-panel p-6 space-y-3">
      <div><h2>Give someone access</h2><p className="text-caption text-secondary mt-0.5">For example after a payment received outside the app.</p></div>
      <Field label="Their email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Days"><Input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} /></Field>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Paid by UPI" /></Field>
      </div>
      <Button type="submit" variant="outline" disabled={!email.trim() || !Number(days) || grant.isPending}>Give access</Button>
    </form>
  );
}

function CodeRow({ c }: { c: PlanCode }) {
  const { update } = useCodeMutations();
  const [open, setOpen] = useState(false);
  const [label, tone] = STATUS[c.status];
  const redemptions = useCodeRedemptions(open ? c.id : null);
  return (
    <li className="glass-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold tracking-wide">{c.code}</span>
            <Badge tone={tone}>{label}</Badge>
            <Badge>{c.kind === 'ACCESS' ? 'Access' : 'Discount'}</Badge>
          </p>
          <p className="text-body mt-1">{describe(c)}</p>
          {c.description && <p className="text-caption text-secondary mt-0.5">{c.description}</p>}
        </div>
        <div className="flex gap-1">
          <IconButton label="Copy code" onClick={() => void navigator.clipboard.writeText(c.code).then(() => toast.success('Copied'))}><Copy className="w-4 h-4" /></IconButton>
          <IconButton label={c.active ? 'Switch off' : 'Switch on'} onClick={() => update.mutate({ id: c.id, body: { active: !c.active } }, { onError: (e) => toast.error(errorMessage(e)) })}><Power className={cn('w-4 h-4', c.active ? 'text-green-600' : 'text-secondary')} /></IconButton>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3 mt-4 text-caption">
        <div><dt className="text-secondary">Used</dt><dd className="text-body tabular-nums">{c.redeemedCount}{c.maxRedemptions !== null ? ` of ${c.maxRedemptions}` : ''}</dd></div>
        <div><dt className="text-secondary">Per person</dt><dd className="text-body tabular-nums">{c.perUserLimit}</dd></div>
        <div><dt className="text-secondary">Valid</dt><dd className="text-body">{day(c.startsAt) ?? 'Now'} to {day(c.expiresAt) ?? 'no end'}</dd></div>
      </dl>
      {c.kind === 'ACCESS' && (
        <>
          <button type="button" onClick={() => setOpen(!open)} className="text-caption text-accent mt-3">{open ? 'Hide who used it' : 'Who used it'}</button>
          {open && (
            <ul className="mt-2 divide-y divide-border text-caption">
              {(redemptions.data ?? []).map((r) => <li key={r.email + r.redeemedAt} className="py-1.5 flex justify-between gap-3"><span className="truncate">{r.email}</span><span className="text-secondary shrink-0">{day(r.redeemedAt)}{r.grantsUntil ? ` · until ${day(r.grantsUntil)}` : ''}</span></li>)}
              {redemptions.data?.length === 0 && <li className="py-1.5 text-secondary">Nobody yet.</li>}
            </ul>
          )}
        </>
      )}
    </li>
  );
}
