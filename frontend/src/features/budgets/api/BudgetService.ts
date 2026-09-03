import { BudgetApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new BudgetApi(undefined, '', apiClient);

export const BudgetService = {
  getAll: async (workspaceId: string) => {
    const response = await api.getBudgets(workspaceId);
    return response.data;
  },
  getSummary: async (workspaceId: string) => {
    const response = await api.getBudgetSummary(workspaceId);
    return response.data;
  },
  create: async (workspaceId: string, budget: any) => { 
    const response = await api.createBudget(workspaceId, budget);
    return response.data;
  },
  update: async (workspaceId: string, budgetId: string, budget: any) => { 
    const response = await api.updateBudget(workspaceId, budgetId, budget);
    return response.data;
  },
  delete: async (workspaceId: string, budgetId: string) => {
    await api.deleteBudget(workspaceId, budgetId);
  },
};
