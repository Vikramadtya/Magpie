import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { lendingApi } from '../api/endpoints';
import { useAuth, useWorkspace } from '../auth/AuthProvider';
import { qk } from './keys';

/** Accounts others have offered to lend you. Not tied to a ledger, so the key is per user. */
export function useInvitations() {
  const { user } = useAuth();
  return useQuery({ queryKey: ['invitations', user?.id], queryFn: lendingApi.invitations, enabled: !!user, refetchInterval: 120_000 });
}

export function useAnswerInvitation() {
  const { id: ws } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { id: string; accept: boolean }) => (a.accept ? lendingApi.accept(a.id) : lendingApi.decline(a.id)),
    onSuccess: (_, a) => toast.success(a.accept ? 'Added to your accounts' : 'Declined'),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['invitations', user?.id] });
      void qc.invalidateQueries({ queryKey: qk.accounts(ws) });
    },
  });
}

export function useShares(accountId: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.shares(id, accountId), queryFn: () => lendingApi.shares(id, accountId) });
}

export function useLend(accountId: string) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => lendingApi.lend(id, accountId, email),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.shares(id, accountId) }),
  });
}

export function useRevokeShare(accountId: string) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => lendingApi.revoke(id, shareId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.shares(id, accountId) }),
  });
}
