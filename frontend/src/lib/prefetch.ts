import { useCallback } from 'react';
import { accountsApi, budgetsApi, insightsApi } from '../api/endpoints';
import { useWorkspace } from '../auth/AuthProvider';
import { qk } from '../hooks/keys';
import { monthKey } from './dates';
import { queryClient } from './queryClient';

const done = new Set<string>();

/** Starts downloading a screen's code and first data the moment a link is touched or hovered. */
const chunks: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('../pages/DashboardPage'),
  '/transactions': () => import('../pages/TransactionsPage'),
  '/plan': () => Promise.all([import('../pages/SectionPage'), import('../pages/BudgetsPage')]),
  '/wealth': () => Promise.all([import('../pages/SectionPage'), import('../pages/AccountsPage')]),
  '/analytics': () => import('../pages/AnalyticsPage'),
  '/settings': () => import('../pages/SettingsPage'),
};

export function usePrefetch() {
  const { id } = useWorkspace();
  return useCallback(
    (path: string) => {
      const key = `${id}:${path}`;
      if (done.has(key) || !chunks[path]) return;
      done.add(key);
      void chunks[path]().catch(() => done.delete(key));
      const month = monthKey(new Date());
      const stale = { staleTime: 30_000 };
      if (path === '/dashboard') void queryClient.prefetchQuery({ queryKey: qk.dashboard(id, month), queryFn: () => insightsApi.dashboard(id, month), ...stale });
      if (path === '/plan') void queryClient.prefetchQuery({ queryKey: qk.budgets(id, month), queryFn: () => budgetsApi.summary(id, month), ...stale });
      if (path === '/wealth') void queryClient.prefetchQuery({ queryKey: qk.accounts(id), queryFn: () => accountsApi.list(id), ...stale });
    },
    [id],
  );
}
