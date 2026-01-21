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
 * Shared logger mock - tracks all logging calls
 * Reset with mockLogger.info.mockClear() etc in beforeEach
 */
export const mockLogger = {
  trace: mock(() => undefined),
  debug: mock(() => undefined),
  info: mock(() => undefined),
  warn: mock(() => undefined),
  error: mock(() => undefined),
  fatal: mock(() => undefined),
};

/**
 * Shared serializeError mock
 */
export const mockSerializeError = mock((error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: (error as Error & { cause?: unknown }).cause,
    };
  }
  return error;
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
 * Shared createRequestLogger mock - returns a logger with the same interface
 */
export const mockCreateRequestLogger = mock((_requestId: string) => ({
  trace: mock((..._args: unknown[]) => undefined),
  debug: mock((..._args: unknown[]) => undefined),
  info: mock((..._args: unknown[]) => undefined),
  warn: mock((..._args: unknown[]) => undefined),
  error: mock((..._args: unknown[]) => undefined),
  fatal: mock((..._args: unknown[]) => undefined),
}));

/**
 * Shared startTimer mock - returns a function that returns elapsed time
 */
export const mockStartTimer = mock(() => mock(() => 0));

/**
 * Clear all mock call histories
 * Call this in beforeEach to reset state between tests
 */
export function clearAllMocks() {
  mockLogger.trace.mockClear();
  mockLogger.debug.mockClear();
  mockLogger.info.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.error.mockClear();
  mockLogger.fatal.mockClear();
  mockSerializeError.mockClear();
  mockCreateContextLogger.mockClear();
}
