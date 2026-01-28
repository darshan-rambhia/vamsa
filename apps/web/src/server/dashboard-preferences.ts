"use server";

import { createServerFn } from "@tanstack/react-start";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.db;
import {
  dashboardPreferencesSchema,
  saveDashboardPreferencesSchema,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_DASHBOARD_WIDGETS,
  type DashboardPreferences,
  type SaveDashboardPreferencesInput,
} from "@vamsa/schemas";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server";
import { requireAuth } from "./middleware/require-auth";
import { eq } from "drizzle-orm";

function generateId(): string {
  // Generate a simple ID using timestamp and random bytes
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  return `${now}-${rand}`;
}

/**
 * Get the current user's dashboard preferences
 * Returns default layout if no preferences exist yet
 *
 * Method: GET
 * Input: None (uses authenticated session)
 * Output: DashboardPreferences object with layout and widgets
 *
 * @returns Dashboard preferences for the authenticated user
 * @throws Error if not authenticated
 *
 * @example
 * const prefs = await getDashboardPreferences();
 * // { layout: {...}, widgets: [...] }
 */
export const getDashboardPreferences = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const user = await requireAuth();
    log.info({ userId: user.id }, "Fetching dashboard preferences");

    const [preferences] = await drizzleDb
      .select()
      .from(drizzleSchema.dashboardPreferences)
      .where(eq(drizzleSchema.dashboardPreferences.userId, user.id))
      .limit(1);

    if (!preferences) {
      log.info({ userId: user.id }, "No preferences found, returning defaults");
      const defaultPrefs: DashboardPreferences = {
        layout: DEFAULT_DASHBOARD_LAYOUT,
        widgets: DEFAULT_DASHBOARD_WIDGETS,
      };
      return defaultPrefs;
    }

    // Parse the JSONB data stored in database
    const parsed = dashboardPreferencesSchema.parse({
      layout: preferences.layout as Record<string, unknown>,
      widgets: preferences.widgets as unknown[],
    });

    log.info(
      { userId: user.id, widgetCount: parsed.widgets.length },
      "Dashboard preferences retrieved"
    );

    return parsed;
  } catch (error) {
    log.withErr(error).msg("getDashboardPreferences failed");
    throw error;
  }
});

/**
 * Save or update the user's dashboard preferences
 * Creates a new preferences record if one doesn't exist
 *
 * Method: POST
 * Input: SaveDashboardPreferencesInput (layout and/or widgets)
 * Output: Saved DashboardPreferences object
 *
 * @param input - Partial dashboard preferences to save
 * @returns Complete dashboard preferences after save
 * @throws Error if not authenticated or validation fails
 *
 * @example
 * const updated = await saveDashboardPreferences({
 *   layout: { columns: 4, theme: "dark" },
 *   widgets: [...]
 * });
 */
export const saveDashboardPreferences = createServerFn({ method: "POST" })
  .inputValidator((data: SaveDashboardPreferencesInput) => {
    return saveDashboardPreferencesSchema.parse(data);
  })
  .handler(async ({ data }) => {
    try {
      const user = await requireAuth();
      log.info({ userId: user.id }, "Saving dashboard preferences");

      // Get existing preferences or create new
      const [existing] = await drizzleDb
        .select()
        .from(drizzleSchema.dashboardPreferences)
        .where(eq(drizzleSchema.dashboardPreferences.userId, user.id))
        .limit(1);

      let savedPreferences: DashboardPreferences;

      if (existing) {
        // Update existing preferences
        const currentLayout = existing.layout as Record<string, unknown>;
        const currentWidgets = existing.widgets as unknown[];

        // Merge with new data
        const updatedLayout = data.layout
          ? { ...currentLayout, ...data.layout }
          : currentLayout;
        const updatedWidgets = data.widgets ?? currentWidgets;

        const parsed = dashboardPreferencesSchema.parse({
          layout: updatedLayout,
          widgets: updatedWidgets,
        });

        await drizzleDb
          .update(drizzleSchema.dashboardPreferences)
          .set({
            layout: parsed.layout as unknown,
            widgets: parsed.widgets as unknown,
            updatedAt: new Date(),
          })
          .where(eq(drizzleSchema.dashboardPreferences.userId, user.id));

        savedPreferences = parsed;
        log.info({ userId: user.id }, "Dashboard preferences updated");
      } else {
        // Create new preferences
        const layout = data.layout ?? DEFAULT_DASHBOARD_LAYOUT;
        const widgets = data.widgets ?? DEFAULT_DASHBOARD_WIDGETS;

        const parsed = dashboardPreferencesSchema.parse({
          layout,
          widgets,
        });

        await drizzleDb.insert(drizzleSchema.dashboardPreferences).values({
          id: generateId(),
          userId: user.id,
          layout: parsed.layout as unknown,
          widgets: parsed.widgets as unknown,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        savedPreferences = parsed;
        log.info({ userId: user.id }, "Dashboard preferences created");
      }

      return savedPreferences;
    } catch (error) {
      log.withErr(error).msg("saveDashboardPreferences failed");
      throw error;
    }
  });

/**
 * Reset the user's dashboard preferences to defaults
 * Deletes existing preferences so defaults are returned on next fetch
 *
 * Method: POST
 * Input: None (uses authenticated session)
 * Output: Default DashboardPreferences
 *
 * @returns Default dashboard preferences
 * @throws Error if not authenticated
 *
 * @example
 * const defaults = await resetDashboardPreferences();
 * // { layout: DEFAULT_DASHBOARD_LAYOUT, widgets: DEFAULT_DASHBOARD_WIDGETS }
 */
export const resetDashboardPreferences = createServerFn({
  method: "POST",
}).handler(async () => {
  try {
    const user = await requireAuth();
    log.info({ userId: user.id }, "Resetting dashboard preferences");

    // Delete existing preferences
    await drizzleDb
      .delete(drizzleSchema.dashboardPreferences)
      .where(eq(drizzleSchema.dashboardPreferences.userId, user.id));

    const defaultPrefs: DashboardPreferences = {
      layout: DEFAULT_DASHBOARD_LAYOUT,
      widgets: DEFAULT_DASHBOARD_WIDGETS,
    };

    log.info({ userId: user.id }, "Dashboard preferences reset to defaults");

    return defaultPrefs;
  } catch (error) {
    log.withErr(error).msg("resetDashboardPreferences failed");
    throw error;
  }
});
