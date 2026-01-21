/**
 * Shared Viewport Definitions for Responsive Testing
 * Single source of truth for standard device viewports used across E2E tests
 */

/**
 * Viewport configuration with metadata
 */
export interface ViewportConfig {
  width: number;
  height: number;
  name: "mobile" | "tablet" | "desktop";
}

/**
 * Standard viewport sizes for testing responsive behavior
 * Based on common device breakpoints
 */
export const VIEWPORTS = {
  /**
   * Mobile viewport (iPhone SE / similar)
   * Breakpoint: < 640px (Tailwind's sm breakpoint)
   */
  mobile: {
    width: 375,
    height: 667,
    name: "mobile" as const,
  },

  /**
   * Tablet viewport (iPad / similar)
   * Breakpoint: 640px - 1024px (Tailwind's md/lg boundary)
   */
  tablet: {
    width: 768,
    height: 1024,
    name: "tablet" as const,
  },

  /**
   * Desktop viewport (standard monitor)
   * Breakpoint: >= 1024px (Tailwind's lg breakpoint)
   */
  desktop: {
    width: 1920,
    height: 1080,
    name: "desktop" as const,
  },
} as const;

/**
 * All standard viewports as an array for parametrized tests
 */
export const VIEWPORT_ARRAY: ViewportConfig[] = [
  VIEWPORTS.mobile,
  VIEWPORTS.tablet,
  VIEWPORTS.desktop,
];

/**
 * Helper to get viewport by device type
 * @param deviceType The device type: "mobile" | "tablet" | "desktop"
 * @returns The viewport configuration for that device type
 */
export function getViewport(
  deviceType: "mobile" | "tablet" | "desktop"
): ViewportConfig {
  return VIEWPORTS[deviceType];
}

/**
 * Helper to check if a width falls within a device category
 * @param width The viewport width in pixels
 * @returns The device type: "mobile" | "tablet" | "desktop"
 */
export function getDeviceTypeFromWidth(
  width: number
): "mobile" | "tablet" | "desktop" {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * Helper to create a parametrized test for multiple viewports
 * Usage:
 *   const { forEachViewport } = require('./viewports');
 *   forEachViewport(async (viewport) => {
 *     test(`should work on ${viewport.name}`, async ({ page }) => {
 *       await page.setViewportSize({ width: viewport.width, height: viewport.height });
 *       // ... test code
 *     });
 *   });
 */
export function forEachViewport(
  callback: (viewport: ViewportConfig, index: number) => void
): void {
  VIEWPORT_ARRAY.forEach((viewport, index) => {
    callback(viewport, index);
  });
}

/**
 * Responsive test helper for Playwright tests
 * Handles viewport resizing and provides helper utilities
 */
export class ResponsiveTestHelper {
  constructor(private page: any) {}

  /**
   * Test content visibility across all viewports
   * @param selector The element selector or locator
   * @param options Optional configuration
   */
  async testVisibilityAcrossViewports(
    selector: string | any,
    options: {
      viewports?: ViewportConfig[];
      timeout?: number;
      name?: string;
    } = {}
  ): Promise<void> {
    const viewports = options.viewports || VIEWPORT_ARRAY;
    const timeout = options.timeout || 5000;
    const name = options.name || "Element";

    for (const viewport of viewports) {
      await this.page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      // Small delay to allow layout to settle
      await this.page.waitForTimeout(300);

      const locator =
        typeof selector === "string" ? this.page.locator(selector) : selector;
      const isVisible = await locator.isVisible({ timeout }).catch(() => false);

      if (!isVisible) {
        throw new Error(
          `${name} was not visible on ${viewport.name} viewport (${viewport.width}x${viewport.height})`
        );
      }
    }
  }

  /**
   * Get current viewport info
   * @returns Object with viewport dimensions and device type
   */
  getCurrentViewport(): {
    width: number;
    height: number;
    deviceType: "mobile" | "tablet" | "desktop";
  } {
    const viewportSize = this.page.viewportSize();
    const width = viewportSize?.width || 1280;
    const height = viewportSize?.height || 720;

    return {
      width,
      height,
      deviceType: getDeviceTypeFromWidth(width),
    };
  }

  /**
   * Set viewport to a standard device size
   * @param deviceType The device type: "mobile" | "tablet" | "desktop"
   */
  async setViewport(
    deviceType: "mobile" | "tablet" | "desktop"
  ): Promise<void> {
    const viewport = getViewport(deviceType);
    await this.page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    // Small delay to allow layout to settle
    await this.page.waitForTimeout(300);
  }

  /**
   * Test a page across all standard viewports
   * @param callback Function to run for each viewport
   * @param options Optional configuration
   */
  async testAcrossViewports(
    callback: (
      viewport: ViewportConfig,
      helper: ResponsiveTestHelper
    ) => Promise<void>,
    options: { viewports?: ViewportConfig[] } = {}
  ): Promise<void> {
    const viewports = options.viewports || VIEWPORT_ARRAY;

    for (const viewport of viewports) {
      await this.setViewport(viewport.name);
      await callback(viewport, this);
    }
  }
}
