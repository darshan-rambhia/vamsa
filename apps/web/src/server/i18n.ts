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

type I18nInstance = ReturnType<typeof i18next.createInstance>;

let serverI18n: I18nInstance | null = null;

/**
 * Initialize the server-side i18n instance
 * This should be called once at startup
 */
export async function initializeServerI18n() {
  if (serverI18n) return serverI18n;

  serverI18n = i18next.createInstance();

  const __dirname = new URL(".", import.meta.url).pathname;
  const localesPath = path.join(
    __dirname,
    "../i18n/locales/{{lng}}/{{ns}}.json"
  );

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
export async function getServerI18n() {
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

  // Change language temporarily if needed
  if (language !== i18n.language) {
    i18n.changeLanguage(language);
  }

  return i18n.t(key, options);
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
export function getActiveInstance() {
  return serverI18n;
}
