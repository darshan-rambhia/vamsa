#!/usr/bin/env bun
/**
 * Coverage threshold checker for CI
 *
 * Runs Vitest with coverage and checks thresholds per package.
 * Each package's vitest.config.ts can define its own coverage thresholds,
 * but this script provides a unified report.
 */

import { $ } from "bun";

interface CoverageThresholds {
  lines: number;
  branches: number;
}

// Coverage thresholds per package
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

  const result =
    await $`bun run vitest run --coverage --coverage.reporter=text 2>&1`.text();
  return result;
}

function parseCoverageOutput(output: string): PackageCoverage[] {
  const results: PackageCoverage[] = [];

  // Vitest workspace output format:
  // After each project's tests, coverage is printed like:
  //  Project: lib
  //  ...
  //  All files   |   98.82 |   95.00 | ...
  //
  // We detect which project by looking for project headers
  const lines = output.split("\n");

  // Map Vitest project names to package names
  const projectToPackage: Record<string, string> = {
    lib: "@vamsa/lib",
    ui: "@vamsa/ui",
    api: "@vamsa/api",
    schemas: "@vamsa/schemas",
    web: "@vamsa/web",
  };

  let currentProject: string | null = null;

  for (const line of lines) {
    // Detect project switches in Vitest output
    // Format varies but typically includes project name in brackets or headers
    for (const [project, pkg] of Object.entries(projectToPackage)) {
      // Match patterns like "✓ lib src/..." or "❯ lib src/..." or "Project: lib"
      const projectPattern = new RegExp(
        `(?:^\\s*[✓❯×]\\s+${project}\\s|Project:\\s*${project}\\b|^\\s*${project}\\s*\\|)`,
        "i"
      );
      if (projectPattern.test(line)) {
        currentProject = pkg;
      }
    }

    // Parse "All files" coverage line
    if (line.includes("All files")) {
      const match = line.match(
        /All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/
      );
      if (match && currentProject) {
        const linesPercent = parseFloat(match[1]);
        const branchesPercent = parseFloat(match[2]);
        const threshold = thresholds[currentProject] || {
          lines: 80,
          branches: 70,
        };

        // Don't add duplicates
        if (!results.find((r) => r.name === currentProject)) {
          results.push({
            name: currentProject,
            lines: linesPercent,
            branches: branchesPercent,
            passed:
              linesPercent >= threshold.lines &&
              branchesPercent >= threshold.branches,
          });
        }
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

    // Check if tests passed - look for Vitest failure indicators
    if (output.includes("Tests  ") && output.includes("failed")) {
      console.error(
        "\n❌ Tests failed! Fix failing tests before checking coverage."
      );
      process.exit(1);
    }

    const results = parseCoverageOutput(output);

    if (results.length === 0) {
      console.log(
        "⚠️  No coverage data found. Ensure vitest.config.ts has coverage configured."
      );
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
