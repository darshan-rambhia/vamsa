#!/usr/bin/env bun
/**
 * Analyze Mutation Testing Results
 *
 * Reads mutation-report.json files from test-output/mutation/ and provides:
 * - Overall mutation scores by package
 * - Files with lowest mutation scores (need more tests)
 * - Most common survived mutants (patterns to test)
 * - Compilation errors that need fixing
 *
 * Usage:
 *   bun scripts/analyze-mutations.ts [package]
 *   bun scripts/analyze-mutations.ts           # Analyze all packages
 *   bun scripts/analyze-mutations.ts lib       # Analyze specific package
 */

import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { logger } from "../packages/lib/src/logger";

interface MutantLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

interface Mutant {
  id: string;
  mutatorName: string;
  replacement: string;
  status: "Killed" | "Survived" | "NoCoverage" | "Timeout" | "CompileError";
  statusReason?: string;
  location: MutantLocation;
}

interface FileReport {
  language: string;
  mutants: Mutant[];
  source: string;
}

interface MutationReport {
  files: Record<string, FileReport>;
  framework: {
    name: string;
    version: string;
  };
  thresholds: {
    high: number;
    low: number;
  };
}

interface FileScore {
  file: string;
  killed: number;
  survived: number;
  compileError: number;
  noCoverage: number;
  timeout: number;
  total: number;
  score: number;
}

interface PackageScore {
  package: string;
  killed: number;
  survived: number;
  compileError: number;
  noCoverage: number;
  timeout: number;
  total: number;
  score: number;
  files: FileScore[];
}

function analyzeMutationReport(
  packageName: string,
  reportPath: string
): PackageScore | null {
  if (!existsSync(reportPath)) {
    logger.warn(`No mutation report found for ${packageName} at ${reportPath}`);
    return null;
  }

  const report: MutationReport = JSON.parse(readFileSync(reportPath, "utf-8"));

  const fileScores: FileScore[] = [];
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalCompileError = 0;
  let totalNoCoverage = 0;
  let totalTimeout = 0;

  for (const [filePath, fileData] of Object.entries(report.files)) {
    const mutants = fileData.mutants;
    const killed = mutants.filter((m) => m.status === "Killed").length;
    const survived = mutants.filter((m) => m.status === "Survived").length;
    const compileError = mutants.filter(
      (m) => m.status === "CompileError"
    ).length;
    const noCoverage = mutants.filter((m) => m.status === "NoCoverage").length;
    const timeout = mutants.filter((m) => m.status === "Timeout").length;
    const total = mutants.length;
    const score = total > 0 ? (killed / total) * 100 : 0;

    totalKilled += killed;
    totalSurvived += survived;
    totalCompileError += compileError;
    totalNoCoverage += noCoverage;
    totalTimeout += timeout;

    fileScores.push({
      file: filePath,
      killed,
      survived,
      compileError,
      noCoverage,
      timeout,
      total,
      score,
    });
  }

  const totalMutants =
    totalKilled +
    totalSurvived +
    totalCompileError +
    totalNoCoverage +
    totalTimeout;
  const overallScore =
    totalMutants > 0 ? (totalKilled / totalMutants) * 100 : 0;

  return {
    package: packageName,
    killed: totalKilled,
    survived: totalSurvived,
    compileError: totalCompileError,
    noCoverage: totalNoCoverage,
    timeout: totalTimeout,
    total: totalMutants,
    score: overallScore,
    files: fileScores.sort((a, b) => a.score - b.score), // Sort by lowest score first
  };
}

function getSurvivedMutants(reportPath: string): Mutant[] {
  if (!existsSync(reportPath)) return [];

  const report: MutationReport = JSON.parse(readFileSync(reportPath, "utf-8"));
  const survived: Mutant[] = [];

  for (const fileData of Object.values(report.files)) {
    survived.push(...fileData.mutants.filter((m) => m.status === "Survived"));
  }

  return survived;
}

function formatScore(score: number): string {
  if (score >= 80) return `🟢 ${score.toFixed(1)}%`;
  if (score >= 60) return `🟡 ${score.toFixed(1)}%`;
  return `🔴 ${score.toFixed(1)}%`;
}

