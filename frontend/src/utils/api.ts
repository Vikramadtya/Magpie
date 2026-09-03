import axios from 'axios';
import axiosRetry from 'axios-retry';
import { toast } from 'sonner';
import { setupMockApi } from './mockApi';
import log from './logger';
import { env } from '../config/env';

export const apiClient = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosRetry(apiClient, { 
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: any) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
  onRetry: (retryCount, error, requestConfig) => {
    log.warn(`Retrying request (${retryCount}): ${requestConfig.url}`, error.message);
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

    log.debug(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    log.error(`[API Request Error]`, error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    log.debug(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    if (error.response) {
      log.error(`[API Error Response] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response.status}`, error.response.data);
      if (error.response.status === 401 || error.response.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (error.response.status >= 500) {
        toast.error('A server error occurred. Please try again later.');
      }
    } else {
      log.error(`[API Error Network/Config]`, error.message);
    }
    
    return Promise.reject(error);
  }
);

if (env.USE_MOCK_API) {
  log.info('Mock API is ENABLED. Intercepting requests.');
  setupMockApi(apiClient);
}
