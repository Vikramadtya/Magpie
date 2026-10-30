import { http } from '../lib/http';

const base = (ws: string) => `/api/v1/workspaces/${ws}`;

/** Thin typed helpers so feature modules read like a list of endpoints. */
export const api = {
  get: <T>(ws: string, path: string, params?: object) =>
    http.get<T>(base(ws) + path, { params }).then((r) => r.data),
  post: <T>(ws: string, path: string, body?: unknown, headers?: Record<string, string>) =>
    http.post<T>(base(ws) + path, body ?? {}, { headers }).then((r) => r.data),
  put: <T>(ws: string, path: string, body?: unknown) => http.put<T>(base(ws) + path, body).then((r) => r.data),
  patch: <T>(ws: string, path: string, body?: unknown) => http.patch<T>(base(ws) + path, body).then((r) => r.data),
  del: (ws: string, path: string) => http.delete(base(ws) + path).then(() => undefined),
  /** DELETE that returns a body. */
  delJson: <T>(ws: string, path: string) => http.delete<T>(base(ws) + path).then((r) => r.data),
};
