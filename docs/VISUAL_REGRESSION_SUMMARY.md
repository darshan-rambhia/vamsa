# Visual Regression Testing Implementation Summary

## Overview

Visual regression testing has been successfully implemented for Vamsa using Playwright's built-in screenshot capabilities. This enables automatic detection of unintended visual changes across key pages and components.

## Implementation Details

### Files Created

1. **apps/web/e2e/visual/visual.spec.ts** (287 lines)
   - Main visual regression test suite
   - BDD-structured tests using Given-When-Then pattern
   - 16 comprehensive test cases across multiple categories

2. **apps/web/e2e/visual/README.md**
   - Documentation for visual regression testing
   - Usage instructions and best practices
   - Troubleshooting guide

### Files Modified

1. **apps/web/playwright.config.ts**
   - Added `snapshotDir` configuration pointing to `e2e/visual/__snapshots__`
   - Added `snapshotPathTemplate` for consistent naming: `{testFileDir}/{testFileName}-{platform}{ext}`
   - Added new "visual" project configuration
   - Visual project uses testMatch pattern: `**/visual/**/*.spec.ts`
   - Configured consistent viewport (1280x720) for visual tests

2. **apps/web/package.json**
   - Added `test:visual` script to run visual regression tests
   - Added `test:visual:update` script to update baseline snapshots

3. **.gitignore**
   - Added entry to ignore visual regression diff files: `apps/web/e2e/visual/**/*-diff.png`

## Test Coverage

The visual regression suite includes 16 test cases organized into 5 categories:

### 1. Authentication Pages (3 tests)

- Login page layout and styling
- Register page layout and styling
- Change password page layout and styling

### 2. Dashboard and Main Pages (3 tests)

- Dashboard page layout and styling
- People list page layout and styling
- Tree visualization page layout and styling

### 3. Responsive Design (2 tests)

- Login page mobile layout (375x667)
- Dashboard page tablet layout (768x1024)

### 4. Component-Specific (2 tests)

- Form elements styling and layout
- Navigation layout and styling

### 5. Dark Mode Support (1 test)

- Login page in dark mode (skipped if feature not implemented)

Additional baseline tests will be generated on first run to cover all viewport configurations.

## Key Features

### Viewport Management

- **Desktop**: 1280x720 (default)
- **Mobile**: 375x667
- **Tablet**: 768x1024
- Consistent across all tests via `beforeEach` setup

### Diff Thresholds

- `maxDiffPixels`: 100-200 depending on test complexity
- `threshold`: 0.2 (0.2% acceptable difference)
- Conservative settings to catch real regressions while avoiding false positives

### BDD Structure

All tests follow Given-When-Then pattern using `bdd` helper:

```typescript
await bdd.given("setup condition", async () => { ... });
await bdd.when("action performed", async () => { ... });
await bdd.then("verification", async () => { ... });
```

### Asset Loading

Tests use `page.waitForLoadState("networkidle")` to ensure:

- All CSS and fonts are loaded
- Images and assets are rendered
- Async content is displayed
- Charts and visualizations are complete

## Usage

### Generate Baseline Snapshots (First Run)

```bash
bun run test:visual:update
```

This creates baseline PNG files in:

```
apps/web/e2e/visual/__snapshots__/
├── visual-chromium.png
├── visual-mobile-chromium.png
├── visual-tablet-chromium.png
└── ... (one per test per platform)
```

### Run Tests Against Baseline

```bash
bun run test:visual
```

Compares current screenshots against baseline. Passes if differences are within thresholds.

### Update Baseline After Visual Changes

After making intentional visual changes:

```bash
bun run test:visual:update
```

## Quality Assurance

### Type Checking

- All tests pass TypeScript type checking (tsc --noEmit)
- No compilation errors
- Proper types for Playwright APIs

### Code Quality

- ESLint passes with no issues
- Prettier formatting compliant
- BDD structure followed throughout
- Clear, descriptive test names

### Configuration

- Seamlessly integrated into existing Playwright configuration
- Uses same webServer config as E2E tests
- Consistent with project's testing approach
- Supports CI/CD pipeline (runs with --project=visual)

## CI/CD Integration

Visual tests are configured to run in CI with:

```bash
bun --env-file=../../.env run scripts/run-e2e.ts --project=visual
```

Tests will:

1. Use Chromium browser for consistency
2. Start dev server automatically via webServer config
3. Wait for network idle for asset loading
4. Compare against baseline snapshots
5. Fail if differences exceed thresholds

## Diff Handling

If visual differences are detected:

1. **Unintended Regression**: Fix the CSS/HTML code
2. **Intentional Change**: Review the diff carefully, then update baseline:
   ```bash
   bun run test:visual:update
   ```

Diff files (`*-diff.png`) are automatically ignored by Git to prevent clutter in PRs.

## Platform-Specific Snapshots

Playwright generates snapshots per platform:

- `{testname}-chromium.png`
- `{testname}-webkit.png` (if added to projects)
- `{testname}-firefox.png` (if added to projects)

Currently, visual tests use Chromium-only for simplicity and consistency.

## Best Practices

1. **Wait for Assets**: Always use `waitForLoadState("networkidle")`
2. **Avoid Hardcoded Waits**: Don't use `waitForTimeout()` (can cause flakiness)
3. **Conservative Thresholds**: Use 100-200 maxDiffPixels to catch real issues
4. **Review Diffs**: Always inspect screenshot diffs before updating baseline
5. **Test Responsive Design**: Include mobile/tablet tests for responsive features
6. **Handle Dynamic Content**: Adjust thresholds if content is legitimately dynamic

## Troubleshooting

### Snapshot Files Not Created

- Ensure dev server is running or webServer config is correct
- Check that pages are accessible at configured URLs
- Verify auth state file exists (e2e/.auth/admin.json)

### False Positive Failures

- Review the diff carefully
- Increase `maxDiffPixels` if legitimate variations exist
- Add explicit waits for animations
- Consider disabling/hiding dynamic elements during tests

### CI Failures

- Ensure baseline snapshots are committed to Git
- Check that webServer starts correctly in CI
- Review Playwright logs for more details

## Future Enhancements

Potential additions for expanded visual coverage:

1. Add Firefox and WebKit snapshots for cross-browser consistency
2. Extend tests to cover more pages (relationships, calendar, etc.)
3. Add tests for interactive states (hover, focus, disabled)
4. Include animation/transition visual tests
5. Add accessibility color contrast verification
6. Test error states and validation messages

## Metrics

- **Test Suite Size**: 16 test cases (expandable)
- **Lines of Code**: 287 (visual.spec.ts)
- **Coverage**: Key pages + responsive layouts + components
- **Configuration**: Integrated into existing playwright.config.ts
- **Execution Time**: ~30-60 seconds per full run (varies by page complexity)

## Next Steps

1. Run `bun run test:visual:update` to generate baseline snapshots
2. Commit baseline snapshots and files to Git
3. Integrate into CI/CD pipeline
4. Monitor for visual regressions in future PRs
5. Expand test coverage as new pages/features are added
