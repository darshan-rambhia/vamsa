import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enTranslations from "./locales/en.json";
import hiTranslations from "./locales/hi.json";

// Define supported languages
export const SUPPORTED_LANGUAGES = {
  en: "English",
  hi: "हिन्दी (Hindi)",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const resources = {
  en: { translation: enTranslations },
  hi: { translation: hiTranslations },
};

// Only initialize in browser environment
if (typeof window !== "undefined") {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      defaultNS: "translation",
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
      },
    });
}

export default i18n;
