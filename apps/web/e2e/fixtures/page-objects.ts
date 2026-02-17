/**
 * Page Object Models for E2E Tests
 * Provides reusable page interaction methods for common pages
 */
import { expect } from "@playwright/test";
import { waitForHydration } from "./test-base";
import type { Locator, Page } from "@playwright/test";

/**
 * Firefox-resilient navigation helper.
 * Retries on NS_BINDING_ABORTED which occurs in Firefox when navigation
 * is interrupted by a redirect.
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  options?: {
    waitUntil?: "load" | "domcontentloaded" | "commit";
    timeout?: number;
  }
): Promise<void> {
  const targetPath = new URL(url, "http://localhost").pathname;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: options?.waitUntil ?? "domcontentloaded",
        timeout: options?.timeout ?? 30000,
      });
      // Verify we reached the target URL
      if (page.url().includes(targetPath)) {
        return;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("NS_BINDING_ABORTED")
      ) {
        await page.waitForTimeout(500);
        // Check if navigation actually succeeded despite the error
        if (page.url().includes(targetPath)) {
          return;
        }
        if (attempt < maxAttempts) {
          continue;
        }
      }
      // Re-throw non-Firefox errors or on final attempt
      if (attempt === maxAttempts) {
        throw error;
      }
    }
  }
}

/**
 * Login Page Object
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use testId selectors for more reliable selection
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    // Error message uses data-testid="login-error"
    this.errorMessage = page.getByTestId("login-error");
  }

  async goto() {
    await this.page.goto("/login", { waitUntil: "domcontentloaded" });
    // Wait for page to fully load and hydrate
    await this.page.waitForLoadState("domcontentloaded");
    // Wait for form to be ready
    const loginForm = this.page.getByTestId("login-form");
    await loginForm.waitFor({ state: "visible", timeout: 5000 });
  }

  async login(email: string, password: string) {
    // Wait for page to be fully loaded and React to hydrate
    await this.page.waitForLoadState("domcontentloaded");
    await waitForHydration(this.page);

    // Wait for login form to be visible
    await this.page
      .getByTestId("login-form")
      .waitFor({ state: "visible", timeout: 10000 });

    // Wait for inputs to be ready and enabled
    await this.emailInput.waitFor({ state: "visible", timeout: 5000 });
    await this.passwordInput.waitFor({ state: "visible", timeout: 5000 });

    // Wait for inputs to be editable (React hydration complete)
    await expect(this.emailInput).toBeEditable({ timeout: 5000 });
    await expect(this.passwordInput).toBeEditable({ timeout: 5000 });

    // Additional hydration buffer for parallel execution
    await this.page.waitForTimeout(500);

    // Fill email with "poke and verify" pattern - verify React responds before typing rest
    for (let attempt = 1; attempt <= 5; attempt++) {
      await this.emailInput.click();
      await this.page.waitForTimeout(50);
      await this.emailInput.clear();

      // Poke: type first character and wait for React reconciliation
      await this.emailInput.type(email.charAt(0), { delay: 50 });
      // CRITICAL: Wait for React to potentially reset controlled input
      await this.page.waitForTimeout(200);

      const firstChar = await this.emailInput.inputValue();
      if (firstChar !== email.charAt(0)) {
        // React either not hydrated or reset the value - wait longer
        await this.page.waitForTimeout(300 * attempt);
        continue;
      }

      // React accepted the character - type the rest
      await this.emailInput.type(email.slice(1), { delay: 20 });
      await this.page.waitForTimeout(200);

      const emailValue = await this.emailInput.inputValue();
      if (emailValue === email) break;

      // Value mismatch - wait and retry
      await this.page.waitForTimeout(200 * attempt);
    }

    // Fill password with retry loop
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.passwordInput.click();
      await this.page.waitForTimeout(100);
      await this.passwordInput.fill(password);
      await this.page.waitForTimeout(150);

      const passwordValue = await this.passwordInput.inputValue();
      if (passwordValue === password) break;

      // Retry with selectText + type
      if (attempt < 3) {
        await this.passwordInput.click();
        await this.passwordInput.selectText().catch(() => {});
        await this.passwordInput.type(password, { delay: 30 });
        await this.page.waitForTimeout(100);

        const retryValue = await this.passwordInput.inputValue();
        if (retryValue === password) break;
      }
    }

    // Final verification
    const filledEmail = await this.emailInput.inputValue();
    const filledPassword = await this.passwordInput.inputValue();

    if (filledEmail !== email || filledPassword !== password) {
      throw new Error(
        `[LoginPage] Form fill failed. Email: "${filledEmail}" (expected "${email}"), Password length: ${filledPassword.length}`
      );
    }

    await this.submitButton.click();

    // Wait for either navigation (success) or error message (failure)
    await Promise.race([
      this.page
        .waitForURL(/\/(people|dashboard)/, { timeout: 10000 })
        .catch(() => {}),
      this.errorMessage
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
    ]);
  }

  async getErrorText(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }
}

/**
 * Navigation Component Object
 */
