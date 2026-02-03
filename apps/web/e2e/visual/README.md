# Visual Regression Tests

This directory contains visual regression tests for Vamsa using Playwright's built-in screenshot capabilities.

## Overview

Visual regression testing automatically compares screenshots of pages against baseline images to detect unintended visual changes. This helps catch CSS regressions, layout shifts, typography changes, and other visual issues that might not be caught by functional tests.

## What's Tested

The visual regression suite covers:

- **Authentication Pages**: Login, Register, Change Password
- **Main Pages**: Dashboard, People List, Tree Visualization
- **Responsive Design**: Mobile (375x667) and Tablet (768x1024) viewports
- **Components**: Form elements, Navigation
- **Dark Mode** (if implemented)

## Running Visual Tests

### Initial Baseline Generation

On first run, tests will fail because baseline snapshots don't exist yet. Generate the baseline snapshots:

```bash
bun run test:visual:update
```

This creates baseline PNG files in `__snapshots__/` directory.

### Running Tests Against Baseline

After baseline exists, run tests to compare current screenshots against baseline:

```bash
bun run test:visual
```

Tests pass if differences are within the configured threshold (`maxDiffPixels: 100-200` depending on test).

### Updating Baseline After Intentional Changes

When you make intentional visual changes:

1. Run the tests to see failures
2. Review the differences
3. Update the baseline:

```bash
bun run test:visual:update
```

## Test Configuration

### Viewport Sizes

- **Desktop**: 1280x720 (default)
- **Mobile**: 375x667
- **Tablet**: 768x1024

### Diff Thresholds

Tests use conservative thresholds to avoid false positives:

- `maxDiffPixels`: Maximum changed pixels allowed (100-200)
- `threshold`: Acceptable percentage of different pixels (0.2 = 0.2%)

Adjust these values if you get false positives for pages with dynamic content.

## Snapshot Storage

Baseline snapshots are stored in:

```
__snapshots__/visual/
├── login-page-chromium.png
├── register-page-chromium.png
├── dashboard-page-chromium.png
└── ...
```

Files are named with the format: `{test-name}-{platform}.png`

## CI/CD Integration

In CI, visual tests run with the `--project=visual` flag to ensure consistency. Diffs are captured in test output if tests fail.

## Best Practices

1. **Wait for Content to Load**: Tests use `waitForLoadState("networkidle")` to ensure all styles, fonts, and async content are loaded
2. **Avoid Hardcoded Waits**: Don't use `waitForTimeout()` - these can cause flakiness
3. **Review Diffs Carefully**: Always review screenshot diffs to ensure changes are intentional
4. **Update Selectively**: Only update baselines for intentional visual changes
5. **Test Responsive Layouts**: Include mobile/tablet tests when adding responsive features

## Troubleshooting

### Test Fails: "Screenshot differs from baseline"

This indicates a visual change. Options:

1. It's an unintended regression → Fix the code
2. It's an intentional change → Update baseline with `bun run test:visual:update`

### False Positives with Dynamic Content

If tests are flaky due to animations or dynamic content:

1. Increase `maxDiffPixels` threshold (e.g., 150 → 250)
2. Add explicit waits for animations to complete
3. Consider hiding/disabling dynamic elements during tests

### Snapshots Not Generated

Ensure:

1. Server is running (`bun run dev` or via webServer in playwright.config.ts)
2. Pages exist and are accessible at URLs in tests
3. Auth state is available (tests use admin.json by default)

## Platform-Specific Snapshots

Playwright generates separate snapshots per platform (chromium, webkit, firefox) to account for rendering differences. Snapshots are stored as:

```
{test-name}-chromium.png
{test-name}-webkit.png
{test-name}-firefox.png
```

The visual tests project uses Chromium by default for consistency.

## Debugging

To debug visual tests:

1. Run with headed mode: `playwright test --project=visual --headed`
2. Check generated screenshots in test output
3. Use `--debug` flag for step-by-step debugging: `playwright test --project=visual --debug`
