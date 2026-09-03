import log, { type LogLevelDesc } from 'loglevel';
import { env } from '../config/env';

// Set global log level
log.setLevel(env.LOG_LEVEL as LogLevelDesc);

const debugFilters = env.DEBUG ? env.DEBUG.split(',').map(s => s.trim()) : [];
const shouldLog = (name: string | undefined) => {
  if (debugFilters.includes('*')) return true;
  if (!name) return true; // Default logger always logs according to level
  return debugFilters.some(filter => name.startsWith(filter));
};

// Optionally prefix logs and apply performant filtering
const originalFactory = log.methodFactory;
log.methodFactory = function (methodName, logLevel, loggerName) {
  // FAST PATH: If this logger category is filtered out, return a no-op function.
  // This is evaluated once per logger initialization, making runtime logging zero-cost.
  if (typeof loggerName === 'string' && !shouldLog(loggerName)) {
    return () => {}; 
  }

  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return function (...args: any[]) {
    const time = new Date().toISOString();
    const prefix = loggerName 
      ? `[${time}] [${String(loggerName)}] [${methodName.toUpperCase()}]` 
      : `[${time}] [${methodName.toUpperCase()}]`;
    rawMethod(prefix, ...args);
  };
};

log.rebuild(); // Apply the method factory globally

/**
 * Creates or retrieves a named logger instance.
 * @param name The category name of the logger (e.g., 'api', 'auth')
 */
export const getLogger = (name: string) => {
  const logger = log.getLogger(name);
  logger.setLevel(env.LOG_LEVEL as LogLevelDesc);
  return logger;
};

export default log;
