import { useQuery } from '@tanstack/react-query';
import { CategoryService } from '../api/CategoryService';

export const useCategoryTree = (workspaceId: string, type?: string) => {
  return useQuery({
    queryKey: ['categoryTree', workspaceId, type],
    queryFn: () => CategoryService.getTree(workspaceId, type),
    enabled: !!workspaceId,
  });
};
