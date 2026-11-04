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

/** The server could not be reached (asleep, restarting, offline): the session may still be fine. */
export class ServerUnreachable extends Error {
  constructor() {
    super('Cannot reach the server');
  }
}

const GIVE_UP_AFTER_MS = 100_000;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Asks for a new access token using the refresh cookie. Resolves null when the server answered and
 * there is no usable session. A sleeping or restarting server (timeouts, 5xx) is waited out rather
 * than treated as "signed out"; if it never answers this rejects with ServerUnreachable.
 */
async function requestRefresh(): Promise<string | null> {
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await axios.post(`${env.API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true, timeout: 25_000 });
      accessToken = res.data.accessToken as string;
      return accessToken;
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        accessToken = null;
        return null;
      }
      if (Date.now() - started > GIVE_UP_AFTER_MS) throw new ServerUnreachable();
      await pause(Math.min(1000 * 2 ** attempt, 10_000));
    }
  }
}

let refreshing: Promise<string | null> | null = null;

/** Single-flight: concurrent 401s share one refresh call (refresh tokens are single-use). */
export function refreshSession(): Promise<string | null> {
  refreshing ??= requestRefresh().finally(() => {
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
      const token = await refreshSession().catch(() => undefined);
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
      if (token === null) onSessionLost();
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
