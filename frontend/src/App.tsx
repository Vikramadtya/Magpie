import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { RouterProvider } from 'react-router-dom';
import { router } from './providers/router';
import { useEffect } from 'react';
import { useSettingsStore } from './store/useSettingsStore';

// Create a client with global error handling
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppInitialData() {
  const fetchSettings = useSettingsStore(state => state.fetchSettings);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const workspaceId = localStorage.getItem('workspaceId');
    const userId = localStorage.getItem('userId');

    if (token && workspaceId) {
      const loadInitialData = async () => {
        try {
          await Promise.all([
            userId ? fetchSettings(userId) : Promise.resolve()
          ]);
        } catch (error) {
          console.error("Failed to load initial data", error);
        }
      };

      loadInitialData();
    }
  }, [fetchSettings]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors theme="dark" />
      <AppInitialData />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
