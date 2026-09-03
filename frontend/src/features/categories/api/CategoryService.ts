import { CategoryApi } from '../../../api-client';
import { apiClient } from '../../../utils/api';

const api = new CategoryApi(undefined, '', apiClient);

export const CategoryService = {
  getTree: async (workspaceId: string, type?: string) => {
    const response = await api.getCategoryTree(workspaceId, type);
    return response.data;
  },
};
