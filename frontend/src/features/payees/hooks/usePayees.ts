import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PayeeService } from '../api/PayeeService';
import type { Payee } from '../api/types';

export const usePayees = (workspaceId: string) => {
  return useQuery({
    queryKey: ['payees', workspaceId],
    queryFn: () => PayeeService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreatePayee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, payee }: { workspaceId: string, payee: any }) => PayeeService.create(workspaceId, payee),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['payees', workspaceId] });
    }
  });
};

export const useUpdatePayee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, payeeId, payee }: { workspaceId: string, payeeId: string, payee: any }) => 
      PayeeService.update(workspaceId, payeeId, payee),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['payees', workspaceId] });
    }
  });
};

export const useDeletePayee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, payeeId }: { workspaceId: string, payeeId: string }) => 
      PayeeService.delete(workspaceId, payeeId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['payees', workspaceId] });
    }
  });
};
