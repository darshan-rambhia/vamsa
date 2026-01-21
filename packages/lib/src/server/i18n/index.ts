/**
 * Server-side i18next configuration
 *
 * Handles translations for error messages and user-facing strings
 * in server functions and backend operations.
 *
 * Uses i18next with the filesystem backend to load translation files.
 */

import i18next from "i18next";
import Backend from "i18next-fs-backend";
import path from "path";

export type I18nInstance = ReturnType<typeof i18next.createInstance>;

let serverI18n: I18nInstance | null = null;
let configuredLocalesPath: string | null = null;

/**
 * Configure the locales path for i18n
 * By default, assumes running from project root and uses relative path to web app
 *
 * @param localesPath - Full path to locales directory pattern (e.g., "/path/to/locales/{{lng}}/{{ns}}.json")
 */
export function setLocalesPath(localesPath: string) {
  configuredLocalesPath = localesPath;
  // Reset instance to force reinitialize with new path
  serverI18n = null;
}

/**
 * Get the configured locales path
 * Uses configured path if set, otherwise defaults to app workspace path
 * Handles both running from project root and from apps/web directory
 */
function getLocalesPath(): string {
  if (configuredLocalesPath) {
    return configuredLocalesPath;
  }

  const cwd = process.cwd();

  // Check if we're already in the apps/web directory
  if (cwd.endsWith("/apps/web") || cwd.endsWith("\\apps\\web")) {
    // Running from apps/web directory
    return path.join(cwd, "src/i18n/locales/{{lng}}/{{ns}}.json");
  }

  // Running from project root
  return path.join(cwd, "apps/web/src/i18n/locales/{{lng}}/{{ns}}.json");
}

/**
 * Initialize the server-side i18n instance
 * This should be called once at startup
 */
export async function initializeServerI18n(): Promise<I18nInstance> {
  if (serverI18n) return serverI18n;

  serverI18n = i18next.createInstance();

  const localesPath = getLocalesPath();

  await serverI18n.use(Backend).init({
    lng: "en",
    fallbackLng: "en",
    ns: ["common", "auth", "people", "errors"],
    defaultNS: "common",
    backend: {
      loadPath: localesPath,
    },
    interpolation: {
      escapeValue: false,
    },
  });

  return serverI18n;
}

/**
 * Get the i18n instance
 * Ensures the instance is initialized before returning
 */
export async function getServerI18n(): Promise<I18nInstance> {
  if (!serverI18n) {
    await initializeServerI18n();
  }
  return serverI18n!;
}

/**
 * Translate a key in the given language
 *
 * @param key - Translation key (e.g., "errors:auth.invalidCredentials")
 * @param options - Translation options and variables
 * @param language - Language code (default: "en")
 * @returns Translated string
 */
export async function t(
  key: string,
  options?: Record<string, string | number | boolean>,
  language: string = "en"
): Promise<string> {
  const i18n = await getServerI18n();

  // Use getFixedT to get translations in a specific language without changing instance state
  // This avoids polluting the global language state when translating for different locales
  const fixedT = i18n.getFixedT(language);
  return fixedT(key, options as Record<string, unknown>);
}

/**
 * Translate multiple keys at once
 * Useful for returning multiple translated messages
 */
export async function tMultiple(
  keys: string[],
  options?: Record<string, string | number | boolean>,
  language: string = "en"
): Promise<string[]> {
  return Promise.all(keys.map((key) => t(key, options, language)));
}

/**
 * Get the current active instance for testing
 */
export function getActiveInstance(): I18nInstance | null {
  return serverI18n;
}

/**
 * Reset the i18n instance for testing
 * This clears the singleton so it can be re-initialized with fresh state
 */
export function resetServerI18n() {
  serverI18n = null;
}
