#!/usr/bin/env bun
/**
 * Workflow Coverage Analysis Tool
 *
 * Analyzes E2E test results to:
 * - Extract features and scenarios from BDD tests
 * - Generate workflow coverage matrix
 * - Identify gaps in test coverage
 * - Output markdown report
 *
 * Usage:
 *   bun run apps/web/e2e/scripts/analyze-coverage.ts
 *   bun run apps/web/e2e/scripts/analyze-coverage.ts --output coverage-report.md
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface TestResult {
  suites: TestSuite[];
  stats: {
    startTime: string;
    duration: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
  };
}

interface TestSuite {
  title: string;
  file: string;
  specs: TestSpec[];
  suites?: TestSuite[];
}

interface TestSpec {
  title: string;
  ok: boolean;
  tests: Test[];
}

interface Test {
  status: string;
  duration: number;
}

interface FeatureCoverage {
  feature: string;
  file: string;
  scenarios: string[];
  testCount: number;
  passCount: number;
  failCount: number;
}

interface WorkflowGap {
  feature: string;
  suggestedScenarios: string[];
  priority: "high" | "medium" | "low";
}

// Expected workflows based on application features
const EXPECTED_WORKFLOWS: Record<string, string[]> = {
  Authentication: [
    "Login with valid credentials",
    "Login with invalid credentials",
    "Logout",
    "Session expiration",
    "Remember me functionality",
    "OIDC login (Google, Microsoft, GitHub)",
  ],
  Registration: [
    "Register new user",
    "Validate email format",
    "Validate password strength",
    "Email already exists error",
    "Terms acceptance required",
  ],
  "Password Management": [
    "Change password successfully",
    "Old password validation",
    "New password validation",
    "Password mismatch error",
  ],
  "Profile Claiming": [
    "Claim profile after OIDC login",
    "Skip profile claiming",
    "Claim from settings page",
    "View suggested matches",
    "Search for profiles",
  ],
  "People Management": [
    "View people list",
    "Search people",
    "Filter living/deceased",
    "Create new person",
    "Edit person details",
    "Delete person (with confirmation)",
  ],
  Relationships: [
    "Add parent relationship",
    "Add spouse relationship",
    "Add child relationship",
    "Add sibling relationship",
    "Edit existing relationship",
    "Delete relationship",
    "View relationship details",
  ],
  "Family Tree": [
    "View family tree",
    "Navigate tree (zoom, pan)",
    "Expand/collapse nodes",
    "View person details from tree",
    "Add person from tree",
    "Add relationship from tree",
  ],
  "Data Import/Export": [
    "Import GEDCOM file",
    "Validate GEDCOM structure",
    "Preview import",
    "Export GEDCOM",
    "Create backup",
    "Restore backup",
  ],
  Admin: [
    "View all users",
    "Change user role",
    "Disable user account",
    "View user activity",
    "Manage invitations",
    "Review suggestions",
  ],
  Internationalization: [
    "Switch language",
    "Display errors in selected language",
    "Persist language preference",
    "Form validation in multiple languages",
  ],
};

function parseTestResults(jsonPath: string): TestResult | null {
  if (!existsSync(jsonPath)) {
    console.error(`Test results not found at: ${jsonPath}`);
    return null;
  }

  const content = readFileSync(jsonPath, "utf-8");
  return JSON.parse(content) as TestResult;
}

function extractFeatures(testResult: TestResult): FeatureCoverage[] {
  const features: Map<string, FeatureCoverage> = new Map();

  function processSuite(suite: TestSuite, parentTitle: string = "") {
    const featureName = suite.title.replace(/^Feature:\s*/i, "").trim();
    const fullTitle = parentTitle
      ? `${parentTitle} > ${featureName}`
      : featureName;

    // Process specs in this suite
    for (const spec of suite.specs || []) {
      const scenarioTitle = spec.title.replace(/^Scenario:\s*/i, "").trim();

      const feature = features.get(fullTitle) || {
        feature: fullTitle,
        file: suite.file,
        scenarios: [],
        testCount: 0,
        passCount: 0,
        failCount: 0,
      };

      feature.scenarios.push(scenarioTitle);
      feature.testCount += spec.tests.length;
      feature.passCount += spec.tests.filter(
        (t) => t.status === "passed"
      ).length;
      feature.failCount += spec.tests.filter(
        (t) => t.status === "failed"
      ).length;

      features.set(fullTitle, feature);
    }

    // Process nested suites
    for (const nestedSuite of suite.suites || []) {
      processSuite(nestedSuite, fullTitle);
    }
  }

  for (const suite of testResult.suites) {
    processSuite(suite);
  }

  return Array.from(features.values());
}

