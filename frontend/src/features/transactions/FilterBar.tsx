import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { ArrowDownUp, Bookmark, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import type { TransactionFilters, TransactionSummary, TxSort, TxType } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MultiSelect, type Option } from '../../components/ui/MultiSelect';
import { Select } from '../../components/ui/Select';
import { useAccounts, useCategories, usePayees, usePeople, useTags } from '../../hooks/useReference';
import { useTrips } from '../../hooks/useTrips';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/money';
import { countActive, parseFilters, readSaved, SORT_LABELS, toParams, writeSaved, type SavedFilter } from '../../lib/txFilters';
import { groupCategories } from './TransactionDialog';

const day = (d: Date) => format(d, 'yyyy-MM-dd');

const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  { label: 'This month', range: () => ({ from: day(startOfMonth(new Date())), to: day(endOfMonth(new Date())) }) },
  { label: 'Last month', range: () => ({ from: day(startOfMonth(subMonths(new Date(), 1))), to: day(endOfMonth(subMonths(new Date(), 1))) }) },
  { label: 'Last 30 days', range: () => ({ from: day(subDays(new Date(), 30)), to: day(new Date()) }) },
  { label: 'This year', range: () => ({ from: day(startOfYear(new Date())), to: day(new Date()) }) },
];

const TYPE_OPTIONS: [TxType | '', string][] = [['', 'All'], ['EXPENSE', 'Expenses'], ['INCOME', 'Income'], ['TRANSFER', 'Transfers']];

const NONE: never[] = [];

interface Props {
  filters: TransactionFilters;
  onChange: (next: TransactionFilters) => void;
  summary?: TransactionSummary;
  workspaceId: string;
  baseCurrency: string;
}

