import { DefaultApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new DefaultApi(undefined, '', apiClient);

export const SubscriptionService = {
  getAll: async (workspaceId: string) => {
    const response = await api.getSubscriptions(workspaceId);
    return response.data;
  },
  create: async (workspaceId: string, s: any) => { 
    const response = await api.createSubscription(workspaceId, s);
    return response.data;
  },
  update: async (workspaceId: string, sId: string, s: any) => { 
    const response = await api.updateSubscription(workspaceId, sId, s);
    return response.data;
  },
  delete: async (workspaceId: string, sId: string) => {
    await api.deleteSubscription(workspaceId, sId);
  },
};
