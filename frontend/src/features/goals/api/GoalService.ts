import { GoalApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new GoalApi(undefined, '', apiClient);

export const GoalService = {
  getAll: async (workspaceId: string) => {
    const response = await api.getGoals(workspaceId);
    return response.data;
  },
  create: async (workspaceId: string, goal: any) => { 
    const response = await api.createGoal(workspaceId, goal);
    return response.data;
  },
  update: async (workspaceId: string, goalId: string, goal: any) => { 
    const response = await api.updateGoal(workspaceId, goalId, goal);
    return response.data;
  },
  delete: async (workspaceId: string, goalId: string) => {
    await api.deleteGoal(workspaceId, goalId);
  },
  fund: async (workspaceId: string, goalId: string, payload: { amount: string, sourceAccountId: string }) => {
    const response = await apiClient.post(`/api/v1/goals/${workspaceId}/${goalId}/fund`, payload);
    return response.data;
  }
};
