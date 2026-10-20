/**
 * Detection + reload guard for failed module/chunk loads (network blips,
 * cancelled requests, stale chunks after a deploy). Pure helpers are unit
 * tested; the inline pre-hydration script in module-load-fallback.ts mirrors
 * the same patterns and storage key, keep them in sync.
 */

export const MODULE_ERROR_PATTERNS: ReadonlyArray<RegExp> = [
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
];

export const RELOAD_GUARD_KEY = "vamsa:module-reload";
export const RELOAD_GUARD_WINDOW_MS = 10_000;

export interface ReloadRecord {
  path: string;
  ts: number;
}

export function isModuleLoadError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "";
  return MODULE_ERROR_PATTERNS.some((re) => re.test(message));
}

/** True unless we already reloaded this path within the guard window. */
export function shouldAutoReload(
  last: ReloadRecord | null,
  path: string,
  now: number,
  windowMs: number = RELOAD_GUARD_WINDOW_MS
): boolean {
  if (!last || last.path !== path) return true;
  const elapsed = now - last.ts;
  return elapsed < 0 || elapsed >= windowMs;
}

export function parseReloadRecord(raw: string | null): ReloadRecord | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (
      typeof v === "object" &&
      v !== null &&
      "path" in v &&
      "ts" in v &&
      typeof v.path === "string" &&
      typeof v.ts === "number"
    ) {
      return { path: v.path, ts: v.ts };
    }
  } catch {
    // corrupt value: treat as no record
  }
  return null;
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Reloads once per path per guard window. Returns true if a reload was
 * triggered, false if the guard blocked it (caller should show fallback UI).
 */
export function tryAutoReload(
  storage: Pick<Storage, "getItem" | "setItem"> | null = safeSessionStorage(),
  path: string = typeof window === "undefined" ? "" : window.location.pathname,
  now: number = Date.now(),
  reload: () => void = () => window.location.reload()
): boolean {
  if (!storage) return false;
  let last: ReloadRecord | null = null;
  try {
    last = parseReloadRecord(storage.getItem(RELOAD_GUARD_KEY));
  } catch {
    // storage unreadable: treat as no record
  }
  if (!shouldAutoReload(last, path, now)) return false;
  try {
    storage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ path, ts: now }));
  } catch {
    return false; // cannot record the guard: do not risk a reload loop
  }
  reload();
  return true;
}
