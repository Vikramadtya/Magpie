import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import { env } from './lib/env';

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Financial data must never leave the browser in error reports.
    beforeSend: (event) => {
      delete event.request?.data;
      return event;
    },
  });
}

// After a deploy, a stale tab or service worker may request chunks that no longer exist.
// Reload once to pick up the new build (guarded so a real outage can't loop).
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('keeper.reloaded') === '1') return;
  sessionStorage.setItem('keeper.reloaded', '1');
  void navigator.serviceWorker?.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister())));
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
