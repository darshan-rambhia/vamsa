import pino from "pino";
import type { LoggerOptions, Logger as PinoLogger } from "pino";

/**
 * Structured Logging Utility
 *
 * This module provides structured logging with enforced context patterns.
 *
 * ## Usage Patterns
 *
 * ### Basic Logging
 * ```typescript
 * import { log } from '@vamsa/lib/logger';
 *
 * log.info({ userId: '123', action: 'login' }, 'User logged in');
 * log.warn({ endpoint: '/old' }, 'Deprecated endpoint used');
 * log.error({ code: 'AUTH_001' }, 'Authentication failed');
 * ```
 *
 * ### Error Object Logging (fluent API)
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   log.withErr(error).msg('Operation failed');
 *   // Or with additional context:
 *   log.withErr(error).ctx({ userId: '123' }).msg('Operation failed');
 * }
 * ```
 *
 * ### Domain-Specific Loggers
 * ```typescript
 * import { loggers } from '@vamsa/lib/logger';
 *
 * loggers.auth.info({ userId: '123' }, 'Login successful');
 * loggers.db.withErr(error).msg('Query failed');
 * ```
 *
 * ### Request-Scoped Loggers
 * ```typescript
 * import { createRequestLogger } from '@vamsa/lib/logger';
 *
 * const reqLog = createRequestLogger(requestId, { userId: session.userId });
 * reqLog.info({ path: '/api/users' }, 'Request started');
 * ```
 *
 * ## Best Practices
 *
 * 1. **Always include context**: `log.info({ key: 'value' }, 'message')`
 * 2. **Use fluent API for errors**: `log.withErr(error).msg('what failed')`
 * 3. **Use domain loggers**: `loggers.auth`, `loggers.db`, etc.
 * 4. **Include correlation IDs**: Use request loggers for tracing
 */

// ============================================================================
// Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV !== "production";
const isBrowser = typeof globalThis !== "undefined" && "window" in globalThis;

const transport =
  isDevelopment && !isBrowser && typeof pino.transport === "function"
    ? pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
          translateTime: "SYS:HH:MM:ss",
          ignore: "pid,hostname",
        },
      })
    : undefined;

const loggerOptions: LoggerOptions = {
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
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.secret",
    ],
    remove: true,
  },
  timestamp: isDevelopment ? false : pino.stdTimeFunctions.isoTime,
};

// ============================================================================
// Core Logger Instance
// ============================================================================

/**
 * Base pino logger instance.
 * Prefer using `log` or `loggers.*` for better patterns.
 */
export const logger: PinoLogger = pino(loggerOptions, transport);

// ============================================================================
// Types
// ============================================================================

/**
 * Context object for structured logging.
 */
export interface LogContext {
  domain?: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Fluent builder for error logging.
 */
export interface ErrorLogBuilder {
  /** Add additional context to the error log */
  ctx: (context: LogContext) => ErrorLogBuilder;
  /** Log the error with a message */
  msg: (message: string) => void;
}

/**
 * Domain logger interface with fluent error API.
 */
export interface DomainLogger {
  debug: (context: LogContext, message: string) => void;
  info: (context: LogContext, message: string) => void;
  warn: (context: LogContext, message: string) => void;
  error: (context: LogContext, message: string) => void;
  fatal: (context: LogContext, message: string) => void;
  /**
   * Log an error object with fluent API.
   *
   * ```typescript
   * log.withErr(error).msg('Operation failed');
   * log.withErr(error).ctx({ userId: '123' }).msg('User operation failed');
   * ```
   */
  withErr: (error: unknown) => ErrorLogBuilder;
  /** Create a child logger with additional context */
  child: (context: LogContext) => DomainLogger;
}

// ============================================================================
// Error Serialization
// ============================================================================

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: (error as Error & { cause?: unknown }).cause
        ? serializeError((error as Error & { cause?: unknown }).cause)
        : undefined,
    };
  }
  if (typeof error === "object" && error !== null) {
    return error as Record<string, unknown>;
  }
  return { value: error };
}

// ============================================================================
// Error Log Builder
// ============================================================================

