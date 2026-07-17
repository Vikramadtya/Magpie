import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InvestmentService } from '../api/InvestmentService';
import type { Investment } from '../api/types';

export const useInvestments = (workspaceId: string) => {
  return useQuery({
    queryKey: ['investments', workspaceId],
    queryFn: () => InvestmentService.getAll(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateInvestment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, investment }: { workspaceId: string, investment: any }) => 
      InvestmentService.create(workspaceId, investment),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['investments', workspaceId] });
    }
  });
};
