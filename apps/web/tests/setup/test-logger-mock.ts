/**
 * Test setup file
 *
 * This file is loaded before tests run to set up global test configuration.
 * Note: We don't mock @vamsa/lib/logger here because it causes module leaking
 * issues with Bun's mock.module. Instead, we use LOG_LEVEL=error in the test
 * command to suppress most log output.
 */

export {};
