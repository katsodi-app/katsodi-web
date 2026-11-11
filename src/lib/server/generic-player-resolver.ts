import { inspectSource } from "../providers";
import { retiredParserSource } from "../player-recipes";
import { knownPlayer, type PlayerResolution } from "../player";
import { oembedPlayer, pagePlayerSignals } from "./page-player-parser";
import { publicPlayerPage, PublicPageError } from "./public-player-request";
import { knownOembed, type OembedProvider } from "./oembed-providers";
export function embeddingBlocked(headers: Headers) {
  if (headers.has("x-frame-options")) return true;
  const policies = headers.get("content-security-policy") || "";
  return [
    ...policies.matchAll(/(?:^|[;,])\s*frame-ancestors\s+([^;,]+)/gi),
  ].some((m) => m[1].trim() !== "*");
}
export async function genericPlayer(input: string): Promise<PlayerResolution> {
  const deadline = Date.now() + 20000;
  const visited = new Set<string>();
  let blocked = false,
    unavailable = false,
    requests = 0;
  async function visit(
    url: string,
    depth: number,
    declared = false,
  ): Promise<PlayerResolution | null> {
    if (retiredParserSource(url)) return null;
    if (
      visited.has(url) ||
      requests >= 6 ||
      depth > 2 ||
      Date.now() >= deadline
    )
      return null;
    visited.add(url);
    requests++;
    try {
      const page = await publicPlayerPage(url, deadline);
      const signals = pagePlayerSignals(page.body, page.url);
      // Keep the original embedded player's UI, ads and own origin intact.
      if (
        depth > 0 &&
        (signals.native || declared) &&
        !embeddingBlocked(page.headers)
      )
        return {
          kind: "iframe",
          src: page.url,
          provider: new URL(page.url).hostname,
          presentation: "discovered",
          sync: false,
        };
      // A site's published oEmbed player outranks guessed iframes.
      for (const endpoint of signals.oembed) {
        const result = await viaOembed(endpoint, depth);
        if (result) return result;
      }
      for (const frame of signals.frames) {
        const known = knownPlayer(frame);
        if (known.kind === "iframe") return known;
        const result = await visit(
          frame,
          depth + 1,
          signals.declared.includes(frame),
        );
        if (result) return result;
      }
      if (signals.native || declared) {
        if (embeddingBlocked(page.headers)) blocked = true;
        else
          return {
            kind: "iframe",
            src: page.url,
            provider: new URL(page.url).hostname,
            presentation: "source-page",
            sync: false,
          };
      }
    } catch (error) {
      if (error instanceof PublicPageError && error.reason === "blocked")
        blocked = true;
      else unavailable = true;
    }
    return null;
  }
  async function viaOembed(
    endpoint: string,
    depth: number,
    official?: OembedProvider,
  ): Promise<PlayerResolution | null> {
    if (visited.has(endpoint) || requests >= 6 || Date.now() >= deadline)
      return null;
    visited.add(endpoint);
    requests++;
    let player: string | null;
    try {
      const document = await publicPlayerPage(endpoint, deadline, 0, "json");
      player = oembedPlayer(document.body, document.url);
    } catch {
      // A broken oEmbed endpoint falls back to ordinary page signals.
      return null;
    }
    if (!player) return null;
    const known = knownPlayer(player);
    if (known.kind === "iframe") return known;
    // The reviewed provider's own player host, returned by its own embed API.
    if (official?.players.includes(new URL(player).hostname))
      return {
        kind: "iframe",
        src: player,
        provider: official.name,
        presentation: "discovered",
        sync: false,
      };
    // Any other oEmbed player is fetched and checked for
    // X-Frame-Options/frame-ancestors like every discovered frame.
    return visit(player, depth + 1, true);
  }
  if (!inspectSource(input))
    return { kind: "external", reason: "unsupported", sync: false };
  // Providers with a known official endpoint skip page scraping entirely.
  const official = knownOembed(input);
  return (
    (official && (await viaOembed(official.request, 0, official.provider))) ||
    (await visit(input, 0)) || {
      kind: "external",
      reason: blocked ? "blocked" : unavailable ? "unavailable" : "notFound",
      sync: false,
    }
  );
}
