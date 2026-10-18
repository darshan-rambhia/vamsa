/**
 * Give TanStack Start the public URL (APP_URL), not the internal one.
 *
 * Behind a TLS-terminating proxy the request arrives as http://<host>, but the
 * browser sends Origin: https://<host>. TanStack rejects POST server function
 * calls whose Origin differs from request.url's origin (403 Forbidden).
 */
export function withPublicOrigin(request: Request): Request {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return request;

  const publicUrl = new URL(appUrl);
  const url = new URL(request.url);
  if (url.origin === publicUrl.origin) return request;

  url.protocol = publicUrl.protocol;
  url.host = publicUrl.host;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : undefined,
    duplex: "half",
    redirect: request.redirect,
    signal: request.signal,
  } as RequestInit);
}
