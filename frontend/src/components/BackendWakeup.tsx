import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { env } from '../config/env';

export function BackendWakeup() {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current || env.USE_MOCK_API) return;
    hasStarted.current = true;

    let toastId: string | number | undefined;
    let isReady = false;

    const checkHealth = async () => {
      // If the backend doesn't respond quickly (1.5s), assume it's waking up from sleep and show a toast
      const timeoutId = setTimeout(() => {
        if (!isReady) {
          toastId = toast.loading('Backend server is waking up from sleep... Please wait.', {
            duration: Infinity, // Never disappear until ready
            dismissible: false,
          });
        }
      }, 1500);

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
            if (toastId) {
              toast.success('Backend server is ready!', { id: toastId, duration: 4000 });
            }
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
