import { DefaultApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new DefaultApi(undefined, '', apiClient);

export const DashboardService = {
  getAnalytics: async (months: number) => {
    const response = await api.getDashboard(months);
    return response.data;
  },
};
