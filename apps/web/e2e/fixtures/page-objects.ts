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
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.text-destructive');
  }

  async goto() {
    await this.page.goto("/login");
    await this.emailInput.waitFor({ state: "visible" });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
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
    this.nav = page.locator("nav");
    this.dashboardLink = page.locator('a[href="/dashboard"]');
    this.peopleLink = page.locator('a[href="/people"]');
    this.treeLink = page.locator('a[href="/tree"]');
    this.activityLink = page.locator('a[href="/activity"]');
    this.adminLink = page.locator('a[href="/admin"]');
    this.signOutButton = page.locator('a[href="/login"]:has-text("Sign out")');
    this.mobileMenuButton = page.locator('[data-mobile-menu-button]');
  }

  async goToDashboard() {
    await this.dashboardLink.click();
    await this.page.waitForURL("/dashboard");
  }

  async goToPeople() {
    await this.peopleLink.click();
    await this.page.waitForURL("/people");
  }

  async goToTree() {
    await this.treeLink.click();
    await this.page.waitForURL("/tree");
  }

  async goToActivity() {
    await this.activityLink.click();
    await this.page.waitForURL("/activity");
  }

  async goToAdmin() {
    await this.adminLink.click();
    await this.page.waitForURL("/admin");
  }

  async signOut() {
    await this.signOutButton.click();
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
    this.personCards = page.locator('[data-person-card], [data-testid="person-card"]');
    this.emptyState = page.locator('[data-empty-state], :text("No people found")');
    this.loadingSpinner = page.locator('[data-loading], .animate-spin');
  }

  async goto() {
    await this.page.goto("/people");
    await this.page.waitForLoadState("networkidle");
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
    await this.page.locator(`[data-person-card]:has-text("${name}")`).click();
  }

  async waitForLoad() {
    // Wait for loading to finish
    await this.loadingSpinner.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    await this.page.waitForLoadState("networkidle");
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
    await this.page.waitForLoadState("networkidle");
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
    await this.page.waitForLoadState("networkidle");
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
    this.tabs = page.locator('[role="tablist"]');
    this.usersTab = page.locator('[role="tab"]:has-text("Users")');
    this.invitesTab = page.locator('[role="tab"]:has-text("Invites")');
    this.backupTab = page.locator('[role="tab"]:has-text("Backup")');
    this.settingsTab = page.locator('[role="tab"]:has-text("Settings")');
  }

  async goto() {
    await this.page.goto("/admin");
    await this.page.waitForLoadState("networkidle");
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

  async fillBasicInfo(data: { firstName: string; lastName: string }) {
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
