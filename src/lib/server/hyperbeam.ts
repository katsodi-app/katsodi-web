import "server-only";

/**
 * Minimal Hyperbeam REST client (https://docs.hyperbeam.com). The API key is
 * server-only and never sent to the browser or the database.
 * - Sessions start with NO default roles: viewers cannot control anything.
 * - The host's own connection gets "control" + "chrome_apis" via addRoles.
 * - Sessions end after 4 hours, or 5 minutes with nobody connected.
 */
const ENGINE = "https://engine.hyperbeam.com/v0/vm";
export const HOST_ROLES = ["control", "chrome_apis"] as const;

export function hyperbeamKey(): string | null {
  const key = process.env.HYPERBEAM_API_KEY?.trim();
  return key && key.length >= 16 && !/\s/.test(key) ? key : null;
}

/** Only Hyperbeam's own HTTPS hosts are accepted as embed URLs. */
export function safeEmbedUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !(
        url.hostname === "hyperbeam.com" ||
        url.hostname.endsWith(".hyperbeam.com")
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

async function call(url: string, init: RequestInit) {
  const key = hyperbeamKey();
  if (!key) throw new Error("unconfigured");
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
}

export async function createBrowserSession(
  startUrl: string,
): Promise<{ sessionId: string; embedUrl: string }> {
  const response = await call(ENGINE, {
    method: "POST",
    body: JSON.stringify({
      start_url: startUrl,
      default_roles: [],
      timeout: { absolute: 4 * 60 * 60, offline: 5 * 60 },
    }),
  });
  if (!response.ok) throw new Error("hyperbeam_unavailable");
  const data = (await response.json()) as Record<string, unknown>;
  const sessionId = data.session_id;
  const embedUrl = safeEmbedUrl(data.embed_url);
  if (
    typeof sessionId !== "string" ||
    !/^[A-Za-z0-9-]{8,128}$/.test(sessionId) ||
    !embedUrl
  )
    throw new Error("hyperbeam_invalid_response");
  return { sessionId, embedUrl };
}

/** Ends a session; an already-ended session counts as success. */
export async function deleteBrowserSession(sessionId: string) {
  if (!/^[A-Za-z0-9-]{8,128}$/.test(sessionId)) return;
  const response = await call(`${ENGINE}/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404)
    throw new Error("hyperbeam_unavailable");
}

/** Grants host roles to one connected Hyperbeam user of this session. */
export async function grantHostRoles(
  embedUrl: string,
  hyperbeamUserId: string,
) {
  const embed = safeEmbedUrl(embedUrl);
  if (!embed || !/^[A-Za-z0-9-]{8,64}$/.test(hyperbeamUserId))
    throw new Error("invalid");
  const base = new URL(embed);
  base.search = "";
  base.hash = "";
  base.pathname = `${base.pathname.replace(/\/$/, "")}/addRoles`;
  const response = await call(base.href, {
    method: "POST",
    // Hyperbeam takes positional parameters: [userIds, roles, exclusive].
    body: JSON.stringify([[hyperbeamUserId], HOST_ROLES, false]),
  });
  if (!response.ok) throw new Error("hyperbeam_unavailable");
}
