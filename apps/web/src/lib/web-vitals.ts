/**
 * Web Vitals - Real User Monitoring (RUM)
 *
 * Captures Core Web Vitals from real users and reports them to the
 * server's OpenTelemetry endpoint for Grafana dashboards.
 *
 * Metrics collected:
 * - LCP (Largest Contentful Paint) — loading performance
 * - CLS (Cumulative Layout Shift) — visual stability
 * - INP (Interaction to Next Paint) — responsiveness
 * - FCP (First Contentful Paint) — first render
 * - TTFB (Time to First Byte) — server response time
 *
 * This module is client-only and should be lazily loaded to avoid
 * impacting initial page load.
 */

import type { Metric } from "web-vitals";

/** Buffered metrics waiting to be sent */
let metricsBuffer: Array<{
  name: string;
  value: number;
  rating: string;
  id: string;
  navigationType: string;
}> = [];

/** Flush timer */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Flush interval in milliseconds */
const FLUSH_INTERVAL = 5000;

/**
 * Send buffered metrics to the server
 */
async function flushMetrics() {
  if (metricsBuffer.length === 0) return;

  const batch = [...metricsBuffer];
  metricsBuffer = [];

  try {
    // Use sendBeacon for reliability (survives page unload)
    const payload = JSON.stringify({
      metrics: batch,
      url: window.location.pathname,
      timestamp: Date.now(),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/v1/vitals", payload);
    } else {
      // Fallback for older browsers
      fetch("/api/v1/vitals", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {
        // Silently ignore — vitals reporting is best-effort
      });
    }
  } catch {
    // Silently ignore — vitals reporting is best-effort
  }
}

/**
 * Handle a web vital metric
 */
function handleMetric(metric: Metric) {
  // Log in development for debugging
  if (import.meta.env.DEV) {
    const color =
      metric.rating === "good"
        ? "green"
        : metric.rating === "needs-improvement"
          ? "orange"
          : "red";
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(1)} (${metric.rating})`,
      `color: ${color}; font-weight: bold`
    );
  }

  metricsBuffer.push({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Schedule flush
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushMetrics();
    }, FLUSH_INTERVAL);
  }
}

/**
 * Initialize Web Vitals collection
 *
 * Dynamically imports the web-vitals library to keep it out of the
 * critical path. Call this once from the root client component.
 */
export async function initWebVitals() {
  try {
    const { onLCP, onCLS, onINP, onFCP, onTTFB } = await import("web-vitals");

    onLCP(handleMetric);
    onCLS(handleMetric);
    onINP(handleMetric);
    onFCP(handleMetric);
    onTTFB(handleMetric);

    // Flush on page unload
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushMetrics();
      }
    });
  } catch {
    // Silently ignore — web vitals not available (e.g., SSR, unsupported browser)
  }
}
