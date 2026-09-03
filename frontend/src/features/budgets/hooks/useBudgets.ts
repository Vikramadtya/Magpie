import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetService } from '../api/BudgetService';
import type { Budget } from '../api/types';

export const useBudgets = (workspaceId: string) => {
  return useQuery({
    queryKey: ['budgets', workspaceId],
    queryFn: () => BudgetService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useBudgetSummary = (workspaceId: string) => {
  return useQuery({
    queryKey: ['budgetSummary', workspaceId],
    queryFn: () => BudgetService.getSummary(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, budget }: { workspaceId: string, budget: any }) => BudgetService.create(workspaceId, budget),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    }
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, budgetId, budget }: { workspaceId: string, budgetId: string, budget: any }) => 
      BudgetService.update(workspaceId, budgetId, budget),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    }
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, budgetId }: { workspaceId: string, budgetId: string }) => 
      BudgetService.delete(workspaceId, budgetId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', workspaceId] });
    }
  });
};
