import { appOrigin } from "./app-origin";

/**
 * CSRF guard for state-changing API routes: the browser's Origin must be
 * this site. Compared with the Host the browser actually connected to (so
 * http://localhost:3000 and http://127.0.0.1:3000 both work in development),
 * the server's own URL, and the public origin in NEXT_PUBLIC_APP_URL (a
 * reverse proxy may replace Host with the upstream address). A missing or
 * foreign Origin is refused. X-Forwarded-Host is deliberately not trusted.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const from = new URL(origin);
    if (from.origin === new URL(request.url).origin) return true;
    if (from.origin === appOrigin()) return true;
    const host = request.headers.get("host");
    return !!host && from.host === host.toLowerCase();
  } catch {
    return false;
  }
}
