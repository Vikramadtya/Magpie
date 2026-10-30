import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fxApi, holdingsApi, importApi, insightsApi, workspaceApi } from '../api/endpoints';
import type { HoldingInput, ParsedRow } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney, qk } from './keys';

/** Server-side conversion preview: the same rates the server applies when saving. */
export function useFxQuote(amountMinor: number | null, from: string, to: string) {
  return useQuery({
    queryKey: ['fx', from, to, amountMinor],
    queryFn: () => fxApi.quote(from, to, amountMinor ?? 0),
    enabled: !!amountMinor && amountMinor > 0 && from !== to,
    staleTime: 5 * 60_000,
  });
}

export function useDashboard(month: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.dashboard(id, month), queryFn: () => insightsApi.dashboard(id, month) });
}

export function useSpending(from: string, to: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'spending', from, to), queryFn: () => insightsApi.spending(id, from, to) });
}
export function useCashFlow(from: string, to: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'cashflow', from, to), queryFn: () => insightsApi.cashFlow(id, from, to) });
}
export function useNetWorth(months: number) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'networth', months), queryFn: () => insightsApi.netWorth(id, months) });
}
export function useOverview(from: string, to: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'overview', from, to), queryFn: () => insightsApi.overview(id, from, to) });
}
export function useTopPayees(from: string, to: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.analytics(id, 'payees', from, to), queryFn: () => insightsApi.topPayees(id, from, to) });
}

export function useHoldings() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.holdings(id), queryFn: () => holdingsApi.list(id) });
}
export function useInvestmentSummary() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.investments(id), queryFn: () => holdingsApi.summary(id) });
}

function useHoldingMutation<TArgs>(fn: (ws: string, args: TArgs) => Promise<unknown>) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(id, args),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.holdings(id) });
      void qc.invalidateQueries({ queryKey: qk.investments(id) });
    },
  });
}
export const useSaveHolding = () =>
  useHoldingMutation((ws, a: { id?: string; body: HoldingInput }) => (a.id ? holdingsApi.update(ws, a.id, a.body) : holdingsApi.create(ws, a.body)));
export const useSetPrice = () => useHoldingMutation((ws, a: { id: string; priceMinor: number }) => holdingsApi.setPrice(ws, a.id, a.priceMinor));
export const useDeleteHolding = () => useHoldingMutation((ws, id: string) => holdingsApi.remove(ws, id));

export function useImportPreview() {
  const { id } = useWorkspace();
  return useMutation({
    mutationFn: (a: { file: File; accountId: string; dateFormat: string }) => importApi.preview(id, a.file, a.accountId, a.dateFormat),
  });
}
export function useImportCommit() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { accountId: string; fileName: string; rows: ParsedRow[] }) => importApi.commit(id, a.accountId, a.fileName, a.rows),
    onSuccess: () => void invalidateMoney(qc, id),
  });
}
export function useUndoImport() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (batchId: string) => importApi.undo(id, batchId), onSuccess: () => void invalidateMoney(qc, id) });
}

export function useActivity() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.activity(id), queryFn: () => workspaceApi.activity(id) });
}
