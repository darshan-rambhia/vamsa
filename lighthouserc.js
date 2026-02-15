/**
 * Lighthouse CI Configuration
 *
 * Runs automated performance and accessibility audits against the static
 * client build output. Uses LHCI's built-in static server (no database
 * or backend required).
 *
 * Pages tested:
 * - / (entry point — redirects to login for unauthenticated users)
 */

module.exports = {
  ci: {
    collect: {
      // LHCI serves static files from the client build output
      staticDistDir: "./apps/web/dist/client",

      // Number of runs per URL for statistical significance
      numberOfRuns: 3,

      settings: {
        preset: "desktop",
        // Skip network throttling in CI for consistency
        throttlingMethod: "simulate",
        // Chrome flags for CI environment
        chromeFlags: "--no-sandbox --headless --disable-gpu",
      },
    },

    assert: {
      assertions: {
        // Performance score (0-1 scale)
        "categories:performance": ["warn", { minScore: 0.7 }],
        // Accessibility score
        "categories:accessibility": ["error", { minScore: 0.9 }],
        // Best practices
        "categories:best-practices": ["warn", { minScore: 0.8 }],
        // SEO basics
        "categories:seo": ["warn", { minScore: 0.7 }],

        // Core Web Vitals
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        "speed-index": ["warn", { maxNumericValue: 3400 }],
      },
    },

    upload: {
      target: "temporary-public-storage",
    },
  },
};
