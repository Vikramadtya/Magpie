import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import type { Me, Role, User, Workspace } from '../api/types';
import axios from 'axios';
import { refreshSession, ServerUnreachable, tokenStore } from '../lib/http';
import { idbPersister, queryClient } from '../lib/queryClient';

/** 'unreachable': the server did not answer, so we cannot tell yet whether the session is still good. */
type Status = 'loading' | 'authed' | 'anon' | 'unreachable';

interface AuthContextValue {
  status: Status;
  user: User | null;
  workspaces: Workspace[];
  workspace: Workspace | null;
  canEdit: boolean;
  isOwner: boolean;
  selectWorkspace: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { email: string; password: string; name: string; currency: string }) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  /** Tries again after the server could not be reached. */
  retry: () => void;
  /** Called after Google sign-in, when only the refresh cookie exists. */
  completeOAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const WS_KEY = 'keeper.workspace';

const rank: Record<Role, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(WS_KEY);
    } catch {
      return null;
    }
  });

  const clearSession = useCallback(() => {
    tokenStore.set(null);
    setMe(null);
    setStatus('anon');
    queryClient.clear();
    void idbPersister.removeClient();
  }, []);

  const loadMe = useCallback(async () => {
    const data = await authApi.me();
    setMe(data);
    setStatus('authed');
  }, []);

  /** Signs back in from the refresh cookie. Only a definite "no session" signs the user out. */
  const boot = useCallback(async (isCancelled: () => boolean = () => false) => {
    setStatus('loading');
    try {
      const token = await refreshSession();
      if (isCancelled()) return;
      if (!token) return setStatus('anon');
      await loadMe();
    } catch (e) {
      if (isCancelled()) return;
      if (axios.isAxiosError(e) && e.response?.status === 401) clearSession();
      else if (e instanceof ServerUnreachable || !axios.isAxiosError(e) || !e.response || e.response.status >= 500) setStatus('unreachable');
      else clearSession();
    }
  }, [clearSession, loadMe]);

  useEffect(() => {
    tokenStore.onSessionLost(clearSession);
    let cancelled = false;
    void boot(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [clearSession, boot]);

  const value = useMemo<AuthContextValue>(() => {
    const workspaces = me?.workspaces ?? [];
    const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0] ?? null;
    const role = workspace?.role;
    return {
      status,
      user: me?.user ?? null,
      workspaces,
      workspace,
      canEdit: role ? rank[role] >= rank.EDITOR : false,
      isOwner: role === 'OWNER',
      selectWorkspace: (id) => {
        setWorkspaceId(id);
        try {
          localStorage.setItem(WS_KEY, id);
        } catch {
          /* private mode: selection just won't persist */
        }
      },
      login: async (email, password) => {
        const session = await authApi.login(email, password);
        tokenStore.set(session.accessToken);
        await loadMe();
      },
      register: async (body) => {
        const session = await authApi.register(body);
        tokenStore.set(session.accessToken);
        await loadMe();
      },
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          clearSession();
        }
      },
      reload: loadMe,
      retry: () => void boot(),
      completeOAuth: async () => {
        const token = await refreshSession();
        if (!token) return false;
        await loadMe();
        return true;
      },
    };
  }, [status, me, workspaceId, clearSession, loadMe, boot]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** The active workspace; only call inside authenticated routes. */
export function useWorkspace() {
  const { workspace, canEdit, isOwner } = useAuth();
  if (!workspace) throw new Error('No workspace');
  return { ...workspace, canEdit, isOwner };
}
