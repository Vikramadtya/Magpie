import { ArrowLeftRight, CheckSquare, Banknote, Home, MessageSquare, Pencil, RotateCcw, Trash2, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import type { Transaction, TransactionFilters, TxType } from '../api/types';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { Amount } from '../components/ui/Amount';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { Skeleton, StateView } from '../components/ui/StateView';
import { groupCategories, useTransactionDialog } from '../features/transactions/TransactionDialog';
import { useAccounts, useCategories } from '../hooks/useReference';
import { useAddComment, useBulkTransactions, useComments, useDeleteTransaction, useDeletedTransactions, useRestoreTransaction, useShareTransaction, useTransactionList } from '../hooks/useTransactions';
import { useMembers } from '../hooks/useInsights';
import { prettyDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { cn } from '../lib/cn';

export default function TransactionsPage() {
  const { canEdit, kind } = useWorkspace();
  const { workspaces, workspace } = useAuth();
  const households = workspace?.kind === 'PERSONAL' ? workspaces.filter((w) => w.kind === 'HOUSEHOLD' && w.role !== 'VIEWER') : [];
  const memberNames = new Map((useMembers().data ?? []).map((m) => [m.userId, m.name]));
  const dialog = useTransactionDialog();
  const [params, setParams] = useSearchParams();
  const accounts = useAccounts().data ?? [];
  const categories = useCategories().data ?? [];

  const [search, setSearch] = useState(params.get('q') ?? '');
  const [debounced] = useDebounce(search, 250);

  const filters: TransactionFilters = useMemo(
    () => ({
      q: debounced.trim() || undefined,
      accountId: params.get('account') || undefined,
      categoryId: params.get('category') || undefined,
      type: (params.get('type') as TxType) || undefined,
      from: params.get('from') || undefined,
      to: params.get('to') || undefined,
    }),
    [debounced, params],
  );

  const setParam = (key: string, value: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });

  const list = useTransactionList(filters);
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [commentsFor, setCommentsFor] = useState<Transaction | null>(null);
  const [shareFor, setShareFor] = useState<Transaction | null>(null);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const del = useDeleteTransaction();
  const bulk = useBulkTransactions();

  useEffect(() => {
    if (!selecting) setSelected(new Set());
  }, [selecting]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hasFilters = Object.values(filters).some(Boolean);
  const expenseGroups = groupCategories(categories, 'EXPENSE');
  const incomeGroups = groupCategories(categories, 'INCOME');

  return (
    <>
      <PageHeader
        title="Transactions"
        actions={
          canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => setDeletedOpen(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />Recently deleted
              </Button>
              <Button variant={selecting ? 'secondary' : 'outline'} size="sm" onClick={() => setSelecting(!selecting)}>
                <CheckSquare className="w-4 h-4 mr-2" />{selecting ? 'Done' : 'Select'}
              </Button>
              <Button size="sm" onClick={() => dialog.open()}>Add</Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
        <Input className="col-span-2" placeholder="Search notes and payees…" value={search} onChange={(e) => { setSearch(e.target.value); setParam('q', e.target.value); }} aria-label="Search" />
        <Select value={filters.accountId ?? ''} onChange={(e) => setParam('account', e.target.value)} aria-label="Account">
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={filters.categoryId ?? ''} onChange={(e) => setParam('category', e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {[...expenseGroups, ...incomeGroups].map((g) => (
            <optgroup key={g.parent.id} label={g.parent.name}>
              <option value={g.parent.id}>{g.parent.name}</option>
              {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </Select>
        <Select value={filters.type ?? ''} onChange={(e) => setParam('type', e.target.value)} aria-label="Type">
          <option value="">All types</option>
          <option value="EXPENSE">Expenses</option>
          <option value="INCOME">Income</option>
          <option value="TRANSFER">Transfers</option>
        </Select>
        <div className="flex gap-2">
          <Input type="date" value={filters.from ?? ''} onChange={(e) => setParam('from', e.target.value)} aria-label="From date" />
          <Input type="date" value={filters.to ?? ''} onChange={(e) => setParam('to', e.target.value)} aria-label="To date" />
        </div>
      </div>
      {hasFilters && (
        <button className="text-sm text-accent mb-3 inline-flex items-center gap-1" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>
          <X className="w-3.5 h-3.5" /> Clear filters
        </button>
      )}

      {selecting && selected.size > 0 && (
        <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2 shadow">
          <span className="text-sm">{selected.size} selected</span>
          <div className="flex gap-2">
            <Select className="h-9 w-48" defaultValue="" onChange={(e) => { if (e.target.value) { bulk.mutate({ action: 'RECATEGORIZE', ids: [...selected], categoryId: e.target.value }); setSelecting(false); } }} aria-label="Recategorize selected">
              <option value="">Set category…</option>
              {[...expenseGroups, ...incomeGroups].flatMap((g) => [g.parent, ...g.children]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button variant="destructive" size="sm" onClick={() => { bulk.mutate({ action: 'DELETE', ids: [...selected] }); setSelecting(false); }}>Delete</Button>
          </div>
        </div>
      )}

      <StateView
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={rows.length === 0}
        emptyTitle={hasFilters ? 'No matching transactions' : 'No transactions yet'}
        emptyHint={hasFilters ? 'Try different filters.' : 'Press N to add your first one.'}
        skeleton={<div className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>}
      >
        <div className="glass-panel overflow-hidden">
          <Virtuoso
            useWindowScroll={false}
            style={{ height: 'calc(100vh - 340px)', minHeight: 360 }}
            data={rows}
            endReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
            increaseViewportBy={400}
            computeItemKey={(_, t) => t.id}
            itemContent={(i, t) => (
              <Row
                tx={t}
                showDate={i === 0 || rows[i - 1].occurredOn !== t.occurredOn}
                selecting={selecting}
                selected={selected.has(t.id)}
                canEdit={canEdit}
                canShare={households.length > 0 && t.type === 'EXPENSE' && !t.loanId && !t.sharedCopy}
                by={kind === 'HOUSEHOLD' ? memberNames.get(t.createdBy) : undefined}
                onShare={() => setShareFor(t)}
                onToggle={() => toggle(t.id)}
                onEdit={() => dialog.open(t)}
                onDelete={() => setToDelete(t)}
                onComments={() => setCommentsFor(t)}
              />
            )}
            components={{ Footer: () => (list.isFetchingNextPage ? <div className="p-3"><Skeleton className="h-10" /></div> : <div className="h-4" />) }}
          />
        </div>
      </StateView>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete transaction?"
        message={toDelete?.transferId ? 'Both sides of this transfer will be removed and balances restored.' : 'The account balance will be restored.'}
        busy={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) del.mutate(toDelete); setToDelete(null); }}
      />
      <CommentsModal tx={commentsFor} onClose={() => setCommentsFor(null)} />
      {shareFor && <ShareModal tx={shareFor} households={households} onClose={() => setShareFor(null)} />}
      <DeletedModal open={deletedOpen} onClose={() => setDeletedOpen(false)} />
    </>
  );
}

interface RowProps {
  tx: Transaction; showDate: boolean; selecting: boolean; selected: boolean; canEdit: boolean; canShare: boolean; by?: string;
  onShare: () => void; onToggle: () => void; onEdit: () => void; onDelete: () => void; onComments: () => void;
}

function Row({ tx, showDate, selecting, selected, canEdit, canShare, by, onShare, onToggle, onEdit, onDelete, onComments }: RowProps) {
  const pending = tx.id.startsWith('pending-');
  const title = tx.type === 'TRANSFER' ? `Transfer ${tx.direction === -1 ? 'out' : 'in'}` : tx.payeeName ?? tx.note ?? tx.categoryName ?? 'Transaction';
  return (
    <div>
      {showDate && <div className="px-4 pt-3 pb-1 text-xs font-medium text-secondary bg-black/[0.02] dark:bg-white/[0.03]">{prettyDate(tx.occurredOn)}</div>}
      <div className={cn('group flex items-center gap-3 px-4 py-2.5 border-b border-border/60', pending && 'opacity-60', selected && 'bg-accent/10')}>
        {selecting && <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${title}`} className="w-4 h-4" />}
        <div className="w-8 h-8 shrink-0 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-secondary">
          {tx.type === 'TRANSFER' ? <ArrowLeftRight className="w-4 h-4" /> : <span className="text-sm">{(tx.categoryName ?? title)[0]}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-secondary truncate">{tx.accountName}{tx.categoryName ? ` · ${tx.categoryName}` : ''}{tx.payeeName && tx.note ? ` · ${tx.note}` : ''}{tx.origCurrency && tx.origAmountMinor ? ` · ${formatMoney(tx.origAmountMinor, tx.origCurrency)}` : ''}{by ? ` · ${by}` : ''}</p>
          {(tx.loanId || tx.sharedGroupId) && (
            <p className="text-[11px] text-accent flex items-center gap-1 mt-0.5">
              {tx.loanId && <><Banknote className="w-3 h-3" />Loan{tx.loanPerson ? ` · ${tx.loanPerson}` : ''}</>}
              {tx.sharedGroupId && <><Home className="w-3 h-3" />{tx.sharedCopy ? 'From a personal ledger' : 'Shared with household'}</>}
            </p>
          )}
        </div>
        <Amount minor={tx.direction * tx.amountMinor} currency={tx.currency} signed={tx.type !== 'TRANSFER'} className="text-sm font-semibold" />
        {!pending && !selecting && (
          <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <IconButton label="Comments" onClick={onComments}><MessageSquare className="w-4 h-4" /></IconButton>
            {canEdit && canShare && <IconButton label={tx.sharedGroupId ? 'Household sharing' : 'Share with household'} onClick={onShare}><Users className="w-4 h-4" /></IconButton>}
            {canEdit && !tx.sharedCopy && <IconButton label="Edit" onClick={onEdit}><Pencil className="w-4 h-4" /></IconButton>}
            {canEdit && !tx.sharedCopy && <IconButton label="Delete" onClick={onDelete}><Trash2 className="w-4 h-4" /></IconButton>}
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} title={label} onClick={onClick} className="p-1.5 rounded-md text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/10">{children}</button>;
}

function CommentsModal({ tx, onClose }: { tx: Transaction | null; onClose: () => void }) {
  const { user } = useAuth();
  const comments = useComments(tx?.id ?? null);
  const add = useAddComment(tx?.id ?? '');
  const { canEdit } = useWorkspace();
  const [body, setBody] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    add.mutate(body.trim(), { onSuccess: () => setBody('') });
  };

  return (
    <Modal isOpen={!!tx} onClose={onClose} title="Comments">
      <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto">
        {(comments.data ?? []).map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-medium">{c.userId === user?.id ? 'You' : c.userName}</span>{' '}
            <span className="text-xs text-secondary">{new Date(c.createdAt).toLocaleString()}</span>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
          </li>
        ))}
        {comments.data?.length === 0 && <li className="text-sm text-secondary">No comments yet.</li>}
      </ul>
      {canEdit && (
        <form onSubmit={submit} className="flex gap-2">
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" maxLength={2000} aria-label="Comment" />
          <Button type="submit" disabled={add.isPending}>Post</Button>
        </form>
      )}
    </Modal>
  );
}

function ShareModal({ tx, households, onClose }: { tx: Transaction; households: { id: string; name: string }[]; onClose: () => void }) {
  const share = useShareTransaction();
  const [householdId, setHouseholdId] = useState(households[0]?.id ?? '');
  const shared = !!tx.sharedGroupId;
  return (
    <Modal isOpen onClose={onClose} title={shared ? 'Shared with your household' : 'Share with household'}>
      {shared ? (
        <>
          <p className="text-sm text-secondary mb-4">A linked copy of this expense is in your household ledger, credited to you. It follows any edits you make here.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="destructive" disabled={share.isPending} onClick={() => share.mutate({ id: tx.id, householdId: null }, { onSuccess: onClose })}>Stop sharing</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-secondary mb-3">Records a linked copy in the household ledger, credited to you. Later edits or deletes here update it.</p>
          <Select value={householdId} onChange={(e) => setHouseholdId(e.target.value)} aria-label="Household">
            {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </Select>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={!householdId || share.isPending} onClick={() => share.mutate({ id: tx.id, householdId }, { onSuccess: onClose })}>Share</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

function DeletedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const deleted = useDeletedTransactions(open);
  const restore = useRestoreTransaction();
  const rows = deleted.data ?? [];
  return (
    <Modal isOpen={open} onClose={onClose} title="Recently deleted">
      {deleted.isLoading ? (
        <Skeleton className="h-16" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-secondary">Nothing deleted in the last 30 days.</p>
      ) : (
        <ul className="divide-y divide-border max-h-96 overflow-y-auto">
          {rows.map((t) => (
            <li key={t.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.payeeName ?? t.note ?? t.categoryName ?? t.type}</p>
                <p className="text-xs text-secondary">{prettyDate(t.occurredOn)} · {t.accountName}</p>
              </div>
              <Amount minor={t.direction * t.amountMinor} currency={t.currency} signed={t.type !== 'TRANSFER'} className="text-sm" />
              <Button size="sm" variant="outline" disabled={restore.isPending} onClick={() => restore.mutate(t.id)}>Restore</Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
