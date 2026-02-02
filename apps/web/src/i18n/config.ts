import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

// Import English translations
import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enPeople from "./locales/en/people.json";
import enErrors from "./locales/en/errors.json";

// Import Hindi translations
import hiCommon from "./locales/hi/common.json";
import hiAuth from "./locales/hi/auth.json";
import hiPeople from "./locales/hi/people.json";
import hiErrors from "./locales/hi/errors.json";

// Import Spanish translations
import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
import esPeople from "./locales/es/people.json";
import esErrors from "./locales/es/errors.json";

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
  },
  hi: {
    translation: hiTranslations,
    common: hiCommon,
    auth: hiAuth,
    people: hiPeople,
    errors: hiErrors,
  },
  es: {
    translation: enTranslations, // Fallback to English
    common: esCommon,
    auth: esAuth,
    people: esPeople,
    errors: esErrors,
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
  ns: ["translation", "common", "auth", "people", "errors"],
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