export class Navigation {
  readonly page: Page;
  readonly nav: Locator;
  readonly dashboardLink: Locator;
  readonly peopleLink: Locator;
  readonly visualizeLink: Locator;
  readonly mapsLink: Locator;
  readonly activityLink: Locator;
  readonly subscribeLink: Locator;
  readonly adminLink: Locator;
  readonly signOutButton: Locator;
  readonly mobileMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.getByTestId("main-nav");
    // Use testIds instead of href selectors for more robust and maintainable selectors
    // Note: nav links are rendered twice (desktop nav + mobile menu), use .first() to get the primary one
    this.dashboardLink = page.getByTestId("nav-dashboard").first();
    this.peopleLink = page.getByTestId("nav-people").first();
    this.visualizeLink = page.getByTestId("nav-visualize").first();
    this.mapsLink = page.getByTestId("nav-maps").first();
    this.activityLink = page.getByTestId("nav-activity").first();
    this.subscribeLink = page.getByTestId("nav-subscribe").first();
    this.adminLink = page.getByTestId("nav-admin").first();
    this.signOutButton = page.getByTestId("signout-button");
    // Mobile menu button
    this.mobileMenuButton = page.getByTestId("nav-mobile-menu-button");
  }

  async goToDashboard() {
    await this._navigateWithFallback("nav-dashboard", "/dashboard");
  }

  async goToPeople() {
    await this._navigateWithFallback("nav-people", "/people");
  }

  async goToTree() {
    // Tree is now part of the consolidated visualizations page
    await this._navigateWithFallback("nav-visualize", "/visualize");
  }

  async goToVisualize() {
    await this._navigateWithFallback("nav-visualize", "/visualize");
  }

  async goToMaps() {
    await this._navigateWithFallback("nav-maps", "/maps");
  }

  async goToSubscribe() {
    await this._navigateWithFallback("nav-subscribe", "/subscribe");
  }

  async goToActivity() {
    await this._navigateWithFallback("nav-activity", "/activity");
  }

  async goToAdmin() {
    await this._navigateWithFallback("nav-admin", "/admin");
  }

  /**
   * Navigate using click with fallback to page.goto() for Firefox reliability.
   * Firefox can experience NS_BINDING_ABORTED when navigation is interrupted.
   */
  private async _navigateWithFallback(testId: string, fallbackUrl: string) {
    const urlPattern =
      fallbackUrl === "/visualize" ? /\/visualize/ : fallbackUrl;

    // Helper to check if we're at target URL (exact pathname match to avoid
    // e.g. /people/{id} matching /people)
    const isAtTargetUrl = () => {
      try {
        const pathname = new URL(this.page.url()).pathname;
        return pathname === fallbackUrl;
      } catch {
        return false;
      }
    };

    // Check if already on target URL
    if (isAtTargetUrl()) {
      return;
    }

    // Try click navigation first
    try {
      await this._clickNavLinkByTestId(testId);
      await this.page.waitForLoadState("domcontentloaded");
      await this.page.waitForURL(urlPattern, { timeout: 5000 });
      return;
    } catch (_clickError) {
      // Click navigation failed - fall through to direct navigation
    }

    // Fallback: Direct navigation with retry logic for Firefox NS_BINDING_ABORTED
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto(fallbackUrl, { waitUntil: "domcontentloaded" });
        await this.page.waitForURL(urlPattern, { timeout: 5000 });
        return;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("NS_BINDING_ABORTED")
        ) {
          // Navigation was interrupted - wait and check if we arrived
          await this.page.waitForTimeout(500);
          if (isAtTargetUrl()) {
            return;
          }
          // Not at target URL, retry
          continue;
        }
        // For timeout errors, check if we're actually at the target
        if (isAtTargetUrl()) {
          return;
        }
        // Last attempt - throw the error
        if (attempt === 3) {
          throw error;
        }
      }
    }
  }

  private async _clickNavLinkByTestId(testId: string) {
    // First check if mobile menu button is visible (indicates we're in mobile mode)
    const isMobileMode = await this.mobileMenuButton
      .isVisible()
      .catch(() => false);

    if (isMobileMode) {
      // In mobile mode, we need to open the menu first
      await this.mobileMenuButton.click();
      // Wait for mobile menu animation
      await this.page.waitForTimeout(300);
    }

    // Find all elements with this testid and click the visible one
    // There may be two (desktop and mobile), but only one should be visible
    const links = this.page.getByTestId(testId);
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        return;
      }
    }

    // If no visible link found, try force click on first one
    await links.first().evaluate((el) => (el as HTMLElement).click());
  }

  async signOut() {
    // First check if mobile menu button is visible (indicates we're in mobile mode)
    const isMobileMode = await this.mobileMenuButton
      .isVisible()
      .catch(() => false);

    if (isMobileMode) {
      // In mobile mode, we need to open the menu first for sign-out button to exist in DOM
      await this.mobileMenuButton.click();
      // Wait for mobile menu animation
      await this.page.waitForTimeout(300);
    }

    // Find any visible signout button and click it
    // There may be two (desktop and mobile), but only one should be visible
    const signoutButtons = this.page.getByTestId("signout-button");
    const count = await signoutButtons.count();

    for (let i = 0; i < count; i++) {
      const button = signoutButtons.nth(i);
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        break;
      }
    }

    await this.page.waitForURL("/login", { timeout: 15000 });
  }

  /** Check if nav is responsive (mobile) */
  async isMobileNav(): Promise<boolean> {
    return await this.mobileMenuButton.isVisible();
  }
}