function main() {
  const args = process.argv.slice(2);
  const targetPackage = args[0];

  const mutationDir = join(process.cwd(), "test-output", "mutation");

  if (!existsSync(mutationDir)) {
    logger.error("No mutation test results found. Run mutation tests first:");
    logger.error("  pnpm test:mutation");
    process.exit(1);
  }

  const packages = targetPackage
    ? [targetPackage]
    : readdirSync(mutationDir).filter((name) =>
        existsSync(join(mutationDir, name, "mutation-report.json"))
      );

  if (packages.length === 0) {
    logger.error("No mutation reports found.");
    logger.error("Run mutation tests first: pnpm test:mutation");
    process.exit(1);
  }

  logger.info("🧬 Mutation Testing Analysis\n");

  const packageScores: PackageScore[] = [];

  for (const pkg of packages) {
    const reportPath = join(mutationDir, pkg, "mutation-report.json");
    const score = analyzeMutationReport(pkg, reportPath);
    if (score) packageScores.push(score);
  }

  // Overall summary
  logger.info("=".repeat(80));
  logger.info("📊 PACKAGE SCORES");
  logger.info("=".repeat(80));

  for (const pkg of packageScores) {
    logger.info(`\n${pkg.package}`);
    logger.info(
      `  Mutation Score: ${formatScore(pkg.score)} (${pkg.killed}/${pkg.total} mutants killed)`
    );
    logger.info(`  Killed:        ${pkg.killed}`);
    logger.info(`  Survived:      ${pkg.survived}`);
    logger.info(`  Compile Error: ${pkg.compileError}`);
    logger.info(`  No Coverage:   ${pkg.noCoverage}`);
  }

  // Files needing attention
  logger.info("\n" + "=".repeat(80));
  logger.info("🎯 FILES NEEDING MORE TESTS (Score < 50%)");
  logger.info("=".repeat(80));

  for (const pkg of packageScores) {
    const lowScoreFiles = pkg.files.filter((f) => f.score < 50 && f.total > 0);
    if (lowScoreFiles.length > 0) {
      logger.info(`\n${pkg.package}:`);
      for (const file of lowScoreFiles.slice(0, 10)) {
        const shortPath = file.file.replace(/^packages\/[^/]+\/src\//, "");
        logger.info(
          `  ${formatScore(file.score)} ${shortPath} (${file.killed}/${file.total})`
        );
      }
    }
  }

  // Survived mutants patterns
  logger.info("\n" + "=".repeat(80));
  logger.info("🔍 COMMON SURVIVED MUTANT TYPES");
  logger.info("=".repeat(80));

  const mutatorCounts = new Map<string, number>();

  for (const pkg of packages) {
    const reportPath = join(mutationDir, pkg, "mutation-report.json");
    const survived = getSurvivedMutants(reportPath);
    for (const mutant of survived) {
      mutatorCounts.set(
        mutant.mutatorName,
        (mutatorCounts.get(mutant.mutatorName) || 0) + 1
      );
    }
  }

  const sortedMutators = Array.from(mutatorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [mutator, count] of sortedMutators) {
    logger.info(`  ${mutator.padEnd(25)} ${count} survived`);
  }

  // Recommendations
  logger.info("\n" + "=".repeat(80));
  logger.info("💡 RECOMMENDATIONS");
  logger.info("=".repeat(80));

  const avgScore =
    packageScores.reduce((sum, p) => sum + p.score, 0) / packageScores.length;

  if (avgScore < 50) {
    logger.info(
      "  • Overall mutation score is low. Focus on adding tests for:"
    );
    logger.info(
      "    - Edge cases (boundary values, empty arrays, null checks)"
    );
    logger.info("    - Error conditions (invalid input, exceptions)");
    logger.info("    - Logical operators (&&, ||, !)");
  }

  const totalCompileErrors = packageScores.reduce(
    (sum, p) => sum + p.compileError,
    0
  );
  if (totalCompileErrors > 0) {
    logger.info(
      `  • ${totalCompileErrors} mutants cause compile errors - consider more flexible types`
    );
  }

  const totalNoCoverage = packageScores.reduce(
    (sum, p) => sum + p.noCoverage,
    0
  );
  if (totalNoCoverage > 0) {
    logger.info(
      `  • ${totalNoCoverage} mutants have no test coverage - add unit tests first`
    );
  }

  logger.info("\n" + "=".repeat(80));
}

main();
