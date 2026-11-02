import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { connectionsApi, inboxApi, splitPeopleApi } from '../api/endpoints';
import type { AcceptInput } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney, qk } from './keys';

export function useInbox(scope: 'todo' | 'done') {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.inbox(id, scope), queryFn: () => inboxApi.list(id, scope) });
}

/** How many items wait for review; shown as a badge. Polled gently so new items appear. */
export function useInboxCount() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.inboxCount(id), queryFn: () => inboxApi.count(id), refetchInterval: 60_000, select: (d) => d.count });
}

function useInboxMutation<TArgs, TOut>(fn: (ws: string, args: TArgs) => Promise<TOut>, message?: string) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(id, args),
    onSuccess: () => message && toast.success(message),
    onSettled: () => void invalidateMoney(qc, id),
  });
}

export const useAcceptItem = () => useInboxMutation((ws, a: { id: string; body: AcceptInput }) => inboxApi.accept(ws, a.id, a.body), 'Recorded');
export const useDismissItem = () => useInboxMutation((ws, id: string) => inboxApi.dismiss(ws, id));
export const useApplyUpdate = () => useInboxMutation((ws, a: { id: string; body: AcceptInput }) => inboxApi.applyUpdate(ws, a.id, a.body), 'Updated');
export const useRemoveRecords = () => useInboxMutation((ws, id: string) => inboxApi.removeRecords(ws, id), 'Removed from Keeper');
export const useKeepItem = () => useInboxMutation((ws, id: string) => inboxApi.keep(ws, id));

// ---------- connection to the expense-split app ----------
export function useConnections() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.connections(id), queryFn: () => connectionsApi.list(id) });
}

export function useCreateConnection() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => connectionsApi.create(id, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.connections(id) }),
  });
}

export function useRevokeConnection() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => connectionsApi.revoke(id, tokenId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.connections(id) }),
  });
}

// ---------- who the split app's people are in Keeper ----------
export function useSplitPeople() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.splitPeople(id), queryFn: () => splitPeopleApi.list(id) });
}

export function useSplitPersonLabel() {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: { id: string; label: string | null }) => (a.label === null ? splitPeopleApi.reset(id, a.id) : splitPeopleApi.rename(id, a.id, a.label)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.splitPeople(id) }),
  });
}
