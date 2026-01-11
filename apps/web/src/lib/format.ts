/**
 * Formatting utilities for internationalization
 * Provides locale-aware formatting for dates and numbers
 */

export type SupportedLocale = "en" | "hi";

/**
 * Map language codes to locale identifiers
 */
const LOCALE_MAP: Record<SupportedLocale, string> = {
  en: "en-US",
  hi: "hi-IN",
};

/**
 * Format a date according to the specified locale
 * @param date - Date to format (Date object, timestamp, or ISO string)
 * @param locale - Language code (en, hi)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateLocalized(
  date: Date | number | string,
  locale: SupportedLocale = "en",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const dateObj =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  const localeId = LOCALE_MAP[locale] || LOCALE_MAP.en;

  return new Intl.DateTimeFormat(localeId, options).format(dateObj);
}

/**
 * Format a date in a short format (e.g., "12/31/2023" or "31/12/2023")
 * @param date - Date to format
 * @param locale - Language code
 * @returns Short formatted date string
 */
export function formatDateShort(
  date: Date | number | string,
  locale: SupportedLocale = "en"
): string {
  return formatDateLocalized(date, locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format a date with time
 * @param date - Date to format
 * @param locale - Language code
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | number | string,
  locale: SupportedLocale = "en"
): string {
  return formatDateLocalized(date, locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 * @param timestamp - Timestamp in milliseconds
 * @param locale - Language code
 * @returns Relative time string
 */
export function formatRelativeTime(
  timestamp: number,
  locale: SupportedLocale = "en"
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const localeId = LOCALE_MAP[locale] || LOCALE_MAP.en;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  // Use Intl.RelativeTimeFormat for proper localization
  const rtf = new Intl.RelativeTimeFormat(localeId, { numeric: "auto" });

  if (minutes < 1) return rtf.format(0, "minute");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  if (days < 7) return rtf.format(-days, "day");

  // For dates older than a week, show the actual date
  return formatDateShort(timestamp, locale);
}

/**
 * Format a number according to the specified locale
 * @param value - Number to format
 * @param locale - Language code
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumberLocalized(
  value: number,
  locale: SupportedLocale = "en",
  options?: Intl.NumberFormatOptions
): string {
  const localeId = LOCALE_MAP[locale] || LOCALE_MAP.en;
  return new Intl.NumberFormat(localeId, options).format(value);
}

/**
 * Format a number as currency
 * @param value - Number to format
 * @param locale - Language code
 * @param currency - Currency code (default: USD for en, INR for hi)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number,
  locale: SupportedLocale = "en",
  currency?: string
): string {
  const localeId = LOCALE_MAP[locale] || LOCALE_MAP.en;
  const currencyCode = currency || (locale === "hi" ? "INR" : "USD");

  return new Intl.NumberFormat(localeId, {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

/**
 * Format a percentage
 * @param value - Number to format (e.g., 0.75 for 75%)
 * @param locale - Language code
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  locale: SupportedLocale = "en",
  decimals: number = 0
): string {
  const localeId = LOCALE_MAP[locale] || LOCALE_MAP.en;

  return new Intl.NumberFormat(localeId, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
