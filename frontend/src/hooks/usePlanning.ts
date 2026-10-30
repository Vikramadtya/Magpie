import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetsApi, goalsApi, recurringApi } from '../api/endpoints';
import type { RecurringInput } from '../api/types';
import { useWorkspace } from '../auth/AuthProvider';
import { invalidateMoney, qk } from './keys';

export function useBudgets(month: string) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.budgets(id, month), queryFn: () => budgetsApi.summary(id, month) });
}

function useMoneyMutation<TArgs, TOut>(fn: (ws: string, args: TArgs) => Promise<TOut>) {
  const { id } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(id, args),
    onSuccess: () => void invalidateMoney(qc, id),
  });
}

export const useSetBudget = () =>
  useMoneyMutation((ws, a: { categoryId: string; month: string; amountMinor: number; rollover: boolean }) =>
    budgetsApi.set(ws, a.categoryId, a.month, a.amountMinor, a.rollover));
export const useRemoveBudget = () =>
  useMoneyMutation((ws, a: { categoryId: string; month: string }) => budgetsApi.remove(ws, a.categoryId, a.month));
export const useCopyBudgets = () => useMoneyMutation((ws, month: string) => budgetsApi.copyPrevious(ws, month));

export function useGoals() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.goals(id), queryFn: () => goalsApi.list(id) });
}
export const useSaveGoal = () =>
  useMoneyMutation((ws, a: { id?: string; name: string; targetMinor: number; currency: string; targetDate?: string | null }) =>
    a.id ? goalsApi.update(ws, a.id, a) : goalsApi.create(ws, a));
export const useDeleteGoal = () => useMoneyMutation((ws, id: string) => goalsApi.remove(ws, id));
export const useContribute = () =>
  useMoneyMutation((ws, a: { id: string; amountMinor: number; occurredOn: string }) => goalsApi.contribute(ws, a.id, a.amountMinor, a.occurredOn));

export function useRecurring() {
  const { id } = useWorkspace();
  return useQuery({ queryKey: qk.recurring(id), queryFn: () => recurringApi.list(id) });
}
export function useUpcoming(days = 30) {
  const { id } = useWorkspace();
  return useQuery({ queryKey: [...qk.upcoming(id), days], queryFn: () => recurringApi.upcoming(id, days) });
}
export const useSaveRecurring = () =>
  useMoneyMutation((ws, a: { id?: string; body: RecurringInput }) => (a.id ? recurringApi.update(ws, a.id, a.body) : recurringApi.create(ws, a.body)));
export const usePostRecurringNow = () => useMoneyMutation((ws, id: string) => recurringApi.postNow(ws, id));
export const useToggleRecurring = () =>
  useMoneyMutation((ws, a: { id: string; pause: boolean }) => (a.pause ? recurringApi.pause(ws, a.id) : recurringApi.resume(ws, a.id)));
export const useDeleteRecurring = () => useMoneyMutation((ws, id: string) => recurringApi.remove(ws, id));
