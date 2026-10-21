/**
 * Thin fetch wrapper for the Vamsa REST API (/api/v1).
 *
 * Not using packages/client: its Hono RPC types import the web app's server
 * module graph (AppType), which would drag the whole web server into the CLI's
 * typecheck and bundle. The CLI only needs a handful of JSON calls.
 */

import { CliError, httpError } from "./errors";

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Accept a server-provided download name only if it is a plain file name:
 * no directory parts, no "..", no leading dot, no control characters.
 * Returns undefined otherwise so callers fall back to their default.
 */
export function safeFileName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const trimmed = name.trim();
  if (
    trimmed === "" ||
    trimmed.length > 200 ||
    trimmed.startsWith(".") ||
    trimmed.includes("..") ||
    /[/\\:]/.test(trimmed) ||
    [...trimmed].some((ch) => ch.charCodeAt(0) < 0x20 || ch === "\u007f")
  ) {
    return undefined;
  }
  return trimmed;
}

export interface ClientOptions {
  url: string;
  token?: string;
  fetch: FetchFn;
  debug: (msg: string) => void;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * Return { status: 404 } instead of throwing (idempotent deletes), but only
   * when the 404 body's `error` is exactly this message. A 404 for any other
   * reason (wrong route, wrong server) still throws.
   */
  allowNotFound?: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
}

export interface Download {
  bytes: Uint8Array;
  contentType: string;
  /** File name from Content-Disposition, if the server sent one */
  fileName?: string;
}

export interface ApiClient {
  url: string;
  hasToken: boolean;
  /** GET a non-JSON body (file download). Errors are mapped like request(). */
  download: (
    path: string,
    query?: RequestOptions["query"]
  ) => Promise<Download>;
  request: <T = unknown>(
    method: string,
    path: string,
    opts?: RequestOptions
  ) => Promise<ApiResponse<T>>;
}

export function createClient(opts: ClientOptions): ApiClient {
  const base = `${opts.url}/api/v1`;

  async function send(method: string, path: string, ro: RequestOptions) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(ro.query ?? {})) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const url = `${base}${path}${qs.size ? `?${qs}` : ""}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...ro.headers,
    };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    if (ro.body !== undefined) headers["Content-Type"] = "application/json";
    opts.debug(`-> ${method} ${url}`);
    let res: Response;
    try {
      res = await opts.fetch(url, {
        method,
        headers,
        body: ro.body === undefined ? undefined : JSON.stringify(ro.body),
      });
    } catch (err) {
      throw new CliError(
        "connection_failed",
        `Cannot reach ${opts.url}: ${err instanceof Error ? err.message : String(err)}`,
        "check the server is running, or pass --url <url> / set VAMSA_URL"
      );
    }
    opts.debug(`<- ${res.status} ${method} ${url}`);
    return res;
  }

  async function parse(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return {
    url: opts.url,
    hasToken: Boolean(opts.token),
    async download(path, query) {
      const res = await send("GET", path, {
        query,
        headers: { Accept: "*/*" },
      });
      if (!res.ok) throw httpError(res.status, await parse(res), "GET", path);
      const disposition = res.headers.get("content-disposition") ?? "";
      const name = /filename="?([^";]+)"?/.exec(disposition)?.[1];
      return {
        bytes: new Uint8Array(await res.arrayBuffer()),
        contentType: res.headers.get("content-type") ?? "",
        // Never trust a server-chosen path: plain file name or nothing
        fileName: safeFileName(name),
      };
    },
    async request<T>(method: string, path: string, ro: RequestOptions = {}) {
      const res = await send(method, path, ro);
      const data = await parse(res);

      if (
        res.status === 404 &&
        ro.allowNotFound !== undefined &&
        (data as { error?: unknown } | undefined)?.error === ro.allowNotFound
      ) {
        return { status: 404, data: data as T };
      }
      if (!res.ok) throw httpError(res.status, data, method, path);
      return { status: res.status, data: data as T };
    },
  };
}
