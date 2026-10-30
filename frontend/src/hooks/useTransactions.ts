import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/endpoints';
import type { Account, CursorPage, Transaction, TransactionFilters, TransactionInput, TransferInput } from '../api/types';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney, qk } from './keys';

type TxCache = InfiniteData<CursorPage<Transaction>, string | undefined>;

export function useTransactionList(filters: TransactionFilters) {
  const { id } = useWorkspace();
  return useInfiniteQuery({
    queryKey: qk.transactionList(id, filters),
    queryFn: ({ pageParam }) => transactionsApi.page(id, filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Client-side mirror of the server filter, so optimistic rows only appear in lists they belong to. */
function matches(f: TransactionFilters, t: Transaction): boolean {
  if (f.accountId && f.accountId !== t.accountId) return false;
  if (f.categoryId && f.categoryId !== t.categoryId) return false;
  if (f.payeeId && f.payeeId !== t.payeeId) return false;
  if (f.type && f.type !== t.type) return false;
  if (f.from && t.occurredOn < f.from) return false;
  if (f.to && t.occurredOn > f.to) return false;
  if (f.tagId && !t.tagIds.includes(f.tagId)) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!`${t.note ?? ''} ${t.payeeName ?? ''}`.toLowerCase().includes(q)) return false;
  }
  return true;
}

interface Snapshot {
  lists: [readonly unknown[], TxCache | undefined][];
  accounts: Account[] | undefined;
}

function snapshot(qc: QueryClient, ws: string): Snapshot {
  return {
    lists: qc.getQueriesData<TxCache>({ queryKey: qk.transactions(ws) }),
    accounts: qc.getQueryData<Account[]>(qk.accounts(ws)),
  };
}

function restore(qc: QueryClient, ws: string, s?: Snapshot) {
  if (!s) return;
  s.lists.forEach(([key, data]) => qc.setQueryData(key, data));
  qc.setQueryData(qk.accounts(ws), s.accounts);
}

function adjustBalance(qc: QueryClient, ws: string, accountId: string, delta: number) {
  qc.setQueryData<Account[]>(qk.accounts(ws), (old) =>
    old?.map((a) => (a.id === accountId ? { ...a, balanceMinor: a.balanceMinor + delta } : a)),
  );
}

export function useCreateTransaction() {
  const { id: ws } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: TransactionInput; key: string }) => transactionsApi.create(ws, input, key),
    onMutate: async ({ input, key }) => {
      await qc.cancelQueries({ queryKey: qk.transactions(ws) });
      const prev = snapshot(qc, ws);
      const account = prev.accounts?.find((a) => a.id === input.accountId);
      // The server converts across currencies; don't guess the balance effect, just refetch afterwards.
      if (input.currency && account && input.currency !== account.currency) return prev;
      const direction = input.type === 'INCOME' ? 1 : -1;
      const optimistic: Transaction = {
        id: `pending-${key}`, accountId: input.accountId, accountName: account?.name ?? '', type: input.type, direction,
        amountMinor: input.amountMinor, currency: account?.currency ?? 'USD', occurredOn: input.occurredOn,
        categoryId: input.categoryId ?? null, categoryName: null, payeeId: input.payeeId ?? null, payeeName: null,
        note: input.note ?? null, tagIds: input.tagIds ?? [], transferId: null, version: 0, createdBy: user?.id ?? '', createdAt: new Date().toISOString(), origAmountMinor: null, origCurrency: null,
      };
      prev.lists.forEach(([queryKey, data]) => {
        const filters = (queryKey[3] ?? {}) as TransactionFilters;
        if (!data || !matches(filters, optimistic)) return;
        qc.setQueryData<TxCache>(queryKey, {
          ...data,
          pages: data.pages.map((p, i) => (i === 0 ? { ...p, items: [optimistic, ...p.items] } : p)),
        });
      });
      adjustBalance(qc, ws, input.accountId, direction * input.amountMinor);
      return prev;
    },
    onError: (_e, _v, prev) => restore(qc, ws, prev),
    onSettled: () => void invalidateMoney(qc, ws),
  });
}

export function useDeleteTransaction() {
  const { id: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tx: Transaction) => transactionsApi.remove(ws, tx.id),
    onMutate: async (tx) => {
      await qc.cancelQueries({ queryKey: qk.transactions(ws) });
      const prev = snapshot(qc, ws);
      prev.lists.forEach(([queryKey, data]) => {
        if (!data) return;
        qc.setQueryData<TxCache>(queryKey, {
          ...data,
          // a transfer deletes both legs server-side
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.filter((t) => t.id !== tx.id && (!tx.transferId || t.transferId !== tx.transferId)),
          })),
        });
      });
      adjustBalance(qc, ws, tx.accountId, -tx.direction * tx.amountMinor);
      return prev;
    },
    onError: (_e, _v, prev) => restore(qc, ws, prev),
    onSettled: () => void invalidateMoney(qc, ws),
  });
}

export function useUpdateTransaction() {
  const { id: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tx, input }: { tx: Transaction; input: TransactionInput }) =>
      transactionsApi.update(ws, tx.id, { ...input, type: tx.type === 'TRANSFER' ? 'TRANSFER' : input.type, expectedVersion: tx.version }),
    onSettled: () => void invalidateMoney(qc, ws),
  });
}

export function useTransfer() {
  const { id: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: TransferInput; key: string }) => transactionsApi.transfer(ws, input, key),
    onSettled: () => void invalidateMoney(qc, ws),
  });
}

export function useBulkTransactions() {
  const { id: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { action: 'DELETE' | 'RECATEGORIZE'; ids: string[]; categoryId?: string }) => transactionsApi.bulk(ws, b),
    onSettled: () => void invalidateMoney(qc, ws),
  });
}

export function useComments(transactionId: string | null) {
  const { id: ws } = useWorkspace();
  return useQuery({
    queryKey: qk.comments(ws, transactionId ?? ''),
    queryFn: () => transactionsApi.comments(ws, transactionId!),
    enabled: !!transactionId,
  });
}

export function useAddComment(transactionId: string) {
  const { id: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => transactionsApi.addComment(ws, transactionId, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.comments(ws, transactionId) }),
  });
}
