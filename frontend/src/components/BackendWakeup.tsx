import { useEffect, useRef } from 'react';
import { env } from '../lib/env';

export function BackendWakeup() {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    let isReady = false;

    const checkHealth = async () => {
      const timeoutId = setTimeout(() => undefined, 0);

      const poll = async () => {
        try {
          // Use fetch directly to bypass axios interceptors (which might trigger logout on error)
          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 10000); // 10s timeout per poll
          
          const res = await fetch(`${env.API_URL}/health`, {
            signal: controller.signal,
            method: 'GET'
          });
          
          clearTimeout(fetchTimeout);

          if (res.ok) {
            isReady = true;
            clearTimeout(timeoutId);
            return; // Success, stop polling
          }
        } catch (err) {
          // Ignore errors, just means it's still down/waking up
        }

        // Keep polling every 3 seconds until ready
        if (!isReady) {
          setTimeout(poll, 3000);
        }
      };

      poll();
    };

    checkHealth();
  }, []);

  return null;
}
