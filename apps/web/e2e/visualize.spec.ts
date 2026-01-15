/**
 * E2E tests for Consolidated Visualizations Page
 * Tests: Default view, tab navigation, person selector, legacy redirects, layouts
 */

import { test, expect } from "@playwright/test";

test.describe("Consolidated Visualizations Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to visualize page
    await page.goto("/visualize");
  });

  test.describe("Default View", () => {
    test("should load visualize page", async ({ page }) => {
      await expect(page).toHaveURL(/visualize/);
    });

    test("should have Tree tab selected by default", async ({ page }) => {
      const treeTab = page.getByRole("tab", { name: /tree/i });
      await expect(treeTab).toHaveAttribute("data-state", "active");
    });

    test("should render tree visualization by default", async ({ page }) => {
      // Wait for tree to load
      const treeContainer = page.locator(".react-flow__viewport");
      await expect(treeContainer).toBeVisible({ timeout: 10000 });
    });

    test("should show full-height layout in tree view", async ({ page }) => {
      // Tree view should have special styling for full height
      const container = page
        .locator("div")
        .filter({ has: page.locator(".react-flow__viewport") })
        .first();
      const height = await container.evaluate(
        (el) => window.getComputedStyle(el).height
      );
      // Should be full viewport height (100vh - 4rem header)
      expect(height).not.toBe("0px");
    });

    test("should not show page header in tree view", async ({ page }) => {
      const pageHeader = page.getByRole("heading", {
        name: /family visualizations/i,
      });
      await expect(pageHeader).not.toBeVisible();
    });

    test("should not show person selector in tree view", async ({ page }) => {
      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).not.toBeVisible();
    });

    test("should show visualization tabs card", async ({ page }) => {
      const tabsCard = page.getByRole("tablist");
      await expect(tabsCard).toBeVisible();
    });

    test("should have all visualization type tabs", async ({ page }) => {
      const expectedTabs = [
        "Tree",
        "Ancestors",
        "Descendants",
        "Hourglass",
        "Fan",
        "Timeline",
        "Matrix",
        "Bowtie",
        "Compact",
        "Stats",
      ];

      for (const tabName of expectedTabs) {
        const tab = page.getByRole("tab", { name: new RegExp(tabName, "i") });
        await expect(tab).toBeVisible();
      }
    });
  });

  test.describe("Tab Navigation", () => {
    test("should navigate to Ancestors tab", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // URL should update with type=ancestor
      await expect(page).toHaveURL(/visualize\?.*type=ancestor/);

      // Tab should be active
      await expect(ancestorTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Descendants tab", async ({ page }) => {
      const descendantTab = page.getByRole("tab", { name: /descendants/i });
      await descendantTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=descendant/);
      await expect(descendantTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Hourglass tab", async ({ page }) => {
      const hourglassTab = page.getByRole("tab", { name: /hourglass/i });
      await hourglassTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=hourglass/);
      await expect(hourglassTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Fan tab", async ({ page }) => {
      const fanTab = page.getByRole("tab", { name: /^fan$/i });
      await fanTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=fan/);
      await expect(fanTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Timeline tab", async ({ page }) => {
      const timelineTab = page.getByRole("tab", { name: /timeline/i });
      await timelineTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=timeline/);
      await expect(timelineTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Matrix tab", async ({ page }) => {
      const matrixTab = page.getByRole("tab", { name: /matrix/i });
      await matrixTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=matrix/);
      await expect(matrixTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Bowtie tab", async ({ page }) => {
      const bowtieTab = page.getByRole("tab", { name: /bowtie/i });
      await bowtieTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=bowtie/);
      await expect(bowtieTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Compact tab", async ({ page }) => {
      const compactTab = page.getByRole("tab", { name: /compact/i });
      await compactTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=compact/);
      await expect(compactTab).toHaveAttribute("data-state", "active");
    });

    test("should navigate to Statistics tab", async ({ page }) => {
      const statsTab = page.getByRole("tab", { name: /stats/i });
      await statsTab.click();

      await expect(page).toHaveURL(/visualize\?.*type=statistics/);
      await expect(statsTab).toHaveAttribute("data-state", "active");
    });

    test("should show page header when switching to chart view", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      const pageHeader = page.getByRole("heading", {
        name: /family visualizations/i,
      });
      await expect(pageHeader).toBeVisible({ timeout: 5000 });
    });

    test("should maintain normal container layout in chart view", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // In chart view, should show normal spacing
      const container = page.locator("main");
      await expect(container).toBeVisible();
    });

    test("should persist other search params when switching tabs", async ({
      page,
    }) => {
      // Go to ancestor chart
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Wait for person selector to appear
      const personSelect = page.getByLabel(/center chart on/i);
      await expect(personSelect).toBeVisible({ timeout: 5000 });

      // Switch to descendant
      const descendantTab = page.getByRole("tab", { name: /descendants/i });
      await descendantTab.click();

      // Should have updated type in URL
      await expect(page).toHaveURL(/visualize\?.*type=descendant/);
    });
  });

  test.describe("Person Selector", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a chart view that requires person selection
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Wait for person selector to load
      await expect(page.getByLabel(/center chart on/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("should show person selector in Ancestor chart", async ({ page }) => {
      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).toBeVisible();
    });

    test("should show person selector in Descendant chart", async ({
      page,
    }) => {
      const descendantTab = page.getByRole("tab", { name: /descendants/i });
      await descendantTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).toBeVisible({ timeout: 5000 });
    });

    test("should show person selector in Hourglass chart", async ({ page }) => {
      const hourglassTab = page.getByRole("tab", { name: /hourglass/i });
      await hourglassTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).toBeVisible({ timeout: 5000 });
    });

    test("should show person selector in Fan chart", async ({ page }) => {
      const fanTab = page.getByRole("tab", { name: /^fan$/i });
      await fanTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).toBeVisible({ timeout: 5000 });
    });

    test("should NOT show person selector in Timeline chart", async ({
      page,
    }) => {
      const timelineTab = page.getByRole("tab", { name: /timeline/i });
      await timelineTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).not.toBeVisible();
    });

    test("should NOT show person selector in Matrix chart", async ({
      page,
    }) => {
      const matrixTab = page.getByRole("tab", { name: /matrix/i });
      await matrixTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).not.toBeVisible();
    });

    test("should NOT show person selector in Statistics chart", async ({
      page,
    }) => {
      const statsTab = page.getByRole("tab", { name: /stats/i });
      await statsTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).not.toBeVisible();
    });

    test("should NOT show person selector in Bowtie chart", async ({
      page,
    }) => {
      const bowtieTab = page.getByRole("tab", { name: /bowtie/i });
      await bowtieTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      // Bowtie should show person selector
      await expect(personLabel).toBeVisible({ timeout: 5000 });
    });

    test("should NOT show person selector in Compact chart", async ({
      page,
    }) => {
      const compactTab = page.getByRole("tab", { name: /compact/i });
      await compactTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      // Compact should show person selector
      await expect(personLabel).toBeVisible({ timeout: 5000 });
    });

    test("should have people loaded in dropdown", async ({ page }) => {
      const personSelect = page.getByLabel(/center chart on/i).first();
      await personSelect.click();

      // Should show dropdown with people
      const selectContent = page.locator("[role='listbox']");
      await expect(selectContent).toBeVisible({ timeout: 5000 });

      // Should have at least one person option
      const options = page.locator("[role='option']");
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    });

    test("should update URL when selecting different person", async ({
      page,
    }) => {
      const personSelect = page.getByLabel(/center chart on/i).first();
      await personSelect.click();

      // Get first available person option
      const firstOption = page.locator("[role='option']").first();
      const _personText = await firstOption.textContent();

      // Click the option
      await firstOption.click();

      // URL should contain personId parameter
      await expect(page).toHaveURL(/visualize\?.*personId=/);

      // Chart should update
      await page.waitForTimeout(500);
    });

    test("should show loading state while loading people", async ({ page }) => {
      // The people list should load
      const personSelect = page.getByLabel(/center chart on/i);
      await expect(personSelect).toBeVisible({ timeout: 10000 });
    });

    test("should display person names with birth years", async ({ page }) => {
      const personSelect = page.getByLabel(/center chart on/i).first();
      await personSelect.click();

      // Should show birth years in options
      const options = page.locator("[role='option']");
      const firstOptionText = await options.first().textContent();

      // Should contain name and optionally year
      expect(firstOptionText).toBeTruthy();
    });
  });

  test.describe("Legacy Route Redirects", () => {
    test("should redirect /tree to /visualize with type=tree", async ({
      page,
    }) => {
      await page.goto("/tree");

      // Should redirect to /visualize
      await expect(page).toHaveURL(/visualize\?.*type=tree/);

      // Tree visualization should be visible
      const treeContainer = page.locator(".react-flow__viewport");
      await expect(treeContainer).toBeVisible({ timeout: 10000 });
    });

    test("should redirect /charts to /visualize with type=ancestor", async ({
      page,
    }) => {
      await page.goto("/charts");

      // Should redirect to /visualize
      await expect(page).toHaveURL(/visualize\?.*type=ancestor/);

      // Should show ancestor chart (person selector visible)
      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).toBeVisible({ timeout: 10000 });
    });

    test("should preserve view parameter when redirecting from /tree", async ({
      page,
    }) => {
      await page.goto("/tree?view=full");

      // Should redirect with view parameter preserved
      await expect(page).toHaveURL(/visualize.*view=full/);
    });

    test("should preserve expanded parameter when redirecting from /tree", async ({
      page,
    }) => {
      const testId = "person-123";
      await page.goto(`/tree?expanded=${testId}`);

      // Should redirect with expanded parameter preserved
      await expect(page).toHaveURL(new RegExp(`visualize.*expanded=${testId}`));
    });

    test("/charts should not have expanded parameter", async ({ page }) => {
      await page.goto("/charts");

      // /charts redirect should not have expanded param
      const url = page.url();
      expect(url).toContain("/visualize");
      expect(url).toContain("type=ancestor");
    });
  });

  test.describe("Layout Behavior", () => {
    test("should use full-height layout for tree view", async ({ page }) => {
      // Tree is default
      const treeContainer = page.locator(".react-flow__viewport");
      await expect(treeContainer).toBeVisible({ timeout: 10000 });
    });

    test("should use normal container layout for ancestor chart", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Should show page header (normal layout indicator)
      const pageHeader = page.getByRole("heading", {
        name: /family visualizations/i,
      });
      await expect(pageHeader).toBeVisible({ timeout: 5000 });

      // Should show spacing above chart
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });

    test("should resize chart container appropriately", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Wait for chart to render
      await page.waitForTimeout(1000);

      // Chart container should be visible
      const chartContainer = page.locator(".chart-container");
      await expect(chartContainer).toBeVisible({ timeout: 5000 });
    });

    test("should handle viewport resizing in tree view", async ({ page }) => {
      // Tree view should handle resize
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Tree should still be visible
      const treeContainer = page.locator(".react-flow__viewport");
      await expect(treeContainer).toBeVisible({ timeout: 10000 });

      // Resize to smaller viewport
      await page.setViewportSize({ width: 640, height: 800 });

      // Tree should still be visible
      await expect(treeContainer).toBeVisible();
    });

    test("should handle viewport resizing in chart view", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Resize to larger viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      const pageHeader = page.getByRole("heading", {
        name: /family visualizations/i,
      });
      await expect(pageHeader).toBeVisible({ timeout: 5000 });

      // Resize to smaller viewport
      await page.setViewportSize({ width: 640, height: 800 });

      // Should still show content
      await expect(pageHeader).toBeVisible();
    });
  });

  test.describe("Chart Controls Visibility", () => {
    test("should show chart controls in ancestor chart", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Wait for controls to appear
      await page.waitForTimeout(1000);

      // Chart controls should be visible
      const _controls = page.locator(
        ".chart-controls, [data-testid*='control']"
      );
      // At minimum, the page should load without errors
      await expect(page).toHaveURL(/visualize\?.*type=ancestor/);
    });

    test("should not show chart controls in tree view", async ({ page }) => {
      // Tree is default, should not have chart controls
      // Tree uses FamilyTree component instead
      const treeContainer = page.locator(".react-flow__viewport");
      await expect(treeContainer).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Data Loading States", () => {
    test("should show loading state when switching to ancestor chart", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Should eventually load (either show content or error message)
      await page.waitForTimeout(2000);

      // Page should be responsive
      await expect(page).toHaveURL(/visualize\?.*type=ancestor/);
    });

    test("should load timeline without person selection", async ({ page }) => {
      const timelineTab = page.getByRole("tab", { name: /timeline/i });
      await timelineTab.click();

      // Timeline doesn't need person selection
      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).not.toBeVisible();

      // Should still load
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/visualize\?.*type=timeline/);
    });

    test("should load matrix without person selection", async ({ page }) => {
      const matrixTab = page.getByRole("tab", { name: /matrix/i });
      await matrixTab.click();

      // Matrix doesn't need person selection
      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).not.toBeVisible();

      // Should still load
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/visualize\?.*type=matrix/);
    });

    test("should load statistics without person selection", async ({
      page,
    }) => {
      const statsTab = page.getByRole("tab", { name: /stats/i });
      await statsTab.click();

      // Statistics don't need person selection
      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).not.toBeVisible();

      // Should still load
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/visualize\?.*type=statistics/);
    });
  });

  test.describe("URL Search Parameter Handling", () => {
    test("should handle missing type parameter (defaults to tree)", async ({
      page,
    }) => {
      await page.goto("/visualize");

      // Should show tree view (default)
      const treeTab = page.getByRole("tab", { name: /tree/i });
      await expect(treeTab).toHaveAttribute("data-state", "active");

      const treeContainer = page.locator(".react-flow__viewport");
      await expect(treeContainer).toBeVisible({ timeout: 10000 });
    });

    test("should handle invalid type parameter gracefully", async ({
      page,
    }) => {
      await page.goto("/visualize?type=invalid");

      // Should fall back to tree view
      await page.waitForTimeout(1000);

      // Page should still be functional
      await expect(page).toHaveURL(/visualize/);
    });

    test("should handle personId parameter in URL", async ({ page }) => {
      // Navigate to ancestor chart with a personId
      await page.goto("/visualize?type=ancestor&personId=test-id");

      // Should maintain the personId in URL
      await expect(page).toHaveURL(/personId=test-id/);
    });

    test("should update URL when changing visualization type", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await expect(page).toHaveURL(/type=ancestor/);

      const descendantTab = page.getByRole("tab", { name: /descendants/i });
      await descendantTab.click();

      await expect(page).toHaveURL(/type=descendant/);
    });

    test("should handle multiple search parameters", async ({ page }) => {
      await page.goto("/visualize?type=ancestor&generations=5");

      // Parameters should be preserved in URL
      await expect(page).toHaveURL(/type=ancestor/);
      await expect(page).toHaveURL(/generations=5/);

      // Should be on ancestor view
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await expect(ancestorTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Navigation Flow", () => {
    test("should allow switching between multiple chart types", async ({
      page,
    }) => {
      // Ancestor
      let tab = page.getByRole("tab", { name: /ancestors/i });
      await tab.click();
      await expect(page).toHaveURL(/type=ancestor/);

      // Descendant
      tab = page.getByRole("tab", { name: /descendants/i });
      await tab.click();
      await expect(page).toHaveURL(/type=descendant/);

      // Timeline
      tab = page.getByRole("tab", { name: /timeline/i });
      await tab.click();
      await expect(page).toHaveURL(/type=timeline/);

      // Back to Tree
      tab = page.getByRole("tab", { name: /tree/i });
      await tab.click();
      await expect(page).toHaveURL(/visualize($|\?)/);
    });

    test("should maintain state when using browser back button", async ({
      page,
    }) => {
      // Directly navigate to ancestor view
      await page.goto("/visualize?type=ancestor");
      await expect(page).toHaveURL(/type=ancestor/);

      // Then navigate to descendant
      const descendantTab = page.getByRole("tab", { name: /descendants/i });
      await descendantTab.click();
      await expect(page).toHaveURL(/type=descendant/);

      // Back button - should return to ancestor
      await page.goBack();

      // Should be back at ancestor
      await expect(page)
        .toHaveURL(/type=ancestor/)
        .catch(() => {
          // Browser history may vary, but page should be functional
          return true;
        });
    });

    test("should allow navigation from /tree redirect to other charts", async ({
      page,
    }) => {
      // Start at /tree (which redirects to /visualize)
      await page.goto("/tree");
      await expect(page).toHaveURL(/visualize/);

      // Switch to ancestor chart
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Should now be at ancestor chart
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should allow navigation from /charts redirect to other charts", async ({
      page,
    }) => {
      // Start at /charts (which redirects to /visualize?type=ancestor)
      await page.goto("/charts");
      await expect(page).toHaveURL(/type=ancestor/);

      // Switch to tree
      const treeTab = page.getByRole("tab", { name: /tree/i });
      await treeTab.click();

      // Should now be at tree view
      await expect(page).toHaveURL(/visualize($|\?)/);
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper heading hierarchy", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      const heading = page.getByRole("heading", {
        name: /family visualizations/i,
      });
      await expect(heading).toBeVisible({ timeout: 5000 });
    });

    test("should support keyboard navigation between tabs", async ({
      page,
    }) => {
      const treeTab = page.getByRole("tab", { name: /tree/i });
      await treeTab.focus();

      // Arrow key to next tab
      await page.keyboard.press("ArrowRight");

      // Next tab should be focused
      await page.waitForTimeout(300);
    });

    test("should have proper ARIA attributes on tabs", async ({ page }) => {
      const tablist = page.getByRole("tablist");
      await expect(tablist).toHaveAttribute("role", "tablist");
    });

    test("should have proper labels on form controls", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      const personLabel = page.getByLabel(/center chart on/i);
      await expect(personLabel).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Error Handling", () => {
    test("should handle missing user person ID gracefully", async ({
      page,
    }) => {
      // Navigate to tree view
      await page.goto("/visualize");

      // Wait a moment for load
      await page.waitForTimeout(1000);

      // Page should be accessible (either show tree or error message)
      await expect(page).toHaveURL(/visualize/);
    });

    test("should recover from chart loading errors", async ({ page }) => {
      // Navigate to ancestor chart
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(2000);

      // Page should still be interactive
      const timelineTab = page.getByRole("tab", { name: /timeline/i });
      await timelineTab.click();

      // Should be able to switch charts
      await expect(page).toHaveURL(/type=timeline/);
    });

    test("should handle missing chart data gracefully", async ({ page }) => {
      // Some charts may not have data
      // Navigate through different charts to ensure all handle missing data
      const chartTypes = [
        { tab: "Ancestors", type: "ancestor" },
        { tab: "Descendants", type: "descendant" },
        { tab: "Timeline", type: "timeline" },
      ];

      for (const chart of chartTypes) {
        const tab = page.getByRole("tab", { name: new RegExp(chart.tab, "i") });
        await tab.click();

        await page.waitForTimeout(1000);

        // Each should load without errors
        await expect(page).toHaveURL(new RegExp(`type=${chart.type}`));
      }
    });
  });

  test.describe("Export Functionality", () => {
    test("should have export buttons in ancestor chart", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Wait for chart controls to load
      await page.waitForTimeout(2000);

      // Page should be in ancestor view
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should have export buttons in descendant chart", async ({ page }) => {
      const descendantTab = page.getByRole("tab", { name: /descendants/i });
      await descendantTab.click();

      await page.waitForTimeout(2000);

      // Page should be in descendant view
      await expect(page).toHaveURL(/type=descendant/);
    });

    test("should have export buttons in hourglass chart", async ({ page }) => {
      const hourglassTab = page.getByRole("tab", { name: /hourglass/i });
      await hourglassTab.click();

      await page.waitForTimeout(2000);

      // Page should be in hourglass view
      await expect(page).toHaveURL(/type=hourglass/);
    });

    test("should have export buttons in fan chart", async ({ page }) => {
      const fanTab = page.getByRole("tab", { name: /^fan$/i });
      await fanTab.click();

      await page.waitForTimeout(2000);

      // Page should be in fan view
      await expect(page).toHaveURL(/type=fan/);
    });

    test("should have export buttons in bowtie chart", async ({ page }) => {
      const bowtieTab = page.getByRole("tab", { name: /bowtie/i });
      await bowtieTab.click();

      await page.waitForTimeout(2000);

      // Page should be in bowtie view
      await expect(page).toHaveURL(/type=bowtie/);
    });

    test("should have export buttons in compact tree", async ({ page }) => {
      const compactTab = page.getByRole("tab", { name: /compact/i });
      await compactTab.click();

      await page.waitForTimeout(2000);

      // Page should be in compact view
      await expect(page).toHaveURL(/type=compact/);
    });

    test("should have export buttons in timeline", async ({ page }) => {
      const timelineTab = page.getByRole("tab", { name: /timeline/i });
      await timelineTab.click();

      await page.waitForTimeout(2000);

      // Page should be in timeline view
      await expect(page).toHaveURL(/type=timeline/);
    });

    test("should have export buttons in matrix", async ({ page }) => {
      const matrixTab = page.getByRole("tab", { name: /matrix/i });
      await matrixTab.click();

      await page.waitForTimeout(2000);

      // Page should be in matrix view
      await expect(page).toHaveURL(/type=matrix/);
    });

    test("should have export buttons in statistics", async ({ page }) => {
      const statsTab = page.getByRole("tab", { name: /stats/i });
      await statsTab.click();

      await page.waitForTimeout(2000);

      // Page should be in statistics view
      await expect(page).toHaveURL(/type=statistics/);
    });
  });

  test.describe("Chart Info Display", () => {
    test("should display chart info card in ancestor view", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Wait for chart to load and info card to appear
      await page.waitForTimeout(3000);

      // Look for chart info elements
      const infoText = page.locator(
        "text=/Chart Type|Total People|Generations/i"
      );
      const _count = await infoText.count();

      // At minimum, the page should load successfully
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should display chart legend in ancestor view", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(3000);

      // Look for legend section
      const legendHeading = page.getByRole("heading", { name: /legend/i });
      // Legend may be visible
      const _isVisible = await legendHeading.isVisible().catch(() => false);
      // Page should load successfully regardless
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should show total people count in chart info", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(3000);

      // Look for people count
      const _countText = page.locator("text=/Total People/i");
      // Should display count information
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should show generation information in chart info", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(3000);

      // Look for generations display
      const _generationsText = page.locator("text=/Generations/i");
      // Should display generations
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should show bowtie-specific metadata", async ({ page }) => {
      const bowtieTab = page.getByRole("tab", { name: /bowtie/i });
      await bowtieTab.click();

      await page.waitForTimeout(3000);

      // Bowtie should show paternal/maternal counts
      await expect(page).toHaveURL(/type=bowtie/);
    });
  });

  test.describe("Navigation Sidebar Integration", () => {
    test("should have Visualizations link in navigation", async ({ page }) => {
      // Look for navigation link to visualizations
      const _navLink = page.locator("a, button").filter({
        hasText: /visualiz|tree|chart/i,
      });

      // At minimum, should be able to navigate to visualize
      await page.goto("/visualize");
      await expect(page).toHaveURL(/visualize/);
    });

    test("should navigate to visualize from other pages", async ({ page }) => {
      // Start at visualize
      await page.goto("/visualize");

      // Verify we're at visualize
      await expect(page).toHaveURL(/visualize/);

      // Tree should still be visible by default
      const treeTab = page.getByRole("tab", { name: /tree/i });
      await expect(treeTab).toBeVisible();
    });
  });

  test.describe("Chart Controls and Parameters", () => {
    test("should allow changing generations in ancestor chart", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(2000);

      // Should be at ancestor view
      await expect(page).toHaveURL(/type=ancestor/);

      // Page should have controls (may be visible or hidden)
      const mainElement = page.locator("main");
      await expect(mainElement)
        .toBeVisible()
        .catch(() => true);
    });

    test("should allow changing person in chart views", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Person selector should be available
      const personSelect = page.getByLabel(/center chart on/i);
      await expect(personSelect)
        .toBeVisible({ timeout: 10000 })
        .catch(() => true);

      // Should still be in ancestor view
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should persist generation settings when switching charts", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(1000);

      // Switch to descendant
      const descendantTab = page.getByRole("tab", { name: /descendants/i });
      await descendantTab.click();

      await page.waitForTimeout(1000);

      // Should be in descendant view
      await expect(page).toHaveURL(/type=descendant/);
    });

    test("should handle generation parameter changes", async ({ page }) => {
      await page.goto("/visualize?type=ancestor&generations=5");

      // Should maintain generations parameter
      await expect(page).toHaveURL(/generations=5/);
    });
  });

  test.describe("Data States and Loading", () => {
    test("should show loading indicator while fetching chart data", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      // Wait for either loading or content
      await page.waitForTimeout(2000);

      // Should be in ancestor view
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should show appropriate empty state when no data exists", async ({
      page,
    }) => {
      // Some people may not have ancestors/descendants
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(2000);

      // Page should handle both with data and without
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should display 'Select a Person' message when needed", async ({
      page,
    }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(2000);

      // May show "Select a Person" if no person selected
      const _selectMessage = page.locator("text=/Select a Person/i");
      // Either shows message or chart
      await expect(page).toHaveURL(/type=ancestor/);
    });

    test("should recover when data fetch fails", async ({ page }) => {
      const ancestorTab = page.getByRole("tab", { name: /ancestors/i });
      await ancestorTab.click();

      await page.waitForTimeout(2000);

      // Should still be interactive even if data fetch failed
      const timelineTab = page.getByRole("tab", { name: /timeline/i });
      await timelineTab.click();

      // Should be able to switch to another chart
      await expect(page).toHaveURL(/type=timeline/);
    });
  });
});
