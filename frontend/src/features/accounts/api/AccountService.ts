import { DefaultApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new DefaultApi(undefined, '', apiClient);

export const AccountService = {
  getAll: async (workspaceId: string) => {
    const response = await api.getAllAccounts(workspaceId);
    return response.data.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      currency: acc.currency || 'USD',
      balance: acc.balance || 0,
      parentId: acc.parentId,
    }));
  },
  create: async (workspaceId: string, account: any) => { 
    const response = await api.createAccount(workspaceId, account);
    return response.data;
  },
  update: async (workspaceId: string, accountId: string, account: any) => { 
    const response = await api.updateAccount(workspaceId, accountId, account);
    return response.data;
  },
  delete: async (workspaceId: string, accountId: string) => {
    await api.deleteAccount(workspaceId, accountId);
  },
};
