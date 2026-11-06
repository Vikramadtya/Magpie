import { useQuery } from '@tanstack/react-query';
import { holdingsApi, insightsApi } from '../api/endpoints';
import type { BreakdownParams } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { qk } from './keys';

const STALE = 60_000;

/** Money grouped by one thing (and optionally by day or month); the engine behind most charts. */
export function useBreakdown(p: BreakdownParams, enabled = true) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'breakdown', p), queryFn: () => insightsApi.breakdown(id, p), enabled, staleTime: STALE });
}
export function useSizes(from: string, to: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'sizes', from, to), queryFn: () => insightsApi.sizes(id, from, to), staleTime: STALE });
}
export function usePurchases(from: string, to: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'purchases', from, to), queryFn: () => insightsApi.purchases(id, from, to), staleTime: STALE });
}
export function useSpendTree(from: string, to: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'tree', from, to), queryFn: () => insightsApi.tree(id, from, to), staleTime: STALE });
}
export function useWealth(months: number) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'wealth', months), queryFn: () => insightsApi.wealth(id, months), staleTime: STALE });
}
export function useInvestmentHistory() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'investment-history'), queryFn: () => insightsApi.investmentHistory(id), staleTime: STALE });
}
export function useLoanHistory(months: number) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'loan-history', months), queryFn: () => insightsApi.loanHistory(id, months), staleTime: STALE });
}
export function useGoalProgress() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'goal-progress'), queryFn: () => insightsApi.goalProgress(id), staleTime: STALE });
}
export function useBudgetHistory(months: number) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'budget-history', months), queryFn: () => insightsApi.budgetHistory(id, months), staleTime: STALE });
}

export function useHoldingHistory(id: string | null) {
  const { id: ws } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(ws, 'holding-history', id), queryFn: () => holdingsApi.history(ws, id!), enabled: !!id, staleTime: STALE });
}
export function useAccountHistory(id: string | null) {
  const { id: ws } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(ws, 'account-history', id), queryFn: () => insightsApi.accountHistory(ws, id!), enabled: !!id, staleTime: STALE });
}
