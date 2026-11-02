import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { forecastApi, holdingsApi, loansApi, marketApi } from '../api/endpoints';
import { useWorkspace } from '../auth/AuthProvider';
import type { PurchaseInput } from '../api/types';
import { invalidateMoney, qk } from './keys';

// ---------- loans ----------
export function useLoans() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.loans(id), queryFn: () => loansApi.overview(id) });
}

export function useLoanDetail(loanId: string | null) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...qk.loans(id), loanId], queryFn: () => loansApi.detail(id, loanId!), enabled: !!loanId });
}

function useMoney<TArgs, TOut>(fn: (ws: string, args: TArgs) => Promise<TOut>) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (args: TArgs) => fn(id, args), onSuccess: () => void invalidateMoney(qc, id) });
}

export const useCreateLoan = () => useMoney((ws, b: Parameters<typeof loansApi.create>[1]) => loansApi.create(ws, b));
export const useRepayLoan = () => useMoney((ws, a: { id: string; body: Parameters<typeof loansApi.repay>[2] }) => loansApi.repay(ws, a.id, a.body));
export const useDeleteLoan = () => useMoney((ws, id: string) => loansApi.remove(ws, id));

// ---------- forecast / insights ----------
export function useForecast() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.forecast(id), queryFn: () => forecastApi.forecast(id), staleTime: 5 * 60_000 });
}

export function useInsights() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.insights(id), queryFn: () => forecastApi.insights(id), staleTime: 5 * 60_000 });
}

// ---------- market data ----------
export function useMarketSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ['market', 'search', term],
    queryFn: () => marketApi.search(term),
    enabled: term.length >= 2,
    staleTime: 60 * 60_000,
    retry: 0,
  });
}

export function useRefreshHolding() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (holdingId: string) => holdingsApi.refreshOne(id, holdingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.holdings(id) });
      void qc.invalidateQueries({ queryKey: qk.investments(id) });
    },
  });
}

export function useRefreshHoldings() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => holdingsApi.refresh(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.holdings(id) });
      void qc.invalidateQueries({ queryKey: qk.investments(id) });
    },
  });
}

export function useUploadPrices() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prices: { symbol: string; price: number; currency?: string }[]) => holdingsApi.uploadPrices(id, prices),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.holdings(id) });
      void qc.invalidateQueries({ queryKey: qk.investments(id) });
    },
  });
}

export function useLots(holdingId: string | null) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...qk.holdings(id), holdingId, 'lots'], queryFn: () => holdingsApi.lots(id, holdingId!), enabled: !!holdingId });
}

function usePurchaseMutation<TArgs>(fn: (ws: string, args: TArgs) => Promise<unknown>) {
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

export const useAddPurchase = () => usePurchaseMutation((ws, a: { holdingId: string; body: PurchaseInput }) => holdingsApi.addLot(ws, a.holdingId, a.body));
export const useRemovePurchase = () => usePurchaseMutation((ws, a: { holdingId: string; lotId: string }) => holdingsApi.removeLot(ws, a.holdingId, a.lotId));
