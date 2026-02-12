/**
 * Lighthouse CI Configuration
 *
 * Runs automated performance and accessibility audits against key pages.
 * Used both locally (`bun run lighthouse`) and in CI via GitHub Actions.
 *
 * Pages tested:
 * - Login (public, unauthenticated entry point)
 * - Dashboard (authenticated landing page)
 * - People list (data-heavy listing)
 * - Person detail (profile page)
 * - Visualize (chart page with D3)
 */

module.exports = {
  ci: {
    collect: {
      // Build output directory — Lighthouse serves static files from here
      staticDistDir: "./apps/web/dist/client",

      // Use the production build server for SSR pages
      startServerCommand:
        "cd apps/web && NODE_ENV=production bun run server/index.ts",
      startServerReadyPattern: "Server running",
      startServerReadyTimeout: 30000,

      // Pages to audit (relative to server)
      url: ["http://localhost:3000/login", "http://localhost:3000/"],

      // Number of runs per URL for statistical significance
      numberOfRuns: 3,

      settings: {
        // Use mobile preset (stricter, default for Lighthouse)
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
        // LCP: Largest Contentful Paint < 2.5s
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        // CLS: Cumulative Layout Shift < 0.1
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        // TBT: Total Blocking Time < 300ms (proxy for INP)
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        // FCP: First Contentful Paint < 1.8s
        "first-contentful-paint": ["warn", { maxNumericValue: 1800 }],
        // Speed Index < 3.4s
        "speed-index": ["warn", { maxNumericValue: 3400 }],
      },
    },

    upload: {
      // Store results locally (no external server needed)
      target: "temporary-public-storage",
    },
  },
};