/** Search box, the full filter panel, sort order, saved filters and a one-line result summary. */
export function FilterBar({ filters, onChange, summary, workspaceId, baseCurrency }: Props) {
  const accounts = useAccounts().data ?? NONE;
  const categories = useCategories().data ?? NONE;
  const payees = usePayees().data ?? NONE;
  const tags = useTags().data ?? NONE;
  const people = usePeople().data ?? NONE;
  const trips = useTrips().data ?? NONE;

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(filters.q ?? '');
  const [debounced] = useDebounce(text, 300);
  const [saved, setSaved] = useState<SavedFilter[]>(() => readSaved(workspaceId));
  const [name, setName] = useState('');

  // keep the box in step when the address changes elsewhere (clear all, a saved filter, a link)
  useEffect(() => setText(filters.q ?? ''), [filters.q]);
  useEffect(() => {
    if ((debounced.trim() || undefined) !== (filters.q ?? undefined)) onChange({ ...filters, q: debounced.trim() || undefined });
    // only when the typed text settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const set = (patch: Partial<TransactionFilters>) => onChange({ ...filters, ...patch });
  const active = countActive(filters);

  const accountOptions: Option[] = useMemo(() => accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name })), [accounts]);
  const categoryOptions: Option[] = useMemo(
    () => (['EXPENSE', 'INCOME'] as const).flatMap((kind) => groupCategories(categories.filter((c) => !c.archived), kind).flatMap((g) => [g.parent, ...g.children].map((c) => ({ value: c.id, label: c.parentId ? `${g.parent.name} › ${c.name}` : c.name, group: kind === 'EXPENSE' ? 'Expenses' : 'Income' })))),
    [categories],
  );
  const payeeOptions: Option[] = useMemo(() => payees.map((p) => ({ value: p.id, label: p.name })), [payees]);
  const tagOptions: Option[] = useMemo(() => tags.map((t) => ({ value: t.id, label: t.name })), [tags]);

  // what is on, as little pills that each switch themselves off
  const pills: { key: string; label: string; clear: () => void }[] = [];
  const named = (ids: string[] | undefined, options: Option[]) => (ids ?? []).map((id) => options.find((o) => o.value === id)?.label ?? 'Unknown');
  const many = (list: string[]) => (list.length <= 2 ? list.join(', ') : `${list[0]} +${list.length - 1}`);
  if (filters.accountIds?.length) pills.push({ key: 'accounts', label: many(named(filters.accountIds, accountOptions)), clear: () => set({ accountIds: undefined }) });
  if (filters.categoryIds?.length) pills.push({ key: 'categories', label: many(named(filters.categoryIds, categoryOptions)), clear: () => set({ categoryIds: undefined }) });
  if (filters.uncategorised) pills.push({ key: 'none', label: 'No category', clear: () => set({ uncategorised: undefined }) });
  if (filters.payeeIds?.length) pills.push({ key: 'payees', label: many(named(filters.payeeIds, payeeOptions)), clear: () => set({ payeeIds: undefined }) });
  if (filters.tagIds?.length) pills.push({ key: 'tags', label: `#${many(named(filters.tagIds, tagOptions))}`, clear: () => set({ tagIds: undefined }) });
  if (filters.type) pills.push({ key: 'type', label: TYPE_OPTIONS.find(([v]) => v === filters.type)?.[1] ?? filters.type, clear: () => set({ type: undefined }) });
  if (filters.minAmount || filters.maxAmount) pills.push({ key: 'amount', label: filters.minAmount && filters.maxAmount ? `${filters.minAmount} to ${filters.maxAmount}` : filters.minAmount ? `At least ${filters.minAmount}` : `Up to ${filters.maxAmount}`, clear: () => set({ minAmount: undefined, maxAmount: undefined }) });
  if (filters.from || filters.to) pills.push({ key: 'dates', label: filters.from && filters.to ? `${filters.from} to ${filters.to}` : filters.from ? `From ${filters.from}` : `Until ${filters.to}`, clear: () => set({ from: undefined, to: undefined }) });
  if (filters.tripId) pills.push({ key: 'trip', label: trips.find((t) => t.id === filters.tripId)?.name ?? 'Trip', clear: () => set({ tripId: undefined }) });
  if (filters.spentBy) pills.push({ key: 'by', label: filters.spentBy === 'me' ? 'Me' : people.find((p) => p.id === filters.spentBy)?.name ?? 'Person', clear: () => set({ spentBy: undefined }) });

  const saveCurrent = () => {
    const label = name.trim();
    if (!label) return;
    const next = [{ id: crypto.randomUUID(), name: label, query: toParams(filters).toString() }, ...saved.filter((s) => s.name !== label)];
    setSaved(next);
    writeSaved(workspaceId, next);
    setName('');
  };
  const removeSaved = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    writeSaved(workspaceId, next);
  };
  const applySaved = (s: SavedFilter) => onChange(parseFilters(new URLSearchParams(s.query)));

  return (
    <div className="mb-5 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-secondary pointer-events-none" />
          <Input className="pl-10" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search payee, note, category, tag, amount…" aria-label="Search transactions" />
        </div>
        <Button variant={open || active > (filters.q ? 1 : 0) ? 'secondary' : 'outline'} onClick={() => setOpen((o) => !o)} aria-expanded={open} className="shrink-0">
          <SlidersHorizontal className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Filters</span>
          {active > 0 && <span className="ml-2 grid place-items-center min-w-5 h-5 rounded-full bg-accent text-white text-[11px] px-1.5">{active}</span>}
        </Button>
        <label className="relative shrink-0">
          <span className="sr-only">Sort</span>
          <ArrowDownUp className="w-4 h-4 absolute left-3 top-3.5 text-secondary pointer-events-none" />
          <Select value={filters.sort ?? 'date_desc'} onChange={(e) => set({ sort: e.target.value as TxSort })} className="pl-9 w-auto" aria-label="Sort">
            {(Object.keys(SORT_LABELS) as TxSort[]).map((k) => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
          </Select>
        </label>
      </div>

      {saved.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Saved filters">
          {saved.map((s) => (
            <span key={s.id} className="shrink-0 inline-flex items-center rounded-full border border-border bg-surface text-sm shadow-card">
              <button type="button" onClick={() => applySaved(s)} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5"><Bookmark className="w-3.5 h-3.5 text-accent" />{s.name}</button>
              <button type="button" onClick={() => removeSaved(s.id)} aria-label={`Delete saved filter ${s.name}`} className="pr-2.5 pl-1 text-secondary"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <section className="glass-panel p-4 space-y-4" aria-label="Filters">
          <div>
            <span className="block text-xs font-medium text-secondary mb-1.5">Dates</span>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => {
                const r = p.range();
                const on = filters.from === r.from && filters.to === r.to;
                return <button key={p.label} type="button" onClick={() => set(on ? { from: undefined, to: undefined } : r)} aria-pressed={on} className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors', on ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface')}>{p.label}</button>;
              })}
              <Input type="date" className="w-auto" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} aria-label="From date" />
              <span className="text-secondary text-sm">to</span>
              <Input type="date" className="w-auto" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} aria-label="To date" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-secondary mb-1.5">Type</span>
              <div className="inline-flex p-1 rounded-xl bg-primary/[0.06]" role="tablist">
                {TYPE_OPTIONS.map(([v, label]) => (
                  <button key={v || 'all'} type="button" role="tab" aria-selected={(filters.type ?? '') === v} onClick={() => set({ type: (v || undefined) as TxType | undefined })} className={cn('px-3 py-1.5 text-sm font-medium rounded-lg transition-all', (filters.type ?? '') === v ? 'bg-surface text-primary shadow-card' : 'text-secondary')}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-secondary mb-1.5">Amount ({baseCurrency})</span>
              <div className="flex items-center gap-2">
                <Input inputMode="decimal" placeholder="Min" value={filters.minAmount ?? ''} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && set({ minAmount: e.target.value || undefined })} aria-label="Minimum amount" />
                <span className="text-secondary text-sm">to</span>
                <Input inputMode="decimal" placeholder="Max" value={filters.maxAmount ?? ''} onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && set({ maxAmount: e.target.value || undefined })} aria-label="Maximum amount" />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MultiSelect label="Accounts" placeholder="All accounts" options={accountOptions} selected={filters.accountIds ?? []} onChange={(v) => set({ accountIds: v.length ? v : undefined })} />
            <MultiSelect label="Categories" placeholder="All categories" options={categoryOptions} selected={filters.categoryIds ?? []} onChange={(v) => set({ categoryIds: v.length ? v : undefined })} />
            <MultiSelect label="Payees" placeholder="All payees" options={payeeOptions} selected={filters.payeeIds ?? []} onChange={(v) => set({ payeeIds: v.length ? v : undefined })} />
            {tags.length > 0 && <MultiSelect label="Tags" placeholder="Any tag" options={tagOptions} selected={filters.tagIds ?? []} onChange={(v) => set({ tagIds: v.length ? v : undefined })} />}
            {people.length > 0 && (
              <div><span className="block text-xs font-medium text-secondary mb-1">Spent by</span>
                <Select value={filters.spentBy ?? ''} onChange={(e) => set({ spentBy: e.target.value || undefined })} aria-label="Spent by"><option value="">Everyone</option><option value="me">Me</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
            )}
            {trips.length > 0 && (
              <div><span className="block text-xs font-medium text-secondary mb-1">Trip</span>
                <Select value={filters.tripId ?? ''} onChange={(e) => set({ tripId: e.target.value || undefined })} aria-label="Trip"><option value="">All trips</option>{trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
            )}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!filters.uncategorised} onChange={(e) => set({ uncategorised: e.target.checked || undefined })} className="w-4 h-4 accent-[rgb(var(--accent-rgb))]" />
            Only transactions with no category
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
            <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this filter" maxLength={40} aria-label="Name for this filter" onKeyDown={(e) => e.key === 'Enter' && saveCurrent()} />
            <Button variant="outline" size="sm" disabled={!name.trim() || active === 0} onClick={saveCurrent}><Bookmark className="w-4 h-4 mr-1.5" />Save</Button>
            <span className="flex-1" />
            {active > 0 && <Button variant="ghost" size="sm" onClick={() => onChange({})}>Clear all</Button>}
            <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </section>
      )}

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {pills.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent pl-3 pr-1.5 py-1 text-sm">
              <span className="max-w-[14rem] truncate">{p.label}</span>
              <button type="button" onClick={p.clear} aria-label={`Remove filter ${p.label}`} className="rounded-full p-0.5 hover:bg-accent/20"><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          <button type="button" onClick={() => onChange({})} className="text-sm text-secondary underline-offset-2 hover:underline">Clear all</button>
        </div>
      )}

      {summary && (
        <p className="text-sm text-secondary" aria-live="polite">
          <span className="font-medium text-primary tabular-nums">{summary.count.toLocaleString()}</span> {summary.count === 1 ? 'transaction' : 'transactions'}
          {summary.expenseMinor > 0 && <> · spent <span className="text-primary tabular-nums">{formatMoney(summary.expenseMinor, summary.currency)}</span></>}
          {summary.incomeMinor > 0 && <> · received <span className="text-primary tabular-nums">{formatMoney(summary.incomeMinor, summary.currency)}</span></>}
          {summary.capped && <> · looked through the newest {summary.count.toLocaleString()} matches only</>}
        </p>
      )}
    </div>
  );
}
