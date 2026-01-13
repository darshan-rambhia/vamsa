/**
 * Tests for OpenTelemetry configuration
 *
 * These tests verify that the telemetry module exports the expected functions
 * and that they behave correctly when called.
 *
 * Note: Tests run with OTEL_ENABLED=false to avoid starting the actual SDK
 * which requires network connections.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  startTelemetry,
  stopTelemetry,
  isTelemetryEnabled,
  getTelemetryConfig,
} from "./telemetry";

describe("telemetry", () => {
  // Store original env values
  const originalOtelEnabled = process.env.OTEL_ENABLED;
  const originalServiceName = process.env.OTEL_SERVICE_NAME;
  const originalEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  beforeAll(() => {
    // Disable OTEL for tests to avoid network connections
    process.env.OTEL_ENABLED = "false";
  });

  afterAll(async () => {
    // Ensure cleanup
    await stopTelemetry();

    // Restore original env
    if (originalOtelEnabled === undefined) {
      delete process.env.OTEL_ENABLED;
    } else {
      process.env.OTEL_ENABLED = originalOtelEnabled;
    }
    if (originalServiceName === undefined) {
      delete process.env.OTEL_SERVICE_NAME;
    } else {
      process.env.OTEL_SERVICE_NAME = originalServiceName;
    }
    if (originalEndpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEndpoint;
    }
  });

  describe("getTelemetryConfig", () => {
    test("returns configuration object with expected properties", () => {
      const config = getTelemetryConfig();

      expect(config).toHaveProperty("enabled");
      expect(config).toHaveProperty("running");
      expect(config).toHaveProperty("service");
      expect(config).toHaveProperty("version");
      expect(config).toHaveProperty("endpoint");
      expect(config).toHaveProperty("environment");
    });

    test("returns disabled when OTEL_ENABLED is false", () => {
      const config = getTelemetryConfig();
      expect(config.enabled).toBe(false);
    });

    test("returns default service name when not configured", () => {
      const config = getTelemetryConfig();
      expect(config.service).toBe("vamsa-web");
    });

    test("returns default endpoint when not configured", () => {
      const config = getTelemetryConfig();
      expect(config.endpoint).toBe("http://localhost:4318");
    });
  });

  describe("isTelemetryEnabled", () => {
    test("returns false when OTEL_ENABLED is false", () => {
      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe("startTelemetry (disabled mode)", () => {
    test("does not throw when OTEL_ENABLED is false", async () => {
      await expect(startTelemetry()).resolves.toBeUndefined();
    });

    test("does not start SDK when disabled", async () => {
      await startTelemetry();
      expect(isTelemetryEnabled()).toBe(false);
    });
  });

  describe("stopTelemetry", () => {
    test("does not throw when SDK was never started", async () => {
      await expect(stopTelemetry()).resolves.toBeUndefined();
    });

    test("can be called multiple times safely", async () => {
      await stopTelemetry();
      await stopTelemetry();
      // No error means success
      expect(true).toBe(true);
    });
  });
});
