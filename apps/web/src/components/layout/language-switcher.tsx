"use client";

import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui/primitives";
import type { SupportedLanguage } from "~/i18n/config";
import { setUserLanguagePreference } from "~/server/settings";
import { SUPPORTED_LANGUAGES } from "~/i18n/config";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languageMutation = useMutation({
    mutationFn: setUserLanguagePreference,
    onSuccess: (data) => {
      // Update i18n client-side after successful server update
      if (data.language) {
        i18n.changeLanguage(data.language);
      }
    },
  });

  const handleLanguageChange = (value: string) => {
    const language = value as SupportedLanguage;
    languageMutation.mutate({ data: { language } });
  };

  return (
    <Select
      value={i18n.language}
      onValueChange={handleLanguageChange}
      disabled={languageMutation.isPending}
    >
      <SelectTrigger className="h-9 w-[140px]">
        <SelectValue>
          <div className="flex items-center gap-2">
            <LanguageIcon />
            <span className="text-sm">
              {getLanguageLabel(i18n.language as SupportedLanguage)}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center gap-2">
              <LanguageIcon />
              <span>{name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LanguageIcon() {
  // Display a simple globe icon for all languages
  // Could be replaced with flag emojis or SVG flags in the future
  return (
    <svg
      className="text-muted-foreground h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  );
}

function getLanguageLabel(language: SupportedLanguage): string {
  const labels: Record<SupportedLanguage, string> = {
    en: "EN",
    hi: "हि",
    es: "ES",
  };
  return labels[language] || "EN";
}
