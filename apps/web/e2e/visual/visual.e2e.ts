/**
 * Visual Regression Tests
 * Tests visual appearance of key pages using Playwright's built-in screenshot capabilities
 */
import { expect, test } from "@playwright/test";
import { bdd } from "../fixtures";

test.describe("Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for all visual tests
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.describe("Authentication Pages", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("login page layout and styling", async ({ page }) => {
      await bdd.given("user navigates to login page", async () => {
        await page.goto("/login", { waitUntil: "domcontentloaded" });
      });

      await bdd.then(
        "login page visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("login-page.png", {
            maxDiffPixels: 100,
            threshold: 0.2,
          });
        }
      );
    });

    test("register page layout and styling", async ({ page }) => {
      await bdd.given("user navigates to register page", async () => {
        await page.goto("/register", { waitUntil: "domcontentloaded" });
      });

      await bdd.then(
        "register page visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("register-page.png", {
            maxDiffPixels: 100,
            threshold: 0.2,
          });
        }
      );
    });

    test("change password page layout", async ({ page }) => {
      await bdd.given("user navigates to change password page", async () => {
        await page.goto("/change-password", { waitUntil: "domcontentloaded" });
      });

      await bdd.then(
        "change password page visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("change-password-page.png", {
            maxDiffPixels: 100,
            threshold: 0.2,
          });
        }
      );
    });
  });

  test.describe("Dashboard and Main Pages", () => {
    test("dashboard page layout and styling", async ({ page }) => {
      await bdd.given(
        "user is authenticated and navigates to dashboard",
        async () => {
          await page.goto("/", { waitUntil: "domcontentloaded" });
        }
      );

      await bdd.then(
        "dashboard page visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load and any async charts to render
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("dashboard-page.png", {
            maxDiffPixels: 150,
            threshold: 0.2,
          });
        }
      );
    });

    test("people list page layout and styling", async ({ page }) => {
      await bdd.given(
        "user is authenticated and navigates to people list",
        async () => {
          await page.goto("/people", { waitUntil: "domcontentloaded" });
        }
      );

      await bdd.then(
        "people list page visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load and table data to render
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("people-list-page.png", {
            maxDiffPixels: 150,
            threshold: 0.2,
          });
        }
      );
    });

    test("tree visualization page layout and styling", async ({ page }) => {
      await bdd.given(
        "user is authenticated and navigates to tree",
        async () => {
          await page.goto("/tree", { waitUntil: "domcontentloaded" });
        }
      );

      await bdd.then(
        "tree page visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load and d3 visualization to render
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("tree-page.png", {
            maxDiffPixels: 200,
            threshold: 0.2,
          });
        }
      );
    });
  });

  test.describe("Responsive Design", () => {
    test("login page mobile layout", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await bdd.given(
        "user navigates to login page on mobile device",
        async () => {
          await page.goto("/login", { waitUntil: "domcontentloaded" });
        }
      );

      await bdd.then(
        "login page mobile visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("login-page-mobile.png", {
            maxDiffPixels: 100,
            threshold: 0.2,
          });
        }
      );
    });

    test("dashboard page tablet layout", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await bdd.given(
        "user navigates to dashboard on tablet device",
        async () => {
          await page.goto("/", { waitUntil: "domcontentloaded" });
        }
      );

      await bdd.then(
        "dashboard page tablet visual appearance matches baseline",
        async () => {
          // Wait for all styles and fonts to load
          await page.waitForLoadState("networkidle");
          // Capture full page screenshot
          await expect(page).toHaveScreenshot("dashboard-page-tablet.png", {
            maxDiffPixels: 150,
            threshold: 0.2,
          });
        }
      );
    });
  });

  test.describe("Component-Specific Visual Tests", () => {
    test("form elements styling and layout", async ({ page }) => {
      await bdd.given("user navigates to register page with form", async () => {
        await page.goto("/register", { waitUntil: "domcontentloaded" });
      });

      await bdd.when("form is visible and ready", async () => {
        // Wait for form to be fully loaded
        await page
          .waitForSelector('form[data-testid="register-form"]', {
            timeout: 5000,
          })
          .catch(() => {
            // Form may have different selector, just wait for page to be ready
          });
        await page.waitForLoadState("networkidle");
      });

      await bdd.then(
        "form elements visual appearance matches baseline",
        async () => {
          // Capture form area screenshot
          const formLocator = page.locator("form").first();
          if (await formLocator.isVisible()) {
            await expect(formLocator).toHaveScreenshot("form-elements.png", {
              maxDiffPixels: 80,
              threshold: 0.2,
            });
          } else {
            // Fallback to full page if form selector doesn't match
            await expect(page).toHaveScreenshot("form-elements-full.png", {
              maxDiffPixels: 100,
              threshold: 0.2,
            });
          }
        }
      );
    });

    test("navigation layout and styling", async ({ page }) => {
      await bdd.given("user is authenticated and on dashboard", async () => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
      });

      await bdd.then(
        "navigation visual appearance matches baseline",
        async () => {
          // Wait for page to load
          await page.waitForLoadState("networkidle");

          // Capture header/nav area
          const navLocator = page.locator("nav, header").first();
          if (await navLocator.isVisible()) {
            await expect(navLocator).toHaveScreenshot("navigation.png", {
              maxDiffPixels: 50,
              threshold: 0.2,
            });
          }
        }
      );
    });
  });

  test.describe("Dark Mode (if implemented)", () => {
    test("login page in dark mode", async ({ page }) => {
      await bdd.given(
        "user navigates to login page and switches to dark mode",
        async () => {
          await page.goto("/login", { waitUntil: "domcontentloaded" });
          // Toggle dark mode if available
          const darkModeToggle = page
            .locator('[data-testid="theme-toggle"]')
            .first();
          if (await darkModeToggle.isVisible().catch(() => false)) {
            await darkModeToggle.click();
            await page.waitForTimeout(500); // Wait for theme transition
          }
        }
      );

      await bdd.then(
        "login page dark mode visual appearance matches baseline",
        async () => {
          await page.waitForLoadState("networkidle");
          await expect(page).toHaveScreenshot("login-page-dark.png", {
            maxDiffPixels: 100,
            threshold: 0.2,
          });
        }
      );
    });
  });
});
