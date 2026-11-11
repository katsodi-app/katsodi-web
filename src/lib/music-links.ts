import { spotifyEmbed } from "./providers";

/** Kinds of music link Katsodi can queue (shared by browser and server). */
export function classifyLink(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host === "youtube.com" || host === "youtu.be") {
    const list = url.searchParams.get("list");
    if (list && /^[A-Za-z0-9_-]{10,64}$/.test(list))
      return { kind: "youtube-playlist" as const, id: list, url };
    return { kind: "single" as const, url };
  }
  if (url.hostname === "open.spotify.com") {
    const embed = spotifyEmbed(url);
    if (!embed) return null;
    const [, type, id] = new URL(embed).pathname.match(
      /^\/embed\/(\w+)\/(\w+)$/,
    )!;
    if (type === "playlist" || type === "album")
      return { kind: `spotify-${type}` as const, id, url };
    return { kind: "single" as const, url };
  }
  if (
    host === "soundcloud.com" &&
    url.pathname.split("/").filter(Boolean).length >= 2
  )
    return /^\/[^/]+\/sets\/[^/]+\/?$/.test(url.pathname)
      ? { kind: "soundcloud-playlist" as const, url }
      : { kind: "single" as const, url };
  return null;
}

/** Whether a link is music or a playlist (the video-room prompt uses this). */
export function isMusicOrPlaylist(input: string) {
  const link = classifyLink(input);
  if (!link) return false;
  return (
    link.kind !== "single" ||
    link.url.hostname === "open.spotify.com" ||
    link.url.hostname.replace(/^(www|m)\./, "") === "soundcloud.com" ||
    link.url.hostname === "music.youtube.com"
  );
}
