import { QueryClient } from '@tanstack/react-query';
import { del, get, set } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { toast } from 'sonner';
import { errorMessage } from './http';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000, // must outlive the persisted cache's maxAge
      retry: 1,
      refetchOnWindowFocus: true, // shared workspaces: pick up other members' edits
    },
    mutations: {
      onError: (error) => {
        toast.error(errorMessage(error));
      },
    },
  },
});

const KEY = 'keeper-query-cache';

/** IndexedDB persister: the app paints instantly from the last session, then revalidates. */
export const idbPersister: Persister = {
  persistClient: (client: PersistedClient) => set(KEY, client),
  restoreClient: () => get<PersistedClient>(KEY),
  removeClient: () => del(KEY),
};
