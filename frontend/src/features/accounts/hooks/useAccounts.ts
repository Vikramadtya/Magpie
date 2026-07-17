import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountService } from '../api/AccountService';

export const useAccounts = (workspaceId: string) => {
  return useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => AccountService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, account }: { workspaceId: string, account: any }) => AccountService.create(workspaceId, account),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, accountId, account }: { workspaceId: string, accountId: string, account: any }) => 
      AccountService.update(workspaceId, accountId, account),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
    },
  });
};
