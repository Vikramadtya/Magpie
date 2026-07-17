import axios from 'axios';
import axiosRetry from 'axios-retry';
import { toast } from 'sonner';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosRetry(apiClient, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: any) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const workspaceId = localStorage.getItem('workspaceId');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (workspaceId && !config.headers['X-Workspace-Id']) {
      config.headers['X-Workspace-Id'] = workspaceId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('A server error occurred. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);
