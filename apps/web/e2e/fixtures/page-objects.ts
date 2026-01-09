/**
 * Page Object Models for E2E Tests
 * Provides reusable page interaction methods for common pages
 */
import type { Page, Locator } from "@playwright/test";

/**
 * Login Page Object
 */
export class LoginPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.errorMessage = page.getByTestId("login-error");
  }

  async goto() {
    await this.page.goto("/login");
    await this.form.waitFor({ state: "visible", timeout: 5000 });
  }

  async login(email: string, password: string) {
    // Use type() instead of fill() to trigger onChange on React controlled components
    await this.emailInput.type(email, { delay: 50 });
    await this.passwordInput.type(password, { delay: 50 });
    await this.submitButton.click();
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
  readonly treeLink: Locator;
  readonly activityLink: Locator;
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
    this.treeLink = page.getByTestId("nav-tree").first();
    this.activityLink = page.getByTestId("nav-activity").first();
    this.adminLink = page.getByTestId("nav-admin").first();
    this.signOutButton = page.getByTestId("signout-button");
    // Mobile menu button
    this.mobileMenuButton = page.getByTestId("nav-mobile-menu-button");
  }

  async goToDashboard() {
    await this._clickNavLink(this.dashboardLink);
    await this.page.waitForURL("/dashboard");
  }

  async goToPeople() {
    await this._clickNavLink(this.peopleLink);
    await this.page.waitForURL("/people");
  }

  async goToTree() {
    await this._clickNavLink(this.treeLink);
    await this.page.waitForURL(/\/tree(\?|$)/);
  }

  async goToActivity() {
    await this._clickNavLink(this.activityLink);
    await this.page.waitForURL("/activity");
  }

  async goToAdmin() {
    await this._clickNavLink(this.adminLink);
    await this.page.waitForURL("/admin");
  }

  private async _clickNavLink(link: Locator) {
    // Check if link is visible
    const isVisible = await link.isVisible({ timeout: 1000 }).catch(() => false);

    if (!isVisible) {
      // Link is not visible, try to open the mobile menu
      const menuButtonVisible = await this.mobileMenuButton.isVisible({ timeout: 1000 }).catch(() => false);
      if (menuButtonVisible) {
        // Click the menu button to toggle it open
        await this.mobileMenuButton.click();
        // Wait for animation and for the link to become visible
        await link.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      } else {
        // Link is hidden but mobile menu button is also not visible
        // This can happen if links are in DOM but hidden by CSS (e.g., md:hidden)
        // Force click using JavaScript to bypass visibility check
        await link.evaluate((el) => (el as HTMLElement).click());
        return;
      }
    }

    // Now click the link (it should be visible or we tried to make it visible)
    try {
      await link.click({ timeout: 5000 });
    } catch {
      // If visible click fails, force click using JavaScript
      await link.evaluate((el) => (el as HTMLElement).click());
    }
  }

  async signOut() {
    // Check if sign-out button is visible, if not try to open mobile menu
    if (!(await this.signOutButton.isVisible({ timeout: 1000 }).catch(() => false))) {
      if (await this.mobileMenuButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await this.mobileMenuButton.click();
        await this.page.waitForTimeout(300);
      }
    }

    // Try to click the sign-out button
    try {
      await this.signOutButton.click({ timeout: 5000 });
    } catch {
      // If visible click fails, force click using JavaScript
      await this.signOutButton.evaluate((el) => (el as HTMLElement).click());
    }

    await this.page.waitForURL("/login");
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
    this.addPersonButton = page.locator('button:has-text("Add"), a:has-text("Add Person")');
    // People are rendered as table rows with links containing person names
    this.personCards = page.locator('table tbody tr, [data-person-card], [data-testid="person-card"]');
    this.emptyState = page.locator('[data-empty-state], :text("No people found"), :text("No people")');
    this.loadingSpinner = page.locator('[data-loading], .animate-spin');
  }

  async goto() {
    await this.page.goto("/people");
    // Wait for either person cards to load or empty state to be visible
    await Promise.race([
      this.personCards.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
      this.emptyState.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    ]);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for Convex to filter
    await this.page.waitForTimeout(300);
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
      this.personCards.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
      this.emptyState.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
      this.loadingSpinner.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {}),
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
    this.editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    this.deleteButton = page.locator('button:has-text("Delete")');
    this.backButton = page.locator('button:has-text("Back"), a:has-text("Back")');
    this.relationshipsSection = page.locator('[data-relationships], :text("Relationships")');
    this.detailsSection = page.locator('[data-details], :text("Details")');
  }

  async goto(personId: string) {
    await this.page.goto(`/people/${personId}`);
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
    await this.page.waitForURL("/people");
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
    this.statsCards = page.locator('[data-stat-card], .stat-card');
    this.recentActivity = page.locator('[data-recent-activity], :text("Recent Activity")');
    this.welcomeMessage = page.locator('[data-welcome], h1');
  }

  async goto() {
    await this.page.goto("/dashboard");
    // Wait for welcome message or stats cards to indicate page is ready
    await Promise.race([
      this.welcomeMessage.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
      this.statsCards.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
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
    this.tabs = page.locator('nav').first();
    this.usersTab = page.locator('a[href="/admin/users"]');
    this.invitesTab = page.locator('a[href="/admin/invites"]');
    this.backupTab = page.locator('a[href="/admin/backup"]');
    this.settingsTab = page.locator('a[href="/admin/settings"]');
  }

  async goto() {
    await this.page.goto("/admin");
    // Wait for admin nav to be visible
    await this.tabs.waitFor({ state: "visible", timeout: 5000 });
  }

  async selectUsersTab() {
    await this.usersTab.click();
    await this.page.waitForURL(/\/admin.*users/);
  }

  async selectInvitesTab() {
    await this.invitesTab.click();
    await this.page.waitForURL(/\/admin.*invites/);
  }

  async selectBackupTab() {
    await this.backupTab.click();
    await this.page.waitForURL(/\/admin.*backup/);
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
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.dateOfBirthInput = page.locator('input[name="dateOfBirth"]');
    this.birthPlaceInput = page.locator('input[name="birthPlace"]');
    this.genderSelect = page.locator('[name="gender"], select[name="gender"]');
    this.bioTextarea = page.locator('textarea[name="bio"]');
    this.saveButton = page.locator('button[type="submit"], button:has-text("Save")');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.formErrors = page.locator('.text-destructive, [data-error]');
  }

  async waitForFormReady() {
    // Wait for the first name input to be visible and ready
    await this.firstNameInput.waitFor({ state: "visible", timeout: 10000 });
  }

  async fillBasicInfo(data: { firstName: string; lastName: string }) {
    await this.waitForFormReady();
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
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
      await this.dateOfBirthInput.fill(data.dateOfBirth);
    }
    if (data.birthPlace) {
      await this.birthPlaceInput.fill(data.birthPlace);
    }
    if (data.bio) {
      await this.bioTextarea.fill(data.bio);
    }
  }

  async submit() {
    await this.saveButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async hasErrors(): Promise<boolean> {
    return await this.formErrors.isVisible();
  }
}
