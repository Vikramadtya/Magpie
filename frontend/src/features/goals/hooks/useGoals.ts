import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoalService } from '../api/GoalService';
import type { Goal } from '../api/types';

export const useGoals = (workspaceId: string) => {
  return useQuery({
    queryKey: ['goals', workspaceId],
    queryFn: () => GoalService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, goal }: { workspaceId: string, goal: any }) => GoalService.create(workspaceId, goal),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['goals', workspaceId] });
    }
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, goalId, goal }: { workspaceId: string, goalId: string, goal: any }) => 
      GoalService.update(workspaceId, goalId, goal),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['goals', workspaceId] });
    }
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, goalId }: { workspaceId: string, goalId: string }) => 
      GoalService.delete(workspaceId, goalId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['goals', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
    }
  });
};

export const useFundGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, goalId, payload }: { workspaceId: string, goalId: string, payload: { amount: string, sourceAccountId: string } }) => 
      GoalService.fund(workspaceId, goalId, payload),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['goals', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
    }
  });
};
