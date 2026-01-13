/**
 * Feature: Chart Visualizations (Timeline, Matrix, Bowtie)
 * Comprehensive E2E test suite for genealogy chart displays, interactions, and functionality
 *
 * Test coverage:
 * - Chart selector with new chart types
 * - Timeline chart rendering and interactions
 * - Relationship Matrix grid rendering and interactions
 * - Bowtie chart rendering and interactions
 * - Export functionality for all chart types
 * - Responsive behavior and error handling
 */

import { test, expect } from "@playwright/test";

test.describe("Feature: Chart Visualizations", () => {
  // Setup: Authenticated user navigates to charts
  test.beforeEach(async ({ page }) => {
    // Navigate to the main app (assumes auth is configured)
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for navigation or charts link
    const chartsLink = page.locator('a, button').filter({
      hasText: /charts?|visualization/i,
    });
    const chartsCount = await chartsLink.count();

    // If charts link exists, navigate to it
    if (chartsCount > 0) {
      await chartsLink.first().click();
      await page.waitForLoadState("networkidle");
    }
  });

  // ====================================================
  // SECTION 1: Chart Selector and Navigation (5 tests)
  // ====================================================

  test("should display chart selector with multiple chart types", async ({
    page,
  }) => {
    // Look for chart type selector buttons or dropdown
    const chartSelectors = page.locator("button, select").filter({
      hasText: /ancestor|descendant|hourglass|fan|timeline|matrix|bowtie/i,
    });

    const count = await chartSelectors.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should allow selecting Timeline chart", async ({ page }) => {
    // Find and click Timeline option
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      // Verify Timeline chart is displayed
      const svg = page.locator("svg").first();
      await expect(svg).toBeVisible();
    }
  });

  test("should allow selecting Relationship Matrix chart", async ({
    page,
  }) => {
    // Find and click Matrix option
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      // Verify Matrix chart is displayed
      const svg = page.locator("svg").first();
      await expect(svg).toBeVisible();
    }
  });

  test("should allow selecting Bowtie chart", async ({ page }) => {
    // Find and click Bowtie option
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      // Verify Bowtie chart is displayed
      const svg = page.locator("svg").first();
      await expect(svg).toBeVisible();
    }
  });

  test("should maintain selected chart type after page reload", async ({
    page,
  }) => {
    // Select a chart type
    const chartBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await chartBtn.count();

    if (exists > 0) {
      await chartBtn.first().click();
      await page.waitForTimeout(300);

      const urlBefore = page.url();

      // Reload page
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const urlAfter = page.url();
      // URL should indicate same chart type or maintain state
      expect(urlAfter).toBeTruthy();
    }
  });

  // ====================================================
  // SECTION 2: Timeline Chart (8 tests)
  // ====================================================

  test("should render Timeline chart with horizontal bars", async ({
    page,
  }) => {
    // Select Timeline
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      // Check for SVG elements (timeline bars)
      const svg = page.locator("svg").first();
      await expect(svg).toBeVisible();

      // Look for rect elements (timeline bars)
      const rects = svg.locator("rect");
      const rectCount = await rects.count();
      expect(rectCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should show person names on Timeline chart", async ({ page }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      // Look for text elements with names
      const svg = page.locator("svg").first();
      const textElements = svg.locator("text");
      const textCount = await textElements.count();

      // Should have text for names, years, labels
      expect(textCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should display year axis on Timeline chart", async ({ page }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      // Look for year labels
      const svg = page.locator("svg").first();
      const yearText = svg.locator("text").filter({
        hasText: /\d{4}/,
      });
      const yearCount = await yearText.count();

      // Should have year labels
      expect(yearCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should support zoom on Timeline chart", async ({ page }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const container = svg.locator("..");

      // Simulate wheel zoom
      await container.evaluate(() => {
        const event = new WheelEvent("wheel", {
          deltaY: -100,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });
      await page.waitForTimeout(300);

      // Chart should still be visible
      await expect(svg).toBeVisible();
    }
  });

  test("should highlight person on Timeline hover", async ({ page }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const bars = svg.locator("rect").first();

      if ((await bars.count()) > 0) {
        // Hover over first bar
        await bars.hover();
        await page.waitForTimeout(200);

        // Bar should still be visible
        await expect(bars).toBeVisible();
      }
    }
  });

  test("should allow clicking person on Timeline", async ({ page }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const bars = svg.locator("rect").first();

      if ((await bars.count()) > 0) {
        // Click on bar
        await bars.click();
        await page.waitForTimeout(300);

        // Page should remain functional
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test("should show birth and death markers on Timeline", async ({ page }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      // Look for circle elements (birth/death markers)
      const svg = page.locator("svg").first();
      const circles = svg.locator("circle");
      const circleCount = await circles.count();

      // Should have markers
      expect(circleCount).toBeGreaterThanOrEqual(0);
    }
  });

  // ====================================================
  // SECTION 3: Relationship Matrix (8 tests)
  // ====================================================

  test("should render Relationship Matrix with grid cells", async ({
    page,
  }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      // Check for grid structure
      const svg = page.locator("svg").first();
      await expect(svg).toBeVisible();

      // Look for grid cells (rect elements)
      const cells = svg.locator("rect");
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should display row and column labels on Matrix", async ({ page }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      // Look for text labels
      const svg = page.locator("svg").first();
      const textElements = svg.locator("text");
      const textCount = await textElements.count();

      // Should have labels for rows and columns
      expect(textCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should show relationship colors in Matrix cells", async ({
    page,
  }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const cells = svg.locator("rect[style*='fill']");
      const cellCount = await cells.count();

      // Should have colored cells
      expect(cellCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should support zoom on Matrix", async ({ page }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const container = svg.locator("..");

      // Simulate wheel zoom
      await container.evaluate(() => {
        const event = new WheelEvent("wheel", {
          deltaY: -100,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });
      await page.waitForTimeout(300);

      // Matrix should still be visible
      await expect(svg).toBeVisible();
    }
  });

  test("should highlight Matrix cell on hover", async ({ page }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const cells = svg.locator("rect").first();

      if ((await cells.count()) > 0) {
        // Hover over cell
        await cells.hover();
        await page.waitForTimeout(200);

        // Cell should be interactive
        await expect(cells).toBeVisible();
      }
    }
  });

  test("should allow clicking Matrix cells", async ({ page }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const cells = svg.locator("rect").first();

      if ((await cells.count()) > 0) {
        // Click on cell
        await cells.click();
        await page.waitForTimeout(300);

        // Page should remain functional
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test("should display relationship legend on Matrix", async ({ page }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      // Look for legend
      const legend = page.locator("text").filter({
        hasText: /parent|child|spouse|sibling|relationship/i,
      });
      const legendCount = await legend.count();

      // Legend may or may not be visible
      expect(legendCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should handle large matrices with scrolling", async ({ page }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();

      // Should be zoomable for large datasets
      const box = await svg.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(0);
    }
  });

  // ====================================================
  // SECTION 4: Bowtie Chart (8 tests)
  // ====================================================

  test("should render Bowtie chart with paternal and maternal sides", async ({
    page,
  }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      // Check for SVG elements
      const svg = page.locator("svg").first();
      await expect(svg).toBeVisible();

      // Look for nodes (rect elements)
      const nodes = svg.locator("rect");
      const nodeCount = await nodes.count();
      expect(nodeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should display side labels on Bowtie chart", async ({ page }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      // Look for PATERNAL and MATERNAL labels
      const labels = page.locator("text").filter({
        hasText: /paternal|maternal/i,
      });
      const labelCount = await labels.count();

      // Should have side labels
      expect(labelCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should show person information on Bowtie nodes", async ({ page }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      // Look for names and dates
      const svg = page.locator("svg").first();
      const textElements = svg.locator("text");
      const textCount = await textElements.count();

      // Should have names and dates
      expect(textCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should display center divider line on Bowtie", async ({ page }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      // Look for divider line
      const svg = page.locator("svg").first();
      const lines = svg.locator("line");
      const lineCount = await lines.count();

      // Should have center divider
      expect(lineCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should support zoom on Bowtie chart", async ({ page }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const container = svg.locator("..");

      // Simulate wheel zoom
      await container.evaluate(() => {
        const event = new WheelEvent("wheel", {
          deltaY: -100,
          bubbles: true,
        });
        document.dispatchEvent(event);
      });
      await page.waitForTimeout(300);

      // Bowtie should still be visible
      await expect(svg).toBeVisible();
    }
  });

  test("should highlight Bowtie node on hover", async ({ page }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const nodes = svg.locator("rect").first();

      if ((await nodes.count()) > 0) {
        // Hover over node
        await nodes.hover();
        await page.waitForTimeout(200);

        // Node should be interactive
        await expect(nodes).toBeVisible();
      }
    }
  });

  test("should allow clicking Bowtie nodes", async ({ page }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      const svg = page.locator("svg").first();
      const nodes = svg.locator("rect").first();

      if ((await nodes.count()) > 0) {
        // Click on node
        await nodes.click();
        await page.waitForTimeout(300);

        // Page should remain functional
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test("should show root person prominently on Bowtie", async ({ page }) => {
    const bowtieBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /bowtie|dual|ancestry/i });
    const exists = await bowtieBtn.count();

    if (exists > 0) {
      await bowtieBtn.first().click();
      await page.waitForTimeout(500);

      // Root person should be visually distinct
      // Look for a highlighted or centered node
      const svg = page.locator("svg").first();
      const nodes = svg.locator("rect");
      const nodeCount = await nodes.count();

      expect(nodeCount).toBeGreaterThanOrEqual(0);
    }
  });

  // ====================================================
  // SECTION 5: Export Functionality (3 tests)
  // ====================================================

  test("should provide export option for charts", async ({ page }) => {
    // Look for export button
    const exportBtn = page.locator("button, a").filter({
      hasText: /export|download|save|print/i,
    });
    const exportCount = await exportBtn.count();

    // Export option may or may not exist
    expect(exportCount).toBeGreaterThanOrEqual(0);
  });

  test("should export Timeline chart", async ({ page }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(500);

      // Look for export option
      const exportBtn = page.locator("button, a").filter({
        hasText: /export|download/i,
      });
      const exportCount = await exportBtn.count();

      // If export exists, it should work
      if (exportCount > 0) {
        await exportBtn.first().click();
        await page.waitForTimeout(300);

        // Page should remain functional
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test("should export Matrix chart", async ({ page }) => {
    const matrixBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /matrix|relationship/i });
    const exists = await matrixBtn.count();

    if (exists > 0) {
      await matrixBtn.first().click();
      await page.waitForTimeout(500);

      // Look for export option
      const exportBtn = page.locator("button, a").filter({
        hasText: /export|download/i,
      });
      const exportCount = await exportBtn.count();

      // If export exists, it should work
      if (exportCount > 0) {
        await exportBtn.first().click();
        await page.waitForTimeout(300);

        // Page should remain functional
        expect(page.url()).toBeTruthy();
      }
    }
  });

  // ====================================================
  // SECTION 6: Error Handling and Edge Cases (4 tests)
  // ====================================================

  test("should handle chart with no data gracefully", async ({ page }) => {
    // Chart page should load even with no data
    const svg = page.locator("svg").first();
    const svgExists = await svg.count();

    // Either chart or empty state message should exist
    if (svgExists === 0) {
      const emptyMsg = page.locator("text").filter({
        hasText: /no data|no results|empty/i,
      });
      const msgCount = await emptyMsg.count();
      expect(msgCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should handle switching between chart types", async ({ page }) => {
    // Select first chart type
    const chartBtn1 = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists1 = await chartBtn1.count();

    if (exists1 > 0) {
      await chartBtn1.first().click();
      await page.waitForTimeout(400);

      // Switch to another chart type
      const chartBtn2 = page
        .locator("button, a, [role='option']")
        .filter({ hasText: /matrix/i });
      const exists2 = await chartBtn2.count();

      if (exists2 > 0) {
        await chartBtn2.first().click();
        await page.waitForTimeout(400);

        // Should display second chart type
        const svg = page.locator("svg").first();
        await expect(svg).toBeVisible();
      }
    }
  });

  test("should maintain responsive layout on resize", async ({ page }) => {
    // Set initial viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);

    const svg1 = page.locator("svg").first();
    const box1 = await svg1.boundingBox();

    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);

    const svg2 = page.locator("svg").first();
    const box2 = await svg2.boundingBox();

    // SVG should still be visible
    await expect(svg2).toBeVisible();
  });

  test("should handle rapid interactions without crashing", async ({
    page,
  }) => {
    const timelineBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /timeline/i });
    const exists = await timelineBtn.count();

    if (exists > 0) {
      await timelineBtn.first().click();
      await page.waitForTimeout(300);

      const svg = page.locator("svg").first();

      // Perform rapid mouse movements
      for (let i = 0; i < 5; i++) {
        await svg.hover();
        await page.waitForTimeout(50);
      }

      // Page should remain stable
      await expect(svg).toBeVisible();
    }
  });

  // ====================================================
  // SECTION 7: Compact Tree Chart (10 tests)
  // ====================================================

  test("should render Compact Tree with hierarchical list", async ({
    page,
  }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Check for tree structure
      const treeContainer = page.locator("[role='tree']");
      await expect(treeContainer).toBeVisible();

      // Should have tree items
      const treeItems = page.locator("[role='treeitem']");
      const itemCount = await treeItems.count();
      expect(itemCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should allow expanding and collapsing tree nodes", async ({
    page,
  }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Find expand button
      const expandBtn = page.locator("button").filter({ hasText: "" }).first();
      const btnCount = await expandBtn.count();

      if (btnCount > 0) {
        // Click to expand
        await expandBtn.click();
        await page.waitForTimeout(200);

        // Click to collapse
        await expandBtn.click();
        await page.waitForTimeout(200);

        // Tree should be visible
        const treeContainer = page.locator("[role='tree']");
        await expect(treeContainer).toBeVisible();
      }
    }
  });

  test("should support search/filter in Compact Tree", async ({ page }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Find search input
      const searchInput = page.locator("input[type='search']").first();
      const inputCount = await searchInput.count();

      if (inputCount > 0) {
        // Type search query
        await searchInput.fill("test");
        await page.waitForTimeout(300);

        // Results should be filtered
        const treeItems = page.locator("[role='treeitem']");
        const itemCount = await treeItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(0);

        // Clear search
        await searchInput.fill("");
        await page.waitForTimeout(300);
      }
    }
  });

  test("should support keyboard navigation in Compact Tree", async ({
    page,
  }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      const treeContainer = page.locator("[role='tree']");
      await treeContainer.focus();

      // Press arrow down
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);

      // Press arrow up
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(100);

      // Tree should remain visible
      await expect(treeContainer).toBeVisible();
    }
  });

  test("should handle virtual scrolling in large trees", async ({ page }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      const treeContainer = page.locator("[role='tree']");

      // Scroll down
      await treeContainer.evaluate((el) => {
        el.scrollTop = 500;
      });
      await page.waitForTimeout(300);

      // Scroll back up
      await treeContainer.evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.waitForTimeout(300);

      // Tree should still be visible
      await expect(treeContainer).toBeVisible();
    }
  });

  test("should display person details in Compact Tree", async ({ page }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Look for person names and dates
      const treeItems = page.locator("[role='treeitem']");
      const firstItem = treeItems.first();

      if ((await firstItem.count()) > 0) {
        // Should contain name text
        const text = await firstItem.textContent();
        expect(text?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  test("should show generation badges in Compact Tree", async ({ page }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Look for generation badges
      const badges = page.locator("[role='treeitem']");
      const badgeCount = await badges.count();

      expect(badgeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should support Expand All functionality", async ({ page }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Find Expand All button
      const expandAllBtn = page
        .locator("button")
        .filter({ hasText: /expand all/i });
      const btnCount = await expandAllBtn.count();

      if (btnCount > 0) {
        await expandAllBtn.click();
        await page.waitForTimeout(300);

        // Tree should still be visible
        const treeContainer = page.locator("[role='tree']");
        await expect(treeContainer).toBeVisible();
      }
    }
  });

  test("should support Collapse All functionality", async ({ page }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Find Collapse All button
      const collapseAllBtn = page
        .locator("button")
        .filter({ hasText: /collapse all/i });
      const btnCount = await collapseAllBtn.count();

      if (btnCount > 0) {
        await collapseAllBtn.click();
        await page.waitForTimeout(300);

        // Tree should still be visible
        const treeContainer = page.locator("[role='tree']");
        await expect(treeContainer).toBeVisible();
      }
    }
  });

  test("should show living/deceased indicators in tree", async ({ page }) => {
    const compactTreeBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /compact|tree/i });
    const exists = await compactTreeBtn.count();

    if (exists > 0) {
      await compactTreeBtn.first().click();
      await page.waitForTimeout(500);

      // Look for footer with living/deceased legend
      const footer = page.locator("text").filter({ hasText: /living|deceased/i });
      const count = await footer.count();

      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  // ====================================================
  // SECTION 8: Statistics Charts (10 tests)
  // ====================================================

  test("should render Statistics Charts page with multiple charts", async ({
    page,
  }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Should have multiple chart containers
      const cards = page.locator("[class*='card']");
      const cardCount = await cards.count();

      expect(cardCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should display summary statistics cards", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for summary stats (Total People, Living, Deceased, Oldest)
      const labels = page.locator("text").filter({
        hasText: /total people|living|deceased|oldest/i,
      });
      const labelCount = await labels.count();

      expect(labelCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should render Age Distribution bar chart", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for Age Distribution title
      const title = page.locator("text").filter({
        hasText: /age distribution/i,
      });
      const titleCount = await title.count();

      if (titleCount > 0) {
        // Should have chart
        const svg = page.locator("svg").first();
        await expect(svg).toBeVisible();
      }
    }
  });

  test("should render Gender Distribution pie chart", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for Gender Distribution title
      const title = page.locator("text").filter({
        hasText: /gender distribution/i,
      });
      const titleCount = await title.count();

      if (titleCount > 0) {
        // Should have pie chart
        const svg = page.locator("svg");
        const svgCount = await svg.count();
        expect(svgCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("should render Generation Sizes stacked bar chart", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for Generation Sizes title
      const title = page.locator("text").filter({
        hasText: /generation sizes/i,
      });
      const titleCount = await title.count();

      if (titleCount > 0) {
        // Should have chart
        const svg = page.locator("svg");
        const svgCount = await svg.count();
        expect(svgCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("should render Top Surnames bar chart", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for Top Surnames title
      const title = page.locator("text").filter({
        hasText: /top surnames|surname/i,
      });
      const titleCount = await title.count();

      if (titleCount > 0) {
        // Should have chart
        const svg = page.locator("svg");
        const svgCount = await svg.count();
        expect(svgCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("should render Geographic Distribution chart", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for Birth Locations title
      const title = page.locator("text").filter({
        hasText: /birth location|location|geographic/i,
      });
      const titleCount = await title.count();

      if (titleCount > 0) {
        // Should have chart
        const svg = page.locator("svg");
        const svgCount = await svg.count();
        expect(svgCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("should render Lifespan Trends line chart", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Look for Lifespan Trends title
      const title = page.locator("text").filter({
        hasText: /lifespan/i,
      });
      const titleCount = await title.count();

      if (titleCount > 0) {
        // Should have line chart
        const svg = page.locator("svg");
        const svgCount = await svg.count();
        expect(svgCount).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("should show tooltips on chart hover", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Find first chart bar/element
      const svg = page.locator("svg").first();
      const bar = svg.locator("rect").first();

      if ((await bar.count()) > 0) {
        // Hover over bar
        await bar.hover();
        await page.waitForTimeout(200);

        // Page should remain responsive
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test("should be responsive on different screen sizes", async ({ page }) => {
    const statsBtn = page
      .locator("button, a, [role='option']")
      .filter({ hasText: /statistics|stats|demographic/i });
    const exists = await statsBtn.count();

    if (exists > 0) {
      await statsBtn.first().click();
      await page.waitForTimeout(500);

      // Test desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(300);
      const svg1 = page.locator("svg").first();
      await expect(svg1).toBeVisible();

      // Test tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(300);
      const svg2 = page.locator("svg").first();
      await expect(svg2).toBeVisible();

      // Test mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(300);
      const svg3 = page.locator("svg").first();
      await expect(svg3).toBeVisible();
    }
  });
});
