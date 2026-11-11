/**
 * The public origin configured in NEXT_PUBLIC_APP_URL: https, or plain http
 * only for a local host. Null when it is missing or not acceptable.
 *
 * Behind a reverse proxy, `request.url` in a route handler names the host the
 * Next server listens on (for example http://localhost:3000), not the domain
 * the visitor opened, so absolute redirects must be built from this value.
 */
export function appOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

/** Origin for absolute redirects: the configured app URL, else the request's. */
export function redirectOrigin(request: Request): string {
  return appOrigin() || new URL(request.url).origin;
}
