/**
 * CLI errors. Every failure becomes one structured `error:` block on stdout
 * with a stable `code`, a `message` and, when we know one, a `hint` with the
 * next command to try.
 */

export const EXIT_OK = 0;
export const EXIT_ERROR = 1;
export const EXIT_USAGE = 2;

export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string,
    public readonly exitCode: number = EXIT_ERROR,
    public readonly status?: number,
    /** Extra structured fields printed inside the error block */
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function usageError(message: string, hint?: string): CliError {
  return new CliError("usage", message, hint, EXIT_USAGE);
}

/** Map an HTTP error response to a CliError with a useful hint. */
export function httpError(
  status: number,
  body: unknown,
  method: string,
  path: string
): CliError {
  const detail = extractMessage(body);
  switch (status) {
    case 400: {
      // Validation failures carry `details` (first problem) and `issues`
      // (every field); show the readable message, not "Validation error: ..."
      const issues = extractIssues(body);
      const b = body as Record<string, unknown>;
      const message =
        issues.length && typeof b.details === "string" && b.details
          ? b.details
          : detail;
      return new CliError(
        "invalid_request",
        message ?? "Request was rejected by the server",
        undefined,
        EXIT_ERROR,
        status,
        issues.length ? { issues } : undefined
      );
    }
    case 401:
      return new CliError(
        "unauthorized",
        detail ?? "Not logged in or token expired",
        "vamsa login --email <email> --password-stdin",
        EXIT_ERROR,
        status
      );
    case 403:
      return new CliError(
        "forbidden",
        detail ?? "Your role or token scope does not allow this",
        "vamsa whoami  (shows role and token scope)",
        EXIT_ERROR,
        status
      );
    case 404:
      return new CliError(
        "not_found",
        detail ?? `Not found: ${method} ${path}`,
        undefined,
        EXIT_ERROR,
        status
      );
    case 409:
      return new CliError(
        "conflict",
        detail ?? "Conflicts with existing data",
        undefined,
        EXIT_ERROR,
        status
      );
    case 429:
      return new CliError(
        "rate_limited",
        detail ?? "Too many requests",
        "wait a minute and retry",
        EXIT_ERROR,
        status
      );
    case 501:
      return new CliError(
        "not_implemented",
        detail ?? "The server does not support this yet",
        undefined,
        EXIT_ERROR,
        status
      );
    default:
      return new CliError(
        "server_error",
        detail ?? `Server returned HTTP ${status}`,
        "retry with --verbose for request details",
        EXIT_ERROR,
        status
      );
  }
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  const parts = [b.error, b.message, b.details].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  return parts.length ? [...new Set(parts)].join(": ") : undefined;
}

export interface FieldIssue {
  path: string;
  message: string;
  code: string;
}

/** Per-field problems from the server's 400 `{ issues: [...] }` body. */
function extractIssues(body: unknown): Array<FieldIssue> {
  if (!body || typeof body !== "object") return [];
  const raw = (body as Record<string, unknown>).issues;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      path: typeof i.path === "string" && i.path ? i.path : "(body)",
      message: typeof i.message === "string" ? i.message : "",
      code: typeof i.code === "string" ? i.code : "",
    }));
}

/** Normalize anything thrown into a CliError. */
export function toCliError(err: unknown): CliError {
  if (err instanceof CliError) return err;
  const message = (err instanceof Error ? err.message : String(err)).replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g,
    ""
  );
  // citty's enum check throws a plain Error; it is a usage problem
  if (message.startsWith("Invalid value for argument")) {
    return usageError(message, "run the command with --help");
  }
  return new CliError("internal", message, "retry with --verbose for details");
}
