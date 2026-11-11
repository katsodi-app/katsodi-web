import {
  inspectSource,
  spotifyEmbed,
  vkEmbed,
  vkHosts,
  vkVideoId,
  youtubeVideoId,
} from "./providers";
import { discoveryPlan, retiredParserSource } from "./player-recipes";
export const playerReasons = [
  "unsupported",
  "blocked",
  "notFound",
  "unavailable",
  "notStarted",
  "siteOnly",
  "pageRequired",
  "vkEmbedRequired",
] as const;
export type PlayerReason = (typeof playerReasons)[number];
export type PlayerResolution =
  | {
      kind: "iframe";
      src: string;
      provider: string;
      presentation?: "source-page" | "discovered";
      sync: false;
    }
  | { kind: "video"; src: string; provider: string; sync: false }
  | { kind: "discover"; provider: string; sync: false }
  | {
      kind: "external";
      reason: PlayerReason;
      sync: false;
    };
export function kinogoPage(input: string): string | null {
  const source = inspectSource(input);
  if (!source || source.domain !== "kinogo.is") return null;
  const url = new URL(source.url);
  if (!/^\/\d{1,9}-[a-z0-9-]+\.html$/.test(url.pathname)) return null;
  return `https://kinogo.is${url.pathname}`;
}
export function knownPlayer(input: string): PlayerResolution {
  if (retiredParserSource(input))
    return { kind: "external", reason: "unsupported", sync: false };
  const source = inspectSource(input);
  if (!source) return { kind: "external", reason: "unsupported", sync: false };
  const url = new URL(source.url),
    id = youtubeVideoId(url);
  if (id)
    return {
      kind: "iframe",
      src: `https://www.youtube.com/embed/${id}?playsinline=1&rel=0`,
      provider: "YouTube",
      sync: false,
    };
  const spotify = spotifyEmbed(url);
  if (spotify)
    return { kind: "iframe", src: spotify, provider: "Spotify", sync: false };
  const vk = vkEmbed(url);
  if (vk) return { kind: "iframe", src: vk, provider: "VK Видео", sync: false };
  // A plain VK video link asks the server, which uses VK's official API.
  if (vkVideoId(url))
    return { kind: "discover", provider: "VK Видео", sync: false };
  if (vkHosts.includes(url.hostname))
    return { kind: "external", reason: "vkEmbedRequired", sync: false };
  if (/\.(mp4|webm)$/i.test(url.pathname))
    return { kind: "video", src: source.url, provider: "HTML5", sync: false };
  const plan = discoveryPlan(source.url);
  if (plan) return { kind: "discover", provider: plan.provider, sync: false };
  if (
    ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
      url.hostname,
    )
  )
    return { kind: "external", reason: "unsupported", sync: false };
  return { kind: "discover", provider: source.domain, sync: false };
}
// Only this reviewed player origin/path is accepted from external HTML.
export function approvedFrame(input: string, page: string): string | null {
  try {
    const url = new URL(input.replaceAll("&amp;", "&"), page);
    if (url.username || url.password || url.hash || url.href.length > 2048)
      return null;
    if (
      url.origin === "https://api.nextembed.ws" &&
      /^\/embed\/(movie|series)\/\d+$/.test(url.pathname) &&
      !url.search
    )
      return url.href;
    return null;
  } catch {
    return null;
  }
}
export function findPlayerFrames(html: string, page: string): string[] {
  // Read attributes only; never execute scripts or use remote HTML as markup.
  const tags =
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .match(/<iframe\b[^>]*>/gi) || [];
  return [
    ...new Set(
      tags.flatMap((tag) => {
        const src = tag.match(/\b(?:src|data-src)\s*=\s*(["'])(.*?)\1/i)?.[2];
        const safe = src && approvedFrame(src, page);
        return safe ? [safe] : [];
      }),
    ),
  ].slice(0, 3);
}
export function readPlayerResolution(value: unknown): PlayerResolution | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    data.kind === "external" &&
    playerReasons.some((reason) => reason === data.reason)
  )
    return {
      kind: "external",
      reason: data.reason as PlayerReason,
      sync: false,
    };
  if (typeof data.src !== "string") return null;
  if (retiredParserSource(data.src)) return null;
  if (
    data.kind === "iframe" &&
    ["source-page", "discovered"].includes(String(data.presentation))
  ) {
    const src = inspectSource(data.src)?.url;
    return src
      ? {
          kind: "iframe",
          src,
          provider: new URL(src).hostname,
          presentation: data.presentation as "source-page" | "discovered",
          sync: false,
        }
      : null;
  }
  const known = knownPlayer(data.src);
  if (data.kind === "video" && known.kind === "video") return known;
  if (data.kind === "iframe") {
    if (known.kind === "iframe") return known;
    const frame = approvedFrame(data.src, "https://kinogo.is/");
    if (frame)
      return {
        kind: "iframe",
        src: frame,
        provider: "Kinogo / NextEmbed",
        sync: false,
      };
  }
  return null;
}
