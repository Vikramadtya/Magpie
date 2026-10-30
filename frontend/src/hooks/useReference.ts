import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountsApi, categoriesApi, payeesApi, peopleApi, tagsApi } from '../api/endpoints';
import type { AccountType } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney, qk } from './keys';

const REFERENCE_STALE = 5 * 60_000; // categories/payees/tags change rarely

export function useAccounts() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.accounts(id), queryFn: () => accountsApi.list(id) });
}

export function useCategories() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.categories(id), queryFn: () => categoriesApi.list(id), staleTime: REFERENCE_STALE });
}

export function usePayees() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.payees(id), queryFn: () => payeesApi.list(id), staleTime: REFERENCE_STALE });
}

export function usePeople() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.people(id), queryFn: () => peopleApi.list(id), staleTime: REFERENCE_STALE });
}

export function useTags() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.tags(id), queryFn: () => tagsApi.list(id), staleTime: REFERENCE_STALE });
}

/** Builds a mutation that refreshes the given cache keys on success. */
function useRefreshing<TArgs, TOut>(fn: (ws: string, args: TArgs) => Promise<TOut>, keys: (ws: string) => readonly (readonly unknown[])[], money = false) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(id, args),
    onSuccess: () => {
      keys(id).forEach((key) => void qc.invalidateQueries({ queryKey: key }));
      if (money) void invalidateMoney(qc, id);
    },
  });
}

export const useCreateAccount = () =>
  useRefreshing((ws, b: { name: string; type: AccountType; currency: string; openingBalanceMinor: number }) => accountsApi.create(ws, b), (ws) => [qk.accounts(ws)], true);
export const useUpdateAccount = () =>
  useRefreshing((ws, a: { id: string; body: Parameters<typeof accountsApi.update>[2] }) => accountsApi.update(ws, a.id, a.body), (ws) => [qk.accounts(ws)], true);
export const useDeleteAccount = () => useRefreshing((ws, id: string) => accountsApi.remove(ws, id), (ws) => [qk.accounts(ws)], true);

export const useCreateCategory = () =>
  useRefreshing((ws, b: Parameters<typeof categoriesApi.create>[1]) => categoriesApi.create(ws, b), (ws) => [qk.categories(ws)]);
export const useUpdateCategory = () =>
  useRefreshing((ws, a: { id: string; body: Parameters<typeof categoriesApi.update>[2] }) => categoriesApi.update(ws, a.id, a.body), (ws) => [qk.categories(ws)], true);
export const useDeleteCategory = () => useRefreshing((ws, id: string) => categoriesApi.remove(ws, id), (ws) => [qk.categories(ws)], true);

export const useCreatePayee = () =>
  useRefreshing((ws, b: { name: string; defaultCategoryId?: string | null }) => payeesApi.create(ws, b.name, b.defaultCategoryId), (ws) => [qk.payees(ws)]);
export const useUpdatePayee = () =>
  useRefreshing((ws, b: { id: string; name: string; defaultCategoryId?: string | null }) => payeesApi.update(ws, b.id, b.name, b.defaultCategoryId), (ws) => [qk.payees(ws)], true);
export const useDeletePayee = () => useRefreshing((ws, id: string) => payeesApi.remove(ws, id), (ws) => [qk.payees(ws)], true);

export const useCreatePerson = () => useRefreshing((ws, name: string) => peopleApi.create(ws, name), (ws) => [qk.people(ws)]);
export const useRenamePerson = () =>
  useRefreshing((ws, b: { id: string; name: string }) => peopleApi.rename(ws, b.id, b.name), (ws) => [qk.people(ws)], true);
export const useDeletePerson = () => useRefreshing((ws, id: string) => peopleApi.remove(ws, id), (ws) => [qk.people(ws)], true);

export const useCreateTag = () =>
  useRefreshing((ws, b: { name: string; color?: string }) => tagsApi.create(ws, b.name, b.color), (ws) => [qk.tags(ws)]);
export const useDeleteTag = () => useRefreshing((ws, id: string) => tagsApi.remove(ws, id), (ws) => [qk.tags(ws)], true);
