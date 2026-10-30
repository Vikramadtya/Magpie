/** Build-time configuration. The API is same-origin unless VITE_API_URL says otherwise. */
export const env = {
  API_URL: (import.meta.env.VITE_API_URL as string | undefined) ?? '',
  SENTRY_DSN: (import.meta.env.VITE_SENTRY_DSN as string | undefined) ?? '',
  IS_PROD: import.meta.env.PROD,
};
