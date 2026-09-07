import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { RouterProvider } from 'react-router-dom';
import { router } from './providers/router';
import { useEffect } from 'react';
import { useSettingsStore } from './store/useSettingsStore';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { queryClient } from './providers/queryClient';
import log from './utils/logger';

function AppInitialData() {
  const fetchSettings = useSettingsStore(state => state.fetchSettings);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const workspaceId = localStorage.getItem('workspaceId');
    const userId = localStorage.getItem('userId');

    if (token && workspaceId) {
      log.debug('AppInitialData: Token and WorkspaceID found. Fetching initial settings...');
      const loadInitialData = async () => {
        try {
          await Promise.all([
            userId ? fetchSettings(userId) : Promise.resolve()
          ]);
          log.debug('AppInitialData: Initial data loaded successfully.');
        } catch (error) {
          log.error('AppInitialData: Failed to load initial data', error);
        }
      };

      loadInitialData();
    } else {
      log.debug('AppInitialData: No active session found.');
    }
  }, [fetchSettings]);

  return null;
}

import { BackendWakeup } from './components/BackendWakeup';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors theme="dark" />
      <BackendWakeup />
      <AppInitialData />
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
