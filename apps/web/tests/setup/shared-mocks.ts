/**
 * Shared mock implementations for tests
 *
 * This file provides shared mock implementations that can be used across
 * multiple test files. Using shared mocks ensures all tests use the same
 * mock objects for consistent verification.
 */

import { vi } from "vitest";

/**
 * Shared logger mock - tracks all logging calls (OLD pino logger pattern)
 * Reset with mockLogger.info.mockClear() etc in beforeEach
 */
export const mockLogger = {
  trace: vi.fn(() => undefined),
  debug: vi.fn(() => undefined),
  info: vi.fn(() => undefined),
  warn: vi.fn(() => undefined),
  error: vi.fn(() => undefined),
  fatal: vi.fn(() => undefined),
  child: vi.fn(() => mockLogger),
};

/**
 * Create a mock error log builder for the fluent API
 */
export const mockWithErrBuilder = {
  ctx: vi.fn(() => mockWithErrBuilder),
  msg: vi.fn(() => undefined),
};

export const mockWithErr = vi.fn(() => mockWithErrBuilder);

/**
 * Shared domain logger mock - all domain loggers share these mocks
 * This allows tests to verify calls using mockLogger.info, etc.
 * regardless of which domain logger (auth, db, etc.) is used
 */
export const mockDomainLogger = {
  debug: mockLogger.debug,
  info: mockLogger.info,
  warn: mockLogger.warn,
  error: mockLogger.error,
  fatal: mockLogger.fatal,
  withErr: mockWithErr,
  child: vi.fn(() => mockDomainLogger),
};

/**
 * Shared domain loggers mock - all domains share the same underlying mocks
 * Tests can verify calls using mockLogger.info, mockWithErr, etc.
 */
export const mockLoggers = {
  auth: mockDomainLogger,
  db: mockDomainLogger,
  api: mockDomainLogger,
  jobs: mockDomainLogger,
  email: mockDomainLogger,
  media: mockDomainLogger,
  seed: mockDomainLogger,
};

/**
 * Main log export mock (equivalent to createDomainLoggerFromPino(logger))
 */
export const mockLog = mockDomainLogger;

/**
 * Shared serializeError mock - matches the real implementation
 */
export const mockSerializeError = vi.fn((error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: (error as Error & { cause?: unknown }).cause,
    };
  }
  if (typeof error === "object" && error !== null) {
    return error as Record<string, unknown>;
  }
  return { value: error };
});

/**
 * Shared createContextLogger mock - returns a logger with the same interface
 */
export const mockCreateContextLogger = vi.fn((_context: unknown) => ({
  trace: vi.fn((..._args: Array<unknown>) => undefined),
  debug: vi.fn((..._args: Array<unknown>) => undefined),
  info: vi.fn((..._args: Array<unknown>) => undefined),
  warn: vi.fn((..._args: Array<unknown>) => undefined),
  error: vi.fn((..._args: Array<unknown>) => undefined),
  fatal: vi.fn((..._args: Array<unknown>) => undefined),
}));

/**
 * Shared createRequestLogger mock - returns a domain logger
 */
export const mockCreateRequestLogger = vi.fn(
  (_requestId: string) => mockDomainLogger
);

/**
 * Shared startTimer mock - returns a function that returns elapsed time
 */
export const mockStartTimer = vi.fn(() => vi.fn(() => 0));

/**
 * Clear all mock call histories
 * Call this in beforeEach to reset state between tests
 */
export function clearAllMocks() {
  // Logger mocks (shared between old logger and domain loggers)
  mockLogger.trace.mockClear();
  mockLogger.debug.mockClear();
  mockLogger.info.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.error.mockClear();
  mockLogger.fatal.mockClear();

  // Domain logger specific mocks
  mockWithErr.mockClear();
  mockWithErrBuilder.ctx.mockClear();
  mockWithErrBuilder.msg.mockClear();
  mockDomainLogger.child.mockClear();

  // Other mocks
  mockSerializeError.mockClear();
  mockCreateContextLogger.mockClear();
}
