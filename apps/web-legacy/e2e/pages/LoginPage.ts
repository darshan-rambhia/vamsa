import { type Page, type Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly claimProfileLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.loginButton = page.getByRole("button", { name: "Sign In" });
    this.errorMessage = page.locator('[class*="destructive"]');
    this.registerLink = page.getByRole("link", { name: "Register" });
    this.claimProfileLink = page.getByRole("link", {
      name: "Claim your profile",
    });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectToBeOnLoginPage() {
    await expect(this.page).toHaveURL("/login");
    await expect(this.loginButton).toBeVisible();
  }
}
