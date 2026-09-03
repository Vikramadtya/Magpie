import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '../api/DashboardService';

export const useDashboard = (workspaceId: string, months: number = 1) => {
  return useQuery({
    queryKey: ['dashboard', workspaceId, months],
    queryFn: () => DashboardService.getAnalytics(workspaceId, months),
    enabled: !!workspaceId,
  });
};
