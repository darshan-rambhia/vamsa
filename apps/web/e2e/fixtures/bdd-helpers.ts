import { test } from "@playwright/test";

/**
 * BDD-style test.step helpers for consistent Given/When/Then naming
 *
 * Uses only Playwright's native test.step() - zero dependencies.
 *
 * Benefits:
 * - HTML reporter shows clear workflow hierarchy
 * - Failed tests pinpoint exact step in user journey
 * - Easy to identify missing workflow coverage
 * - Step-level timing and screenshots
 *
 * @example
 * ```typescript
 * test('User logs in successfully', async ({ page }) => {
 *   await bdd.given('user has valid credentials', async () => {
 *     expect(TEST_USERS.admin.email).toBeTruthy();
 *   });
 *
 *   await bdd.when('user submits login form', async () => {
 *     await page.fill('[name="email"]', TEST_USERS.admin.email);
 *     await page.fill('[name="password"]', TEST_USERS.admin.password);
 *     await page.click('button[type="submit"]');
 *   });
 *
 *   await bdd.then('user is redirected to dashboard', async () => {
 *     await expect(page).toHaveURL(/\/(people|dashboard)/);
 *   });
 * });
 * ```
 */
export const bdd = {
  /**
   * Defines preconditions or setup for the test scenario
   * @param description - What condition is being established
   * @param fn - Async function containing the setup logic
   */
  given: (description: string, fn: () => Promise<void>) =>
    test.step(`GIVEN ${description}`, fn),

  /**
   * Defines the action being tested
   * @param description - What action is being performed
   * @param fn - Async function containing the action logic
   */
  when: (description: string, fn: () => Promise<void>) =>
    test.step(`WHEN ${description}`, fn),

  /**
   * Defines expected outcomes or assertions
   * @param description - What outcome is being verified
   * @param fn - Async function containing the assertions
   */
  then: (description: string, fn: () => Promise<void>) =>
    test.step(`THEN ${description}`, fn),

  /**
   * Adds additional preconditions, actions, or assertions
   * @param description - What is being added to the scenario
   * @param fn - Async function containing the additional logic
   */
  and: (description: string, fn: () => Promise<void>) =>
    test.step(`AND ${description}`, fn),

  /**
   * Adds contrasting or exceptional conditions
   * @param description - What exception or contrast is being noted
   * @param fn - Async function containing the exception logic
   */
  but: (description: string, fn: () => Promise<void>) =>
    test.step(`BUT ${description}`, fn),
};
