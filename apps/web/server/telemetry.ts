/**
 * OpenTelemetry Configuration for Vamsa
 *
 * Provides distributed tracing and metrics collection for the Bun/Hono server.
 * Exports to OTLP-compatible backends (e.g., Jaeger, Grafana Tempo, Prometheus).
 *
 * Features:
 * - Automatic HTTP instrumentation
 * - Custom resource attributes (service name, version)
 * - Graceful shutdown handling
 * - Environment-based configuration
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  resourceFromAttributes,
  defaultResource,
} from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { logger, serializeError } from "@vamsa/lib/logger";

// SDK instance for shutdown handling
let sdk: NodeSDK | null = null;

// Helper to get current config (checked at runtime)
function getConfig() {
  return {
    enabled: process.env.OTEL_ENABLED !== "false",
    endpoint:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
    serviceName: process.env.OTEL_SERVICE_NAME || "vamsa-web",
    serviceVersion: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  };
}

/**
 * Create the OpenTelemetry resource with service metadata
 */
function createResource() {
  const config = getConfig();
  const customResource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    "deployment.environment": config.environment,
    "service.instance.id": `${config.serviceName}-${process.pid}`,
  });
  return defaultResource().merge(customResource);
}

/**
 * Start the OpenTelemetry SDK
 *
 * Initializes tracing and metrics collection with OTLP exporters.
 * Safe to call multiple times (no-op if already started).
 */
export async function startTelemetry(): Promise<void> {
  const config = getConfig();

  if (!config.enabled) {
    logger.info("OpenTelemetry disabled via OTEL_ENABLED=false");
    return;
  }

  if (sdk) {
    logger.warn("OpenTelemetry already initialized");
    return;
  }

  try {
    const resource = createResource();

    // Configure trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${config.endpoint}/v1/traces`,
    });

    // Configure metrics exporter with periodic reader
    const metricExporter = new OTLPMetricExporter({
      url: `${config.endpoint}/v1/metrics`,
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      // Export metrics every 60 seconds (adjust for your needs)
      exportIntervalMillis: 60000,
      // Timeout for metric export
      exportTimeoutMillis: 30000,
    });

    // Initialize the SDK with auto-instrumentation
    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation (too noisy for file-based operations)
          "@opentelemetry/instrumentation-fs": { enabled: false },
          // Configure HTTP instrumentation
          "@opentelemetry/instrumentation-http": {
            enabled: true,
            // Ignore health checks and metrics endpoints
            ignoreIncomingPaths: ["/health", "/health/cache", "/metrics"],
            // Ignore outgoing requests to OTLP endpoint
            ignoreOutgoingUrls: [new RegExp(`^${config.endpoint}`)],
          },
          // Disable DNS instrumentation (usually not needed)
          "@opentelemetry/instrumentation-dns": { enabled: false },
          // Disable net instrumentation (covered by HTTP)
          "@opentelemetry/instrumentation-net": { enabled: false },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    logger.info(
      {
        service: config.serviceName,
        version: config.serviceVersion,
        endpoint: config.endpoint,
        environment: config.environment,
      },
      "OpenTelemetry started"
    );
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Failed to start OpenTelemetry"
    );
    // Don't throw - telemetry failure shouldn't crash the app
  }
}

/**
 * Stop the OpenTelemetry SDK
 *
 * Flushes any pending traces/metrics and shuts down exporters.
 * Safe to call multiple times (no-op if not started).
 */
export async function stopTelemetry(): Promise<void> {
  if (!sdk) {
    return;
  }

  try {
    await sdk.shutdown();
    sdk = null;
    logger.info("OpenTelemetry stopped");
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Error stopping OpenTelemetry"
    );
  }
}

/**
 * Check if OpenTelemetry is enabled and running
 */
export function isTelemetryEnabled(): boolean {
  const config = getConfig();
  return config.enabled && sdk !== null;
}

/**
 * Get telemetry configuration (for health checks)
 */
export function getTelemetryConfig() {
  const config = getConfig();
  return {
    enabled: config.enabled,
    running: sdk !== null,
    service: config.serviceName,
    version: config.serviceVersion,
    endpoint: config.endpoint,
    environment: config.environment,
  };
}
