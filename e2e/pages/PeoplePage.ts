import { type Page, type Locator, expect } from "@playwright/test";

export class PeoplePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addPersonButton: Locator;
  readonly peopleList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/search/i);
    this.addPersonButton = page.getByRole("button", { name: /add.*person/i });
    this.peopleList = page.locator('[data-testid="people-list"]');
  }

  async goto() {
    await this.page.goto("/people");
  }

  async expectToBeOnPeoplePage() {
    await expect(this.page).toHaveURL("/people");
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
  }

  async clickPerson(name: string) {
    await this.page.getByRole("link", { name }).click();
  }
}
