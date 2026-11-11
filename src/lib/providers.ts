export type Provider = {
  id: string;
  name: string;
  hosts: string[];
  capabilities: { embed: boolean; sync: false; voice: false };
  mode: "companion" | "embed";
};
export const vkHosts = [
  "vk.com",
  "www.vk.com",
  "m.vk.com",
  "vk.ru",
  "vkvideo.ru",
  "www.vkvideo.ru",
  "m.vkvideo.ru",
];
const provider = (id: string, name: string, hosts: string[]): Provider => ({
  id,
  name,
  hosts,
  capabilities: { embed: false, sync: false, voice: false },
  mode: "companion",
});
// Capability flags describe implemented integrations, not theoretical provider support.
export const providers: Provider[] = [
  provider("youtube", "YouTube", [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
  ]),
  provider("vk", "VK Видео", vkHosts),
  provider("rutube", "Rutube", ["rutube.ru", "www.rutube.ru"]),
  provider("twitch", "Twitch", ["twitch.tv", "www.twitch.tv"]),
  provider("soundcloud", "SoundCloud", [
    "soundcloud.com",
    "www.soundcloud.com",
    "m.soundcloud.com",
  ]),
  provider("vimeo", "Vimeo", ["vimeo.com", "www.vimeo.com"]),
  provider("dailymotion", "Dailymotion", [
    "dailymotion.com",
    "www.dailymotion.com",
    "dai.ly",
  ]),
  provider("netflix", "Netflix", ["netflix.com", "www.netflix.com"]),
  provider("spotify", "Spotify", ["open.spotify.com"]),
];
/**
 * Spotify's official embed for a track, album, playlist or episode link
 * (open.spotify.com/<type>/<22-char id>, with or without a locale prefix).
 */
export function spotifyEmbed(url: URL): string | null {
  if (url.hostname !== "open.spotify.com") return null;
  const m = url.pathname.match(
    /^(?:\/intl-[a-z-]+)?\/(track|album|playlist|episode)\/([A-Za-z0-9]{22})\/?$/,
  );
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}
/**
 * VK's official embed player, as given by VK's More → Export code. VK only
 * plays a video on other sites with the per-video hash from that code, so a
 * plain video page link is not embeddable and no hash is ever guessed.
 */
export function vkEmbed(url: URL): string | null {
  if (!vkHosts.includes(url.hostname) || url.pathname !== "/video_ext.php")
    return null;
  const oid = url.searchParams.get("oid"),
    id = url.searchParams.get("id"),
    hash = url.searchParams.get("hash");
  if (
    !oid ||
    !id ||
    !hash ||
    !/^-?\d{1,12}$/.test(oid) ||
    !/^\d{1,12}$/.test(id) ||
    !/^[0-9a-f]{8,32}$/i.test(hash)
  )
    return null;
  const embed = new URL("https://vkvideo.ru/video_ext.php");
  embed.searchParams.set("oid", oid);
  embed.searchParams.set("id", id);
  embed.searchParams.set("hash", hash);
  embed.searchParams.set("hd", "2");
  return embed.href;
}
/** "<owner>_<video>" for a plain VK video, live or clip page link, or null. */
export function vkVideoId(url: URL): string | null {
  if (!vkHosts.includes(url.hostname)) return null;
  const match =
    url.pathname.match(/^\/(?:video|live|clip)(-?\d{1,12})_(\d{1,12})\/?$/) ??
    url.searchParams
      .get("z")
      ?.match(/^(?:video|clip)(-?\d{1,12})_(\d{1,12})(?:$|\/)/);
  return match ? `${match[1]}_${match[2]}` : null;
}
/** Accepts a pasted <iframe> embed code and returns its src; otherwise the trimmed input. */
export function embedCodeSource(input: string): string {
  const value = input.trim();
  if (!/^<iframe\b/i.test(value)) return value;
  const src = value.match(/\ssrc=(["'])([^"']{1,2048})\1/i)?.[2];
  return src ? src.replace(/&amp;/g, "&").trim() : value;
}
export function youtubeVideoId(url: URL): string | null {
  if (
    !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
      url.hostname,
    )
  )
    return null;
  const id =
    url.hostname === "youtu.be"
      ? url.pathname.slice(1)
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)$/)?.[1];
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
export function inspectSource(
  input: string,
): { url: string; domain: string; provider: Provider } | null {
  if (input.length > 2048 || /[\u0000-\u0020\u007f]/.test(input.trim()))
    return null;
  try {
    const url = new URL(input.trim());
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    // No network fetch is performed. Reject all IP literals and local/reserved names as a defence in depth.
    if (
      !host.includes(".") ||
      /^[\d.]+$/.test(host) ||
      host.includes(":") ||
      host.startsWith("[") ||
      /\.(localhost|local|internal|test|invalid|example)$/.test(host) ||
      host.endsWith(".")
    )
      return null;
    const matched =
      providers.find((p) => p.hosts.includes(host)) ??
      provider("external", host, [host]);
    const embeddable =
      !!youtubeVideoId(url) || /\.(mp4|webm)$/i.test(url.pathname);
    return {
      url: url.href,
      domain: host,
      provider: embeddable
        ? {
            ...matched,
            mode: "embed",
            capabilities: { ...matched.capabilities, embed: true },
          }
        : matched,
    };
  } catch {
    return null;
  }
}
