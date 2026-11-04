import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refundsApi } from '../api/endpoints';
import { useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney, qk } from './keys';

export function useRefunds() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.refunds(id), queryFn: () => refundsApi.overview(id) });
}

/** A refund can add income to an account, so every money figure is refreshed. */
function useRefundMutation<TArgs, TOut>(fn: (ws: string, args: TArgs) => Promise<TOut>) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({ mutationFn: (args: TArgs) => fn(id, args), onSuccess: () => void invalidateMoney(qc, id) });
}

export const useMarkForRefund = () => useRefundMutation((ws, b: Parameters<typeof refundsApi.create>[1]) => refundsApi.create(ws, b));
export const useUpdateRefund = () => useRefundMutation((ws, a: { id: string; body: Parameters<typeof refundsApi.update>[2] }) => refundsApi.update(ws, a.id, a.body));
export const useCompleteRefund = () => useRefundMutation((ws, a: { id: string; body: Parameters<typeof refundsApi.complete>[2] }) => refundsApi.complete(ws, a.id, a.body));
export const useDeleteRefund = () => useRefundMutation((ws, id: string) => refundsApi.remove(ws, id));
