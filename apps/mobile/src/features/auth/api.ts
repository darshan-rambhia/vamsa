import { getAuthClient } from "@/src/lib/auth-client";

export type AuthCookieSource = "none" | "env" | "client" | "manual";

const listeners = new Set<() => void>();
const envCookie = process.env.EXPO_PUBLIC_BETTER_AUTH_SESSION_COOKIE;
let manualCookieOverride: string | undefined;
let authVersion = 0;

function emitAuthChanged() {
  authVersion += 1;
  listeners.forEach((listener) => listener());
}

export function getAuthVersionSnapshot(): number {
  return authVersion;
}

function normalizeCookie(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const sessionTokenMatch = trimmed.match(
    /better-auth\.session_token=([^;\s,]+)/
  );
  if (sessionTokenMatch) {
    return `better-auth.session_token=${sessionTokenMatch[1]}`;
  }

  const simpleCookieMatch = trimmed.match(/^([^=\s]+)=([^;\s,]+)/);
  if (simpleCookieMatch) {
    return `${simpleCookieMatch[1]}=${simpleCookieMatch[2]}`;
  }

  if (trimmed.includes("=")) {
    return trimmed.split(";")[0]?.trim() ?? "";
  }

  return `better-auth.session_token=${trimmed}`;
}

export function subscribeAuthChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthCookieSource(): AuthCookieSource {
  if (manualCookieOverride) return "manual";
  const clientCookie = getAuthClient().getCookie();
  if (clientCookie) return "client";
  if (envCookie) return "env";
  return "none";
}

export function getAuthCookie(): string | undefined {
  const cookie =
    manualCookieOverride || getAuthClient().getCookie() || envCookie;
  if (!cookie) {
    return undefined;
  }

  const normalized = normalizeCookie(cookie);
  return normalized || undefined;
}

export function setManualAuthCookie(cookie: string) {
  const normalized = normalizeCookie(cookie);
  manualCookieOverride = normalized || undefined;
  emitAuthChanged();
}

export function clearManualAuthCookie() {
  manualCookieOverride = undefined;
  emitAuthChanged();
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ warning?: string }> {
  const response = await getAuthClient().signIn.email({
    email,
    password,
  });

  if (response.error) {
    throw new Error(response.error.message || "Login failed");
  }

  clearManualAuthCookie();

  const cookie = getAuthCookie();
  if (cookie) {
    return {};
  }

  return {
    warning:
      "Login succeeded, but session cookies are not yet available to the app. You can apply a manual cookie in Settings for local testing.",
  };
}

export async function logout() {
  const response = await getAuthClient().signOut();
  if (response.error) {
    throw new Error(response.error.message || "Logout failed");
  }

  clearManualAuthCookie();
}
