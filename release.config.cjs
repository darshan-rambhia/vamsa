/**
 * Semantic Release Configuration
 *
 * Automates versioning and changelog generation based on conventional commits.
 *
 * Commit Format:
 *   feat: add new feature (minor version bump)
 *   fix: bug fix (patch version bump)
 *   feat!: breaking change (major version bump)
 *   chore: maintenance (no release)
 *   docs: documentation (no release)
 *
 * @see https://semantic-release.gitbook.io/semantic-release/
 */
module.exports = {
  branches: ["main"],
  plugins: [
    // Analyze commits to determine version bump
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "refactor", release: "patch" },
          { type: "revert", release: "patch" },
          { breaking: true, release: "major" },
        ],
      },
    ],
    // Generate release notes
    [
      "@semantic-release/release-notes-generator",
      {
        preset: "conventionalcommits",
        presetConfig: {
          types: [
            { type: "feat", section: "Features" },
            { type: "fix", section: "Bug Fixes" },
            { type: "perf", section: "Performance" },
            { type: "refactor", section: "Refactoring" },
            { type: "revert", section: "Reverts" },
            { type: "docs", section: "Documentation", hidden: true },
            { type: "chore", section: "Maintenance", hidden: true },
            { type: "test", section: "Tests", hidden: true },
            { type: "ci", section: "CI/CD", hidden: true },
          ],
        },
      },
    ],
    // Update CHANGELOG.md
    "@semantic-release/changelog",
    // Update package.json version
    [
      "@semantic-release/npm",
      {
        npmPublish: false, // Private monorepo, don't publish to npm
      },
    ],
    // Commit changes (CHANGELOG, package.json)
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message:
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    // Create GitHub release
    "@semantic-release/github",
  ],
};
