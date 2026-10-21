/**
 * Thin fetch wrapper for the Vamsa REST API (/api/v1).
 *
 * Not using packages/client: its Hono RPC types import the web app's server
 * module graph (AppType), which would drag the whole web server into the CLI's
 * typecheck and bundle. The CLI only needs a handful of JSON calls.
 */

import { CliError, httpError } from "./errors";

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

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

export interface ApiClient {
  url: string;
  hasToken: boolean;
  request: <T = unknown>(
    method: string,
    path: string,
    opts?: RequestOptions
  ) => Promise<ApiResponse<T>>;
}

export function createClient(opts: ClientOptions): ApiClient {
  const base = `${opts.url}/api/v1`;

  return {
    url: opts.url,
    hasToken: Boolean(opts.token),
    async request<T>(method: string, path: string, ro: RequestOptions = {}) {
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

      const text = await res.text();
      let data: unknown = undefined;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

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