function createErrorBuilder(
  pinoLogger: PinoLogger,
  error: unknown
): ErrorLogBuilder {
  let additionalContext: LogContext = {};

  return {
    ctx(context: LogContext): ErrorLogBuilder {
      additionalContext = { ...additionalContext, ...context };
      return this;
    },
    msg(message: string): void {
      pinoLogger.error(
        {
          ...additionalContext,
          error: serializeError(error),
        },
        message
      );
    },
  };
}

// ============================================================================
// Domain Logger Factory
// ============================================================================

function createDomainLoggerFromPino(pinoLogger: PinoLogger): DomainLogger {
  return {
    debug(context: LogContext, message: string): void {
      pinoLogger.debug(context, message);
    },
    info(context: LogContext, message: string): void {
      pinoLogger.info(context, message);
    },
    warn(context: LogContext, message: string): void {
      pinoLogger.warn(context, message);
    },
    error(context: LogContext, message: string): void {
      pinoLogger.error(context, message);
    },
    fatal(context: LogContext, message: string): void {
      pinoLogger.fatal(context, message);
    },
    withErr(error: unknown): ErrorLogBuilder {
      return createErrorBuilder(pinoLogger, error);
    },
    child(context: LogContext): DomainLogger {
      return createDomainLoggerFromPino(pinoLogger.child(context));
    },
  };
}

/**
 * Create a domain-specific logger.
 *
 * ```typescript
 * const authLog = createLogger('auth');
 * authLog.info({ userId: '123' }, 'Login successful');
 * authLog.withErr(error).msg('Authentication failed');
 * ```
 */
export function createLogger(domain: string): DomainLogger {
  return createDomainLoggerFromPino(logger.child({ domain }));
}

// ============================================================================
// Request-Scoped Loggers
// ============================================================================

/**
 * Create a request-scoped logger with correlation ID.
 *
 * ```typescript
 * const reqLog = createRequestLogger(requestId, { userId: session?.userId });
 * reqLog.info({ path: req.path }, 'Request started');
 * reqLog.withErr(error).msg('Request failed');
 * ```
 */
export function createRequestLogger(
  requestId: string,
  additionalContext?: LogContext
): DomainLogger {
  return createDomainLoggerFromPino(
    logger.child({ requestId, ...additionalContext })
  );
}

// ============================================================================
// Main Log Interface
// ============================================================================

/**
 * Main structured logger.
 *
 * ```typescript
 * log.info({ userId: '123' }, 'User action');
 * log.error({ code: 'ERR_001' }, 'Something failed');
 * log.withErr(error).msg('Exception caught');
 * log.withErr(error).ctx({ userId: '123' }).msg('User operation failed');
 * ```
 */
export const log: DomainLogger = createDomainLoggerFromPino(logger);

// ============================================================================
// Performance Timing
// ============================================================================

/**
 * Start a timer for measuring operation duration.
 *
 * ```typescript
 * const timer = startTimer();
 * await performOperation();
 * timer({ operation: 'database-sync' });
 * ```
 */
export function startTimer(): (context?: LogContext) => void {
  const start = Date.now();
  return (context?: LogContext) => {
    const duration = Date.now() - start;
    logger.info({ ...context, duration }, "Operation completed");
  };
}

// ============================================================================
// Pre-configured Domain Loggers
// ============================================================================

/**
 * Pre-configured loggers for common domains.
 *
 * ```typescript
 * loggers.auth.info({ userId: '123' }, 'User authenticated');
 * loggers.db.withErr(error).msg('Query failed');
 * loggers.api.warn({ endpoint: '/old' }, 'Deprecated');
 * ```
 */
export const loggers = {
  /** Authentication and authorization */
  auth: createLogger("auth"),
  /** Database operations */
  db: createLogger("database"),
  /** API/HTTP layer */
  api: createLogger("api"),
  /** Background jobs and tasks */
  jobs: createLogger("jobs"),
  /** Email and notifications */
  email: createLogger("email"),
  /** File and media operations */
  media: createLogger("media"),
  /** Seed and migration scripts */
  seed: createLogger("seed"),
} as const;

// ============================================================================
// Deprecated exports (for backwards compatibility)
// ============================================================================

/** @deprecated Use `createLogger(domain).child(context)` instead */
export function createContextLogger(context: LogContext): PinoLogger {
  return logger.child(context);
}
