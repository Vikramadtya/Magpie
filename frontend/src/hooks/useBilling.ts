import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, billingApi } from '../api/endpoints';
import type { CodeInput } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';

const key = (ws: string) => ['ws', ws, 'billing'] as const;

export function useBilling() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: key(id), queryFn: () => billingApi.get(id), staleTime: 30_000 });
}

/** Redeeming a code changes what the whole app allows, so everything refreshes. */
export function useRedeem() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (code: string) => billingApi.redeem(id, code), onSuccess: () => void qc.invalidateQueries({ queryKey: ['ws', id] }) });
}

export function useQuote() {
  const { id } = useWorkspace();
  return useMutation({ mutationFn: (a: { interval: 'MONTHLY' | 'YEARLY'; code?: string }) => billingApi.quote(id, a.interval, a.code) });
}

export function useCheckout() {
  const { id } = useWorkspace();
  return useMutation({ mutationFn: (a: { interval: 'MONTHLY' | 'YEARLY'; code?: string }) => billingApi.checkout(id, a.interval, a.code) });
}

export function useAdminCodes() {
  return useQuery({ queryKey: ['admin', 'codes'], queryFn: adminApi.codes });
}

export function useCodeRedemptions(id: string | null) {
  return useQuery({ queryKey: ['admin', 'codes', id, 'redemptions'], queryFn: () => adminApi.redemptions(id!), enabled: !!id });
}

export function useCodeMutations() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ['admin'] });
  return {
    create: useMutation({ mutationFn: (b: CodeInput) => adminApi.createCode(b), onSuccess: refresh }),
    update: useMutation({ mutationFn: (a: { id: string; body: Parameters<typeof adminApi.updateCode>[1] }) => adminApi.updateCode(a.id, a.body), onSuccess: refresh }),
    grant: useMutation({ mutationFn: (a: { email: string; days: number; note?: string }) => adminApi.grant(a.email, a.days, a.note) }),
  };
}
