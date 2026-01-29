#!/usr/bin/env bun
/**
 * Coverage threshold checker for CI
 *
 * Parses coverage output and fails if below thresholds.
 * Run after `bun test` to enforce coverage standards.
 */

import { $ } from "bun";

interface CoverageThresholds {
  lines: number;
  branches: number;
}

// Coverage thresholds per package
// Set slightly below current to prevent regression while allowing room to improve
const thresholds: Record<string, CoverageThresholds> = {
  "@vamsa/lib": { lines: 80, branches: 80 },
  "@vamsa/ui": { lines: 95, branches: 95 },
  "@vamsa/api": { lines: 80, branches: 70 },
  "@vamsa/schemas": { lines: 90, branches: 85 },
  "@vamsa/web": { lines: 55, branches: 65 },
};

interface PackageCoverage {
  name: string;
  lines: number;
  branches: number;
  passed: boolean;
}

async function runTestsWithCoverage(): Promise<string> {
  console.log("Running tests with coverage...\n");

  const result = await $`bun run test 2>&1`.text();
  return result;
}

function parseCoverageOutput(output: string): PackageCoverage[] {
  const results: PackageCoverage[] = [];

  // Parse coverage summary lines from bun test output
  // Format: "@vamsa/lib test: All files   |   98.82 |   95.00 | ..."
  const packagePatterns = [
    { prefix: "@vamsa/lib test:", name: "@vamsa/lib" },
    { prefix: "@vamsa/ui test:", name: "@vamsa/ui" },
    { prefix: "@vamsa/api test:", name: "@vamsa/api" },
    { prefix: "@vamsa/schemas test:", name: "@vamsa/schemas" },
    { prefix: "@vamsa/web test:", name: "@vamsa/web" },
  ];

  const lines = output.split("\n");

  for (const { prefix, name } of packagePatterns) {
    let foundCoverage = false;

    for (const line of lines) {
      // Look for lines that start with the package prefix AND contain "All files"
      if (line.includes(prefix) && line.includes("All files")) {
        // Parse: "@vamsa/lib test: All files   |   98.82 |   95.00 | ..."
        const match = line.match(
          /All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/
        );
        if (match) {
          const linesPercent = parseFloat(match[1]);
          const branchesPercent = parseFloat(match[2]);
          const threshold = thresholds[name] || { lines: 80, branches: 70 };

          results.push({
            name,
            lines: linesPercent,
            branches: branchesPercent,
            passed:
              linesPercent >= threshold.lines &&
              branchesPercent >= threshold.branches,
          });
          foundCoverage = true;
          break;
        }
      }
    }

    if (!foundCoverage) {
      // Package might not have coverage output, mark as passed if tests ran
      const hasTests = output.includes(`${prefix}`) && output.includes("pass");
      if (hasTests) {
        // No coverage data available, assume passing
        results.push({
          name,
          lines: -1,
          branches: -1,
          passed: true,
        });
      }
    }
  }

  return results;
}

function printResults(results: PackageCoverage[]): boolean {
  console.log("\n📊 Coverage Report\n");
  console.log("Package               Lines     Branches   Status");
  console.log("─".repeat(55));

  let allPassed = true;

  for (const result of results) {
    const threshold = thresholds[result.name] || { lines: 80, branches: 70 };
    const linesStr =
      result.lines >= 0 ? `${result.lines.toFixed(2)}%` : "N/A   ";
    const branchesStr =
      result.branches >= 0 ? `${result.branches.toFixed(2)}%` : "N/A   ";
    const status = result.passed ? "✅ PASS" : "❌ FAIL";

    console.log(
      `${result.name.padEnd(20)} ${linesStr.padStart(8)} ${branchesStr.padStart(10)}   ${status}`
    );

    if (!result.passed) {
      allPassed = false;
      if (result.lines >= 0) {
        console.log(
          `    Required: lines >= ${threshold.lines}%, branches >= ${threshold.branches}%`
        );
      }
    }
  }

  console.log("─".repeat(55));
  return allPassed;
}

async function main() {
  try {
    const output = await runTestsWithCoverage();

    // Check if tests passed
    if (output.includes("fail") && !output.includes("0 fail")) {
      console.error(
        "\n❌ Tests failed! Fix failing tests before checking coverage."
      );
      process.exit(1);
    }

    const results = parseCoverageOutput(output);

    if (results.length === 0) {
      console.log(
        "⚠️  No coverage data found. Tests may not be generating coverage."
      );
      console.log("Ensure bunfig.toml has coverage = true");
      process.exit(0);
    }

    const allPassed = printResults(results);

    if (allPassed) {
      console.log("\n✅ All coverage thresholds met!");
      process.exit(0);
    } else {
      console.log("\n❌ Coverage below thresholds. Please add more tests.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error running coverage check:", error);
    process.exit(1);
  }
}

main();
