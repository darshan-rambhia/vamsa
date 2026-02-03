#!/usr/bin/env bun
/**
 * Bundle Size Checker
 *
 * Verifies that JavaScript bundles stay within defined size budgets.
 * Fails CI if any chunk exceeds its budget.
 *
 * Usage: bun scripts/check-bundle-size.ts
 *
 * Exit codes:
 * - 0: All bundles within budget
 * - 1: One or more bundles exceed budget
 */

import { readdir, stat } from "fs/promises";
import { join } from "path";

/**
 * Bundle size budgets in KB
 * These should be adjusted based on your performance goals
 */
const BUDGETS: Record<string, number> = {
  // Main application chunk - contains routing and core app logic
  main: 600, // KB
  // Feature-specific chunks
  dashboard: 700, // Slightly larger, contains dashboard components
  people: 500,
  visualize: 1200, // Larger due to D3/charting libraries
  relationships: 400,
  auth: 300,
  // Shared vendor chunks
  vendor: 300,
  // Index/entry chunks
  index: 1200,
  // HTML2Canvas and PDF libs are large
  html2canvas: 250,
  // Default fallback for unknown chunks
  default: 400,
};

/**
 * Extract chunk name from filename
 * Examples:
 * - main-abc123.js -> main
 * - dashboard-def456.js -> dashboard
 * - vendor-ghi789.js -> vendor
 * - html2canvas.esm-DXEQVQnt.js -> html2canvas
 */
function extractChunkName(filename: string): string {
  // Remove extension
  const withoutExt = filename.replace(/\.(js|css)$/, "");

  // Handle special cases like html2canvas.esm
  if (withoutExt.includes("html2canvas")) {
    return "html2canvas";
  }
  if (withoutExt.includes("svg2pdf")) {
    return "svg2pdf";
  }

  // Get first part before hash (separated by -)
  const parts = withoutExt.split("-");
  const name = parts[0] || "unknown";

  return name;
}

/**
 * Get budget for a chunk
 */
function getBudget(chunkName: string): number {
  return BUDGETS[chunkName] || BUDGETS.default;
}

/**
 * Check bundle sizes
 */
async function checkBundleSizes(): Promise<boolean> {
  const distPath = "dist/client/assets";

  try {
    // Read the dist directory
    const files = await readdir(distPath);

    const jsFiles = files.filter((f) => f.endsWith(".js"));

    if (jsFiles.length === 0) {
      console.warn("⚠️  No JavaScript files found in dist/client/assets");
      console.info(
        "Make sure to run 'bun run build' before checking bundle sizes"
      );
      return false;
    }

    console.info(
      `\nChecking bundle sizes for ${jsFiles.length} JavaScript files...\n`
    );

    let hasFailure = false;
    const results: Array<{
      filename: string;
      size: number;
      budget: number;
      status: "pass" | "warn" | "fail";
    }> = [];

    // Check each JavaScript file
    for (const file of jsFiles) {
      const filePath = join(distPath, file);
      const stats = await stat(filePath);
      const sizeKB = stats.size / 1024;

      // Extract chunk name and get budget
      const chunkName = extractChunkName(file);
      const budget = getBudget(chunkName);

      // Determine status
      let status: "pass" | "warn" | "fail" = "pass";
      if (sizeKB > budget) {
        status = "fail";
        hasFailure = true;
      } else if (sizeKB > budget * 0.9) {
        // Warn if over 90% of budget
        status = "warn";
      }

      results.push({
        filename: file,
        size: sizeKB,
        budget,
        status,
      });
    }

    // Sort by status (failures first) then by size (largest first)
    results.sort((a, b) => {
      const statusOrder = { fail: 0, warn: 1, pass: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.size - a.size; // Largest first
    });

    // Print results
    console.log("Bundle Size Report:");
    console.log("─".repeat(90));

    for (const result of results) {
      const percentage = ((result.size / result.budget) * 100).toFixed(0);
      const icon =
        result.status === "pass" ? "✓" : result.status === "warn" ? "⚠" : "✗";

      console.log(
        `${icon} ${result.filename.padEnd(45)} ${result.size.toFixed(2).padStart(8)}KB / ${String(result.budget).padStart(4)}KB (${percentage}%)`
      );
    }

    console.log("─".repeat(90));

    // Summary
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);
    const totalBudget = results.reduce((sum, r) => sum + r.budget, 0);
    const passCount = results.filter((r) => r.status === "pass").length;
    const warnCount = results.filter((r) => r.status === "warn").length;
    const failCount = results.filter((r) => r.status === "fail").length;

    console.log(
      `\nSummary: ${totalSize.toFixed(2)}KB total / ${totalBudget}KB combined budget`
    );
    console.log(
      `Bundles: ${passCount} pass, ${warnCount} warn, ${failCount} fail\n`
    );

    if (failCount > 0) {
      console.error(`❌ ${failCount} bundle(s) exceed their budget!`);
      console.log(
        "Please optimize the bundles above or update the budgets in check-bundle-size.ts"
      );
      return false;
    }

    if (warnCount > 0) {
      console.warn(`⚠️  ${warnCount} bundle(s) are over 90% of their budget`);
      console.log("Consider optimizing these bundles\n");
    } else {
      console.log("✅ All bundles are within their budgets!\n");
    }

    return true;
  } catch (error) {
    console.error("Error checking bundle sizes:", error);
    console.log(
      "Make sure to run 'bun run build' before checking bundle sizes"
    );
    process.exit(1);
  }
}

// Run the check
(async () => {
  const success = await checkBundleSizes();
  process.exit(success ? 0 : 1);
})();
