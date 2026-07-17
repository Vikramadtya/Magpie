import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService } from '../api/SubscriptionService';
import type { Subscription } from '../api/types';

export const useSubscriptions = (workspaceId: string) => {
  return useQuery({
    queryKey: ['subscriptions', workspaceId],
    queryFn: () => SubscriptionService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, subscription }: { workspaceId: string, subscription: any }) => 
      SubscriptionService.create(workspaceId, subscription),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', workspaceId] });
    }
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, subscriptionId, subscription }: { workspaceId: string, subscriptionId: string, subscription: any }) => 
      SubscriptionService.update(workspaceId, subscriptionId, subscription),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', workspaceId] });
    }
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, subscriptionId }: { workspaceId: string, subscriptionId: string }) => 
      SubscriptionService.delete(workspaceId, subscriptionId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', workspaceId] });
    }
  });
};
