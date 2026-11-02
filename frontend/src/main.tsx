import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
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

// /quickadd is a separate, tiny app: it never loads Keeper's login or talks to the main server,
// so it opens instantly even while that server is asleep.
const isQuickAdd = window.location.pathname.startsWith('/quickadd');
if (isQuickAdd) {
  // Give this page its own home-screen identity: opens /quickadd and is named "Quick add".
  document.querySelector('link[rel="manifest"]')?.setAttribute('href', '/quickadd.webmanifest');
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', 'Quick add');
  document.title = 'Quick add';
}
const boot = isQuickAdd ? import('./quickadd/QuickAddApp') : import('./App');
const root = createRoot(document.getElementById('root')!);
void boot.then(({ default: Root }) =>
  root.render(
    <StrictMode>
      <Root />
    </StrictMode>,
  ),
);
