import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// Import English translations
import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enPeople from "./locales/en/people.json";
import enErrors from "./locales/en/errors.json";
import enNavigation from "./locales/en/navigation.json";
import enDashboard from "./locales/en/dashboard.json";
import enCharts from "./locales/en/charts.json";
import enAdmin from "./locales/en/admin.json";

// Import Hindi translations
import hiCommon from "./locales/hi/common.json";
import hiAuth from "./locales/hi/auth.json";
import hiPeople from "./locales/hi/people.json";
import hiErrors from "./locales/hi/errors.json";
import hiNavigation from "./locales/hi/navigation.json";
import hiDashboard from "./locales/hi/dashboard.json";
import hiCharts from "./locales/hi/charts.json";
import hiAdmin from "./locales/hi/admin.json";

// Import Spanish translations
import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
import esPeople from "./locales/es/people.json";
import esErrors from "./locales/es/errors.json";
import esNavigation from "./locales/es/navigation.json";
import esDashboard from "./locales/es/dashboard.json";
import esCharts from "./locales/es/charts.json";
import esAdmin from "./locales/es/admin.json";

// Import old monolithic translations as fallback
import enTranslations from "./locales/en.json";
import hiTranslations from "./locales/hi.json";

// Define supported languages
export const SUPPORTED_LANGUAGES = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  es: "Español (Spanish)",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const resources = {
  en: {
    translation: enTranslations,
    common: enCommon,
    auth: enAuth,
    people: enPeople,
    errors: enErrors,
    navigation: enNavigation,
    dashboard: enDashboard,
    charts: enCharts,
    admin: enAdmin,
  },
  hi: {
    translation: hiTranslations,
    common: hiCommon,
    auth: hiAuth,
    people: hiPeople,
    errors: hiErrors,
    navigation: hiNavigation,
    dashboard: hiDashboard,
    charts: hiCharts,
    admin: hiAdmin,
  },
  es: {
    translation: enTranslations, // Fallback to English
    common: esCommon,
    auth: esAuth,
    people: esPeople,
    errors: esErrors,
    navigation: esNavigation,
    dashboard: esDashboard,
    charts: esCharts,
    admin: esAdmin,
  },
};

const isServer = typeof window === "undefined";

// Configure i18n based on environment
// On server: use default "en" language (no browser detection available)
// On client: use LanguageDetector to check localStorage first, then navigator
if (!isServer) {
  i18n.use(LanguageDetector);
}

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: "en",
  defaultNS: "translation",
  ns: [
    "translation",
    "common",
    "auth",
    "people",
    "errors",
    "navigation",
    "dashboard",
    "charts",
    "admin",
  ],
  // Only set lng on server; on client, let LanguageDetector handle it
  ...(isServer ? { lng: "en" } : {}),
  interpolation: {
    escapeValue: false,
  },
  // Detection options for client-side (ignored on server)
  detection: {
    order: ["localStorage", "navigator", "htmlTag"],
    caches: ["localStorage"],
    lookupLocalStorage: "i18nextLng",
  },
});

export default i18n;
