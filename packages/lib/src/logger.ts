import pino from "pino";

/**
 * Structured logging utility using pino
 *
 * Features:
 * - Pretty formatting in development mode
 * - JSON format in production
 * - Automatic redaction of sensitive data
 * - Support for child loggers with context
 * - Request correlation IDs
 * - Performance timing helpers
 *
 * Usage:
 * ```typescript
 * import { logger } from '@vamsa/lib/logger';
 *
 * // Basic logging
 * logger.info('Application started');
 * logger.warn({ userId: '123' }, 'User action detected');
 * logger.error({ error, code: 'ERR_001' }, 'Operation failed');
 *
 * // Child logger with context
 * const requestLogger = logger.child({ requestId: 'req-123' });
 * requestLogger.info('Processing request');
 *
 * // Performance timing
 * const timer = logger.startTimer();
 * // ... do work
 * timer({ label: 'database-query' });
 * ```
 */

// Determine if we're in development based on NODE_ENV
const isDevelopment = process.env.NODE_ENV !== "production";

// Check if we're in a browser environment (pino.transport is Node.js only)
const isBrowser = typeof window !== "undefined";

// Configure logger - only use transport in Node.js development environment
const transport =
  isDevelopment && !isBrowser && typeof pino.transport === "function"
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: false,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          messageFormat: "{levelLabel} {msg}",
        },
      })
    : undefined;

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    redact: {
      paths: [
        "password",
        "passwordHash",
        "token",
        "accessToken",
        "refreshToken",
        "apiKey",
        "secret",
        "authorization",
        "credentials",
      ],
      remove: true,
    },
    // Add timestamps in production, pino-pretty handles them in dev
    timestamp: isDevelopment ? false : pino.stdTimeFunctions.isoTime,
  },
  transport
);

/**
 * Create a child logger with context
 * Useful for request handlers, server functions, etc.
 */
export function createContextLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Create a request-scoped logger with correlation ID
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

/**
 * Timing helper for performance monitoring
 * Usage: const timer = startTimer(); // do work, then timer({ label: 'operation' });
 */
export function startTimer() {
  const start = Date.now();
  return (context?: Record<string, unknown>) => {
    const duration = Date.now() - start;
    logger.info({ ...context, duration }, "Operation completed");
  };
}

/**
 * Convert an Error object to a loggable format
 */
export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: (error as Error & { cause?: unknown }).cause,
    };
  }
  return error;
}
