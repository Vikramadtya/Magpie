import { PayeeApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';
import type { Payee } from './types';

const api = new PayeeApi(undefined, '', apiClient);

export const PayeeService = {
  getAll: async (workspaceId: string): Promise<Payee[]> => {
    try {
      const response = await api.getPayees(workspaceId);
      return response.data.content || [];
    } catch (e) {
      console.error('Failed to get payees', e);
      return [];
    }
  },
  create: async (workspaceId: string, payee: Partial<Payee>): Promise<Payee> => {
    const response = await apiClient.post<Payee>(`/v1/payees/${workspaceId}`, payee);
    return response.data;
  },
  update: async (workspaceId: string, payeeId: string, payee: Partial<Payee>): Promise<Payee> => {
    const response = await apiClient.put<Payee>(`/v1/payees/${workspaceId}/${payeeId}`, payee);
    return response.data;
  },
  delete: async (workspaceId: string, payeeId: string): Promise<void> => {
    await apiClient.delete(`/v1/payees/${workspaceId}/${payeeId}`);
  },
};