/**
 * People List Page Object
 */
export class PeopleListPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addPersonButton: Locator;
  readonly personCards: Locator;
  readonly emptyState: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.addPersonButton = page.locator(
      'button:has-text("Add"), a:has-text("Add Person")'
    );
    // People are rendered as table rows with links containing person names
    this.personCards = page.locator(
      'table tbody tr, [data-person-card], [data-testid="person-card"]'
    );
    this.emptyState = page.locator(
      '[data-empty-state], :text("No people found"), :text("No people")'
    );
    this.loadingSpinner = page.locator("[data-loading], .animate-spin");
  }

  async goto() {
    await this.page.goto("/people", { waitUntil: "domcontentloaded" });
    // Wait for either person cards to load or empty state to be visible
    await Promise.race([
      this.personCards
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
      this.emptyState
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
    ]);
  }

  async search(query: string) {
    // Only search if the search input is visible
    const hasSearch = await this.searchInput.isVisible().catch(() => false);
    if (hasSearch) {
      await this.searchInput.fill(query);
      // Wait for filter to apply
      await this.page.waitForTimeout(300);
    }
  }

  async clickAddPerson() {
    await this.addPersonButton.click();
  }

  async getPersonCount(): Promise<number> {
    return await this.personCards.count();
  }

  async clickPerson(name: string) {
    // Try to find a link with the person's name and click it
    // People rows contain links with the person's name
    await this.page.locator(`a:has-text("${name}")`).first().click();
  }

  async waitForLoad() {
    // Wait for loading to finish (spinner to be hidden) and content to load
    // Wait for either content to appear or spinner to disappear
    await Promise.race([
      this.personCards
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
      this.emptyState
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
      this.loadingSpinner
        .waitFor({ state: "hidden", timeout: 10000 })
        .catch(() => {}),
    ]);
  }
}

