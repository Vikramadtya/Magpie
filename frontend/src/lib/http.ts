import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { env } from './env';

/**
 * The access token lives in memory only (never localStorage), so XSS cannot read a long-lived
 * credential. The refresh token is an HttpOnly cookie the browser sends to /api/v1/auth/*.
 */
let accessToken: string | null = null;
let onSessionLost: () => void = () => {};

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
  onSessionLost: (handler: () => void) => {
    onSessionLost = handler;
  },
};

export const http = axios.create({
  baseURL: env.API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Retry only idempotent reads on network errors; writes are never replayed automatically.
axiosRetry(http, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (e) => axiosRetry.isNetworkError(e) && e.config?.method === 'get',
});

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

/** Single-flight: concurrent 401s share one refresh call (refresh tokens are single-use). */
export function refreshSession(): Promise<string | null> {
  refreshing ??= axios
    .post(`${env.API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      accessToken = res.data.accessToken as string;
      return accessToken;
    })
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes('/api/v1/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const token = await refreshSession();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
      onSessionLost();
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from an RFC 7807 problem or a network failure. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; title?: string; message?: string } | undefined;
    if (error.response?.status === 429) return 'Too many requests. Please wait a moment.';
    return data?.detail ?? data?.message ?? data?.title ?? (error.response ? 'Request failed' : 'Cannot reach the server');
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
