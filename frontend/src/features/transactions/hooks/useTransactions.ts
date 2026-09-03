import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionService } from '../api/TransactionService';
import type { Transaction } from '../../../types/models';

export const useTransactions = (workspaceId: string) => {
  return useQuery({
    queryKey: ['transactions', workspaceId],
    queryFn: () => TransactionService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useGroupedTransactions = (workspaceId: string, params: any) => {
  return useQuery({
    queryKey: ['transactions', 'grouped', workspaceId, params],
    queryFn: () => TransactionService.getGrouped(workspaceId, params),
    enabled: !!workspaceId,
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id }: { workspaceId: string, id: string }) => TransactionService.delete(workspaceId, id),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['payees', workspaceId] });
    },
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, payload, isTransfer }: { workspaceId: string, payload: any, isTransfer?: boolean }) => 
      TransactionService.create(workspaceId, payload, isTransfer),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['payees', workspaceId] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, id, tx }: { workspaceId: string, id: string, tx: any }) => 
      TransactionService.update(workspaceId, id, tx),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['payees', workspaceId] });
    },
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, transactionId, text }: { workspaceId: string, transactionId: string, text: string }) => 
      TransactionService.addComment(workspaceId, transactionId, text),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
    },
  });
};