/**
 * Person Detail Page Object
 */
export class PersonDetailPage {
  readonly page: Page;
  readonly nameHeading: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly backButton: Locator;
  readonly relationshipsSection: Locator;
  readonly detailsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameHeading = page.locator("h1, [data-person-name]");
    this.editButton = page.locator(
      'button:has-text("Edit"), a:has-text("Edit")'
    );
    this.deleteButton = page.locator('button:has-text("Delete")');
    this.backButton = page.locator(
      'button:has-text("Back"), a:has-text("Back")'
    );
    this.relationshipsSection = page.locator(
      '[data-relationships], :text("Relationships")'
    );
    this.detailsSection = page.locator('[data-details], :text("Details")');
  }

  async goto(personId: string) {
    await this.page.goto(`/people/${personId}`, {
      waitUntil: "domcontentloaded",
    });
    // Wait for person name heading to be visible
    await this.nameHeading.waitFor({ state: "visible", timeout: 5000 });
  }

  async getName(): Promise<string | null> {
    return await this.nameHeading.textContent();
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
  }

  async goBack() {
    await this.backButton.click();
    await this.page.waitForURL("/people", { timeout: 15000 });
  }
}

/**
 * Dashboard Page Object
 */
export class DashboardPage {
  readonly page: Page;
  readonly statsCards: Locator;
  readonly recentActivity: Locator;
  readonly welcomeMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statsCards = page.locator("[data-stat-card], .stat-card");
    this.recentActivity = page.locator(
      '[data-recent-activity], :text("Recent Activity")'
    );
    this.welcomeMessage = page.locator("[data-welcome], h1");
  }

  async goto() {
    await this.page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    // Wait for welcome message or stats cards to indicate page is ready
    await Promise.race([
      this.welcomeMessage
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
      this.statsCards
        .first()
        .waitFor({ state: "visible", timeout: 10000 })
        .catch(() => {}),
    ]);
  }

  async getStatsCount(): Promise<number> {
    return await this.statsCards.count();
  }
}

/**
 * Admin Page Object
 */
export class AdminPage {
  readonly page: Page;
  readonly tabs: Locator;
  readonly usersTab: Locator;
  readonly invitesTab: Locator;
  readonly backupTab: Locator;
  readonly settingsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    // Admin nav uses a nav element with links, not semantic tabs
    this.tabs = page.locator("nav").first();
    this.usersTab = page.locator('a[href="/admin/users"]');
    this.invitesTab = page.locator('a[href="/admin/invites"]');
    this.backupTab = page.locator('a[href="/admin/backup"]');
    this.settingsTab = page.locator('a[href="/admin/settings"]');
  }

  async goto() {
    await this.page.goto("/admin", { waitUntil: "domcontentloaded" });
    // Wait for admin nav to be visible
    await this.tabs.waitFor({ state: "visible", timeout: 5000 });
  }

  async selectUsersTab() {
    await this.usersTab.click();
    await this.page.waitForURL(/\/admin.*users/, { timeout: 15000 });
  }

  async selectInvitesTab() {
    await this.invitesTab.click();
    await this.page.waitForURL(/\/admin.*invites/, { timeout: 15000 });
  }

  async selectBackupTab() {
    await this.backupTab.click();
    await this.page.waitForURL(/\/admin.*backup/, { timeout: 15000 });
  }
}

/**
 * Person Form Page Object (Create/Edit)
 */
