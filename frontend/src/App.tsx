import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { BackendWakeup } from './components/BackendWakeup';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { idbPersister, queryClient } from './lib/queryClient';
import { router } from './router';

/** Persist the cache per user so one account's data is never shown to another. */
function DataProvider() {
  const { user, status } = useAuth();
  // Wait for auth so the cache buster (user id) is known; otherwise a reload would always discard the cache.
  if (status === 'loading') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: idbPersister, maxAge: 24 * 60 * 60 * 1000, buster: user?.id ?? 'anon' }}
    >
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </PersistQueryClientProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster position="top-center" richColors closeButton />
      <BackendWakeup />
      <ErrorBoundary>
        <AuthProvider>
          <DataProvider />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
