/**
 * Centralized Configuration and Environment Variables
 * 
 * This file acts as the single source of truth for all environment variables.
 * It validates that required variables are present at startup, preventing 
 * runtime errors later in the application lifecycle.
 */

// Define the shape of our environment variables
interface EnvConfig {
  API_URL: string;
  USE_MOCK_API: boolean;
  SENTRY_DSN: string;
  LOG_LEVEL: string;
  DEBUG: string;
  IS_PROD: boolean;
  IS_DEV: boolean;
}

// Extract raw values from Vite's import.meta.env
const rawEnv = {
  API_URL: import.meta.env.VITE_API_URL,
  USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API === 'true',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL,
  DEBUG: import.meta.env.VITE_DEBUG,
  IS_PROD: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,
};

// Validate required environment variables
const validateEnv = (): EnvConfig => {
  // If we are not using the mock API, we must have a real API URL
  if (!rawEnv.USE_MOCK_API && !rawEnv.API_URL) {
    throw new Error(
      "❌ Missing Environment Variable: VITE_API_URL is required when VITE_USE_MOCK_API is not 'true'. Please check your .env file."
    );
  }

  return {
    API_URL: rawEnv.API_URL || 'http://localhost:8080',
    USE_MOCK_API: rawEnv.USE_MOCK_API,
    SENTRY_DSN: rawEnv.SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
    LOG_LEVEL: rawEnv.LOG_LEVEL || (rawEnv.IS_PROD ? 'WARN' : 'DEBUG'),
    DEBUG: rawEnv.DEBUG || (rawEnv.IS_PROD ? '' : '*'),
    IS_PROD: rawEnv.IS_PROD,
    IS_DEV: rawEnv.IS_DEV,
  };
};

export const env = validateEnv();