export class PersonFormPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly birthPlaceInput: Locator;
  readonly genderSelect: Locator;
  readonly bioTextarea: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly formErrors: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use testId selectors for more reliable selection
    this.firstNameInput = page.getByTestId("person-form-firstName");
    this.lastNameInput = page.getByTestId("person-form-lastName");
    this.dateOfBirthInput = page.locator('input[name="dateOfBirth"]');
    this.birthPlaceInput = page.locator('input[name="birthPlace"]');
    this.genderSelect = page.locator('[name="gender"], select[name="gender"]');
    this.bioTextarea = page.locator('textarea[name="bio"]');
    this.saveButton = page.getByTestId("person-form-submit");
    this.cancelButton = page.getByTestId("person-form-cancel");
    this.formErrors = page.locator(".text-destructive, [data-error]");
  }

  async waitForFormReady() {
    // Wait for page to be fully loaded
    await this.page.waitForLoadState("domcontentloaded");
    // Wait for the first name input to be visible and ready
    await this.firstNameInput.waitFor({ state: "visible", timeout: 10000 });
  }

  /**
   * Helper to fill a field with retry and error on failure
   * Uses click + fill pattern with verification that works for React controlled components
   */
  private async fillField(locator: Locator, text: string, maxRetries = 3) {
    await locator.waitFor({ state: "visible", timeout: 5000 });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Click to focus, then fill with longer waits for parallel execution stability
      await locator.click();
      await this.page.waitForTimeout(100);
      await locator.fill(text);
      await this.page.waitForTimeout(150);

      const currentValue = await locator.inputValue();
      if (currentValue === text) {
        return; // Success
      }

      // Retry with selectText + type if fill didn't work
      if (attempt < maxRetries) {
        await locator.click();
        await locator.selectText().catch(() => {});
        await locator.type(text, { delay: 30 });
        await this.page.waitForTimeout(100);

        const retryValue = await locator.inputValue();
        if (retryValue === text) {
          return; // Success on retry
        }

        await this.page.waitForTimeout(150 * attempt);
      }
    }

    // Throw error if all retries failed
    const finalValue = await locator.inputValue();
    throw new Error(
      `[PersonFormPage] Failed to fill field after ${maxRetries} retries. Expected: "${text}", Got: "${finalValue}"`
    );
  }

  async fillBasicInfo(data: { firstName: string; lastName: string }) {
    await this.waitForFormReady();
    // Give React more time to fully hydrate the form (critical for parallel execution)
    await this.page.waitForTimeout(500);
    await this.fillField(this.firstNameInput, data.firstName);
    await this.fillField(this.lastNameInput, data.lastName);
  }

  async fillFullForm(data: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    birthPlace?: string;
    bio?: string;
  }) {
    await this.fillBasicInfo(data);
    if (data.dateOfBirth) {
      await this.fillField(this.dateOfBirthInput, data.dateOfBirth);
    }
    if (data.birthPlace) {
      await this.fillField(this.birthPlaceInput, data.birthPlace);
    }
    if (data.bio) {
      await this.fillField(this.bioTextarea, data.bio);
    }
  }

  async submit() {
    // Get current URL to detect navigation
    const currentUrl = this.page.url();

    await this.saveButton.click();

    // If on create page, wait for either navigation away OR some response
    if (currentUrl.includes("/new")) {
      // Wait for either:
      // 1. Navigation away from /new (success)
      // 2. Error message appears (validation/API error)
      // 3. Form is still accessible (can continue editing)
      await Promise.race([
        this.page
          .waitForURL((url) => !url.pathname.includes("/new"), {
            timeout: 10000,
          })
          .catch(() => {}),
        this.formErrors
          .waitFor({ state: "visible", timeout: 10000 })
          .catch(() => {}),
        this.page.waitForTimeout(3000), // Fallback if form just stays visible without error
      ]);
    }

    // Wait a moment for the page to stabilize
    await this.page.waitForTimeout(500);
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async hasErrors(): Promise<boolean> {
    return await this.formErrors.isVisible();
  }
}
