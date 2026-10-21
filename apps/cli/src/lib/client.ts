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
  /** Raw request body (file upload); sent as-is with `contentType` */
  raw?: Uint8Array;
  contentType?: string;
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
  headers?: Headers;
}

export interface ApiClient {
  url: string;
  hasToken: boolean;
  /** GET a non-JSON body (file download). Errors are mapped like request(). */
  download: (
    path: string,
    query?: RequestOptions["query"]
  ) => Promise<Download>;
  /** Any method, binary response (e.g. POST that returns a ZIP). */
  fetchBytes: (
    method: string,
    path: string,
    opts?: RequestOptions
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
    if (ro.raw)
      headers["Content-Type"] = ro.contentType ?? "application/octet-stream";
    else if (ro.body !== undefined)
      headers["Content-Type"] = "application/json";
    opts.debug(`-> ${method} ${url}`);
    let res: Response;
    try {
      res = await opts.fetch(url, {
        method,
        headers,
        body:
          ro.raw ??
          (ro.body === undefined ? undefined : JSON.stringify(ro.body)),
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
    async fetchBytes(method, path, ro = {}) {
      const res = await send(method, path, {
        ...ro,
        headers: { Accept: "*/*", ...ro.headers },
      });
      if (!res.ok) throw httpError(res.status, await parse(res), method, path);
      const disposition = res.headers.get("content-disposition") ?? "";
      const name = /filename="?([^";]+)"?/.exec(disposition)?.[1];
      return {
        bytes: new Uint8Array(await res.arrayBuffer()),
        contentType: res.headers.get("content-type") ?? "",
        // Never trust a server-chosen path: plain file name or nothing
        fileName: safeFileName(name),
        headers: res.headers,
      };
    },
    download(path, query) {
      return this.fetchBytes("GET", path, { query });
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
