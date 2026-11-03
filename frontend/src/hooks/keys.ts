import type { QueryClient } from '@tanstack/react-query';
import type { TransactionFilters } from '../api/types';

/** Every key starts with the workspace so switching workspaces never mixes caches. */
export const qk = {
  accounts: (ws: string) => ['ws', ws, 'accounts'] as const,
  categories: (ws: string) => ['ws', ws, 'categories'] as const,
  payees: (ws: string) => ['ws', ws, 'payees'] as const,
  shares: (ws: string, accountId: string) => ['ws', ws, 'shares', accountId] as const,
  people: (ws: string) => ['ws', ws, 'people'] as const,
  tags: (ws: string) => ['ws', ws, 'tags'] as const,
  transactions: (ws: string) => ['ws', ws, 'transactions'] as const,
  transactionList: (ws: string, f: TransactionFilters) => ['ws', ws, 'transactions', f] as const,
  // its own root: the cache code treats everything under 'transactions' as a list of rows
  transactionSummary: (ws: string, f: TransactionFilters) => ['ws', ws, 'tx-summary', f] as const,
  comments: (ws: string, id: string) => ['ws', ws, 'comments', id] as const,
  budgets: (ws: string, month: string) => ['ws', ws, 'budgets', month] as const,
  goals: (ws: string) => ['ws', ws, 'goals'] as const,
  recurring: (ws: string) => ['ws', ws, 'recurring'] as const,
  upcoming: (ws: string) => ['ws', ws, 'upcoming'] as const,
  dashboard: (ws: string, month: string) => ['ws', ws, 'dashboard', month] as const,
  analytics: (ws: string, name: string, ...args: unknown[]) => ['ws', ws, 'analytics', name, ...args] as const,
  holdings: (ws: string) => ['ws', ws, 'holdings'] as const,
  investments: (ws: string) => ['ws', ws, 'investments'] as const,
  activity: (ws: string) => ['ws', ws, 'activity'] as const,
  deleted: (ws: string) => ['ws', ws, 'deleted'] as const,
  loans: (ws: string) => ['ws', ws, 'loans'] as const,
  forecast: (ws: string) => ['ws', ws, 'forecast'] as const,
  insights: (ws: string) => ['ws', ws, 'insights'] as const,
  trips: (ws: string) => ['ws', ws, 'trips'] as const,
  inbox: (ws: string, scope: string) => ['ws', ws, 'inbox', scope] as const,
  quickKeys: (ws: string) => ['ws', ws, 'quick-keys'] as const,
  captures: (ws: string) => ['ws', ws, 'inbox', 'captures'] as const,
  inboxCount: (ws: string) => ['ws', ws, 'inbox', 'count'] as const,
  splitPeople: (ws: string) => ['ws', ws, 'split-people'] as const,
  connections: (ws: string) => ['ws', ws, 'connections'] as const,
};

const MONEY_KEYS = new Set(['accounts', 'transactions', 'tx-summary', 'budgets', 'goals', 'recurring', 'upcoming', 'dashboard', 'analytics', 'investments', 'activity', 'deleted', 'loans', 'forecast', 'insights', 'trips', 'inbox']);

/** Anything derived from transactions: refetch after a money change. */
export function invalidateMoney(qc: QueryClient, ws: string) {
  return qc.invalidateQueries({
    predicate: (q) => q.queryKey[0] === 'ws' && q.queryKey[1] === ws && MONEY_KEYS.has(q.queryKey[2] as string),
  });
}