function identifyGaps(features: FeatureCoverage[]): WorkflowGap[] {
  const gaps: WorkflowGap[] = [];

  // Check each expected feature
  for (const [expectedFeature, expectedScenarios] of Object.entries(
    EXPECTED_WORKFLOWS
  )) {
    // Find matching feature in actual results (fuzzy match)
    const actualFeature = features.find(
      (f) =>
        f.feature.toLowerCase().includes(expectedFeature.toLowerCase()) ||
        expectedFeature.toLowerCase().includes(f.feature.toLowerCase())
    );

    if (!actualFeature) {
      // Feature completely missing
      gaps.push({
        feature: expectedFeature,
        suggestedScenarios: expectedScenarios,
        priority: "high",
      });
      continue;
    }

    // Check for missing scenarios
    const missingScenarios = expectedScenarios.filter((expected) => {
      return !actualFeature.scenarios.some(
        (actual) =>
          actual.toLowerCase().includes(expected.toLowerCase().split(" ")[0]) // Match first word
      );
    });

    if (missingScenarios.length > 0) {
      gaps.push({
        feature: expectedFeature,
        suggestedScenarios: missingScenarios,
        priority: missingScenarios.length > 3 ? "high" : "medium",
      });
    }
  }

  return gaps.sort((a, b) => {
    // Sort by priority (high first) then alphabetically
    if (a.priority !== b.priority) {
      return a.priority === "high" ? -1 : 1;
    }
    return a.feature.localeCompare(b.feature);
  });
}

