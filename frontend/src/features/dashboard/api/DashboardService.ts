import { DashboardApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new DashboardApi(undefined, '', apiClient);

export const DashboardService = {
  getAnalytics: async (workspaceId: string, months: number = 1) => {
    // We need to pass workspaceId and maybe months if the API supports it
    // For now we just pass workspaceId as it's required by the OpenAPI spec
    const response = await api.getDashboard(workspaceId);
    return response.data;
  },
};
