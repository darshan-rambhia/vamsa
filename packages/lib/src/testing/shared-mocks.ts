/**
 * Shared mock implementations for tests
 *
 * This file provides shared mock implementations that can be used across
 * multiple test files. Using shared mocks prevents mock.module() pollution
 * where different test files define conflicting mocks for the same modules.
 *
 * IMPORTANT: When multiple test files mock the same module using mock.module(),
 * only the first mock takes effect (due to how Bun's module cache works).
 * By using shared mocks, all tests use the same implementation.
 */

import { mock } from "bun:test";

/**
 * Shared logger mock - tracks all logging calls (OLD pino logger pattern)
 * Reset with mockLogger.info.mockClear() etc in beforeEach
 */
export const mockLogger = {
  trace: mock(() => undefined),
  debug: mock(() => undefined),
  info: mock(() => undefined),
  warn: mock(() => undefined),
  error: mock(() => undefined),
  fatal: mock(() => undefined),
  child: mock(() => mockLogger),
};

/**
 * Shared mock for withErr fluent API - returns builder with shared mocks
 */
export const mockWithErrBuilder = {
  ctx: mock(() => mockWithErrBuilder),
  msg: mock(() => undefined),
};

export const mockWithErr = mock(() => mockWithErrBuilder);

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
  child: mock(() => mockDomainLogger),
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
 * Shared serializeError mock
 */
export const mockSerializeError = mock((error: unknown) => {
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
export const mockCreateContextLogger = mock((_context: unknown) => ({
  trace: mock((..._args: unknown[]) => undefined),
  debug: mock((..._args: unknown[]) => undefined),
  info: mock((..._args: unknown[]) => undefined),
  warn: mock((..._args: unknown[]) => undefined),
  error: mock((..._args: unknown[]) => undefined),
  fatal: mock((..._args: unknown[]) => undefined),
}));

/**
 * Shared createRequestLogger mock - returns a domain logger
 */
export const mockCreateRequestLogger = mock(
  (_requestId: string) => mockDomainLogger
);

/**
 * Shared startTimer mock - returns a function that returns elapsed time
 */
export const mockStartTimer = mock(() => mock(() => 0));

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