function generateMarkdownReport(
  features: FeatureCoverage[],
  gaps: WorkflowGap[],
  stats: TestResult["stats"]
): string {
  const lines: string[] = [];

  lines.push("# E2E Test Workflow Coverage Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");

  // Executive Summary
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(`- **Total Features**: ${features.length}`);
  lines.push(
    `- **Total Scenarios**: ${features.reduce((sum, f) => sum + f.scenarios.length, 0)}`
  );
  lines.push(
    `- **Total Tests**: ${stats.expected + stats.unexpected + stats.skipped}`
  );
  lines.push(`- **Passing Tests**: ${stats.expected} ✅`);
  lines.push(`- **Failing Tests**: ${stats.unexpected} ❌`);
  lines.push(`- **Skipped Tests**: ${stats.skipped} ⏭️`);
  lines.push(`- **Flaky Tests**: ${stats.flaky} ⚠️`);
  lines.push(
    `- **Test Duration**: ${(stats.duration / 1000 / 60).toFixed(2)} minutes`
  );
  lines.push("");

  // Coverage Matrix
  lines.push("## Workflow Coverage Matrix");
  lines.push("");
  lines.push("| Feature | File | Scenarios | Tests | Pass % |");
  lines.push("|---------|------|-----------|-------|--------|");

  for (const feature of features) {
    const passRate =
      feature.testCount > 0
        ? ((feature.passCount / feature.testCount) * 100).toFixed(0)
        : "0";
    const fileName = feature.file.split("/").pop() || feature.file;

    lines.push(
      `| ${feature.feature} | \`${fileName}\` | ${feature.scenarios.length} | ${feature.testCount} | ${passRate}% ${feature.passCount === feature.testCount ? "✅" : feature.failCount > 0 ? "❌" : "⏭️"} |`
    );
  }
  lines.push("");

  // Detailed Scenarios
  lines.push("## Detailed Scenario Coverage");
  lines.push("");

  for (const feature of features) {
    lines.push(`### ${feature.feature}`);
    lines.push("");
    lines.push(`**File**: \`${feature.file}\``);
    lines.push("");
    lines.push("**Scenarios**:");
    lines.push("");

    for (const scenario of feature.scenarios) {
      lines.push(`- ${scenario}`);
    }
    lines.push("");
  }

  // Identified Gaps
  if (gaps.length > 0) {
    lines.push("## Identified Workflow Gaps");
    lines.push("");
    lines.push(
      "The following workflows are missing or incomplete based on expected application functionality:"
    );
    lines.push("");

    const highPriorityGaps = gaps.filter((g) => g.priority === "high");
    const mediumPriorityGaps = gaps.filter((g) => g.priority === "medium");

    if (highPriorityGaps.length > 0) {
      lines.push("### 🔴 High Priority Gaps");
      lines.push("");

      for (const gap of highPriorityGaps) {
        lines.push(`#### ${gap.feature}`);
        lines.push("");
        lines.push("**Missing Scenarios**:");
        lines.push("");

        for (const scenario of gap.suggestedScenarios) {
          lines.push(`- [ ] ${scenario}`);
        }
        lines.push("");
      }
    }

    if (mediumPriorityGaps.length > 0) {
      lines.push("### 🟡 Medium Priority Gaps");
      lines.push("");

      for (const gap of mediumPriorityGaps) {
        lines.push(`#### ${gap.feature}`);
        lines.push("");
        lines.push("**Suggested Additional Scenarios**:");
        lines.push("");

        for (const scenario of gap.suggestedScenarios) {
          lines.push(`- [ ] ${scenario}`);
        }
        lines.push("");
      }
    }
  } else {
    lines.push("## ✅ No Workflow Gaps Identified");
    lines.push("");
    lines.push("All expected workflows are covered by the test suite!");
    lines.push("");
  }

  // Recommendations
  lines.push("## Recommendations");
  lines.push("");

  if (stats.flaky > 0) {
    lines.push(
      `- **Fix Flaky Tests**: ${stats.flaky} tests are flaky and need stabilization`
    );
  }

  if (stats.unexpected > 0) {
    lines.push(
      `- **Fix Failing Tests**: ${stats.unexpected} tests are currently failing`
    );
  }

  if (gaps.filter((g) => g.priority === "high").length > 0) {
    lines.push(
      "- **Address High Priority Gaps**: Add tests for critical missing workflows"
    );
  }

  const avgDuration = stats.duration / (stats.expected + stats.unexpected);
  if (avgDuration > 10000) {
    lines.push(
      `- **Optimize Test Speed**: Average test duration is ${(avgDuration / 1000).toFixed(2)}s, consider optimization`
    );
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Generated by `apps/web/e2e/scripts/analyze-coverage.ts`*");

  return lines.join("\n");
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const outputPath = args.includes("--output")
    ? args[args.indexOf("--output") + 1]
    : join(process.cwd(), "apps/web/e2e/COVERAGE.md");

  const jsonPath = join(process.cwd(), "apps/web/test-output/results.json");

  console.log("🔍 Analyzing E2E test coverage...\n");

  const testResult = parseTestResults(jsonPath);
  if (!testResult) {
    console.error("❌ Failed to parse test results");
    process.exit(1);
  }

  console.log("✅ Parsed test results");
  console.log(
    `   Total tests: ${testResult.stats.expected + testResult.stats.unexpected + testResult.stats.skipped}`
  );
  console.log(
    `   Duration: ${(testResult.stats.duration / 1000 / 60).toFixed(2)} minutes\n`
  );

  const features = extractFeatures(testResult);
  console.log(
    `✅ Extracted ${features.length} features with ${features.reduce((sum, f) => sum + f.scenarios.length, 0)} scenarios\n`
  );

  const gaps = identifyGaps(features);
  if (gaps.length > 0) {
    console.log(`⚠️  Identified ${gaps.length} workflow gaps`);
    console.log(
      `   High priority: ${gaps.filter((g) => g.priority === "high").length}`
    );
    console.log(
      `   Medium priority: ${gaps.filter((g) => g.priority === "medium").length}\n`
    );
  } else {
    console.log("✅ No workflow gaps identified!\n");
  }

  const report = generateMarkdownReport(features, gaps, testResult.stats);
  writeFileSync(outputPath, report, "utf-8");

  console.log(`📄 Report generated: ${outputPath}`);
  console.log("\n✨ Coverage analysis complete!");
}

main();
