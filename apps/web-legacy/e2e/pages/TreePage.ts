import { type Page, type Locator, expect } from "@playwright/test";

export class TreePage {
  readonly page: Page;
  readonly treeContainer: Locator;
  readonly addPersonButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.treeContainer = page.locator(".react-flow");
    this.addPersonButton = page.getByRole("button", { name: /add.*person/i });
  }

  async goto() {
    await this.page.goto("/tree");
  }

  async expectToBeOnTreePage() {
    await expect(this.page).toHaveURL("/tree");
  }

  async expectTreeVisible() {
    await expect(this.treeContainer).toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.page.getByText(/No family members yet/i)).toBeVisible();
  }
}
