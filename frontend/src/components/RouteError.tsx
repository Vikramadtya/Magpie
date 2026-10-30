import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button } from './ui/Button';

const isChunkError = (e: unknown) => e instanceof Error && /dynamically imported module|Importing a module script failed/i.test(e.message);

/** Friendly fallback for route errors; a stale-deploy chunk failure reloads once automatically. */
export function RouteError() {
  const error = useRouteError();
  const stale = isChunkError(error);

  useEffect(() => {
    if (stale && sessionStorage.getItem('keeper.reloaded') !== '1') {
      sessionStorage.setItem('keeper.reloaded', '1');
      void navigator.serviceWorker?.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister())));
      window.location.reload();
    }
  }, [stale]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">{stale ? 'A new version is available' : 'Something went wrong'}</h1>
      <p className="text-secondary max-w-md">{stale ? 'Reload to get the latest version of Keeper.' : 'An unexpected error occurred. Try reloading the page.'}</p>
      <Button onClick={() => window.location.assign('/')}>Reload</Button>
    </div>
  );
}
