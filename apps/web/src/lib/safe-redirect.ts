/**
 * Accept a post-login return path only if it stays on this site: a single
 * leading slash, no protocol-relative `//host` or backslash tricks.
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  if (value.includes("\\") || [...value].some((ch) => ch.charCodeAt(0) < 32)) {
    return undefined;
  }
  return value;
}
