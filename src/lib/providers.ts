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
  provider("twitch", "Twitch", [
    "twitch.tv",
    "www.twitch.tv",
    "m.twitch.tv",
    "clips.twitch.tv",
  ]),
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
  provider("kick", "Kick", ["kick.com", "www.kick.com"]),
  provider("googledrive", "Google Drive", ["drive.google.com"]),
  provider("ok", "OK Видео", ["ok.ru", "www.ok.ru", "m.ok.ru"]),
];
const kickReserved = new Set([
  "browse",
  "categories",
  "category",
  "following",
  "search",
  "settings",
  "dashboard",
  "terms-of-service",
  "privacy-policy",
  "community-guidelines",
  "video",
  "clips",
]);
/**
 * Kick's own player (player.kick.com) for a channel (live) or a past
 * broadcast (kick.com/<channel>/videos/<uuid>).
 */
export function kickEmbed(url: URL): string | null {
  if (!["kick.com", "www.kick.com"].includes(url.hostname)) return null;
  const video = url.pathname.match(
    /^\/[A-Za-z0-9_-]{2,40}\/videos\/([0-9a-f-]{36})\/?$/i,
  )?.[1];
  if (video) return `https://player.kick.com/video/${video.toLowerCase()}`;
  const channel = url.pathname.match(/^\/([A-Za-z0-9_-]{2,40})\/?$/)?.[1];
  return channel && !kickReserved.has(channel.toLowerCase())
    ? `https://player.kick.com/${channel.toLowerCase()}`
    : null;
}
/** Google Drive's preview player for a shared video file. */
export function driveEmbed(url: URL): string | null {
  if (url.hostname !== "drive.google.com") return null;
  const id =
    url.pathname.match(
      /^\/file\/d\/([A-Za-z0-9_-]{20,80})(?:\/(?:view|preview|edit))?\/?$/,
    )?.[1] ??
    (url.pathname === "/open" || url.pathname === "/uc"
      ? url.searchParams.get("id")
      : null);
  return id && /^[A-Za-z0-9_-]{20,80}$/.test(id)
    ? `https://drive.google.com/file/d/${id}/preview`
    : null;
}
/** Rutube's own player for a video page (rutube.ru/video/<32 hex>/). */
export function rutubeEmbed(url: URL): string | null {
  if (!["rutube.ru", "www.rutube.ru"].includes(url.hostname)) return null;
  const id = url.pathname.match(
    /^\/(?:video|play\/embed)\/([0-9a-f]{32})\/?$/i,
  )?.[1];
  return id ? `https://rutube.ru/play/embed/${id.toLowerCase()}` : null;
}
/** OK's own player for a video page (ok.ru/video/<id>). */
export function okEmbed(url: URL): string | null {
  if (!["ok.ru", "www.ok.ru", "m.ok.ru"].includes(url.hostname)) return null;
  const id = url.pathname.match(/^\/(?:video|videoembed|live)\/(\d{3,20})\/?$/)?.[1];
  return id ? `https://ok.ru/videoembed/${id}` : null;
}
/** Dailymotion's own player (geo.dailymotion.com) for a video (dailymotion.com/video/<id>, dai.ly/<id>). */
export function dailymotionEmbed(url: URL): string | null {
  const id =
    url.hostname === "dai.ly"
      ? url.pathname.match(/^\/([A-Za-z0-9]{5,12})\/?$/)?.[1]
      : ["dailymotion.com", "www.dailymotion.com"].includes(url.hostname)
        ? url.pathname.match(/^\/(?:embed\/)?video\/([A-Za-z0-9]{5,12})(?:_[^/]*)?\/?$/)?.[1]
        : null;
  return id ? `https://geo.dailymotion.com/player.html?video=${id}` : null;
}
/**
 * Players without a public control API that the desktop app still keeps on
 * the shared timeline: its player helper finds the <video> inside their
 * frame (play, pause and, for recordings, seeking). Live channels follow
 * play and pause only.
 */
export function frameEmbed(url: URL): string | null {
  return (
    kickEmbed(url) ??
    driveEmbed(url) ??
    rutubeEmbed(url) ??
    okEmbed(url) ??
    dailymotionEmbed(url)
  );
}
/**
 * Subscription services watched together "Rave-style": each person signs in
 * to their own account in the desktop app's service view, and the room keeps
 * play, pause and position in step. Nothing is restreamed.
 */
export const streamingServices = [
  {
    id: "netflix",
    hosts: ["netflix.com", "www.netflix.com"],
    start: "https://www.netflix.com/browse",
  },
  {
    id: "hbomax",
    hosts: [
      "hbomax.com",
      "www.hbomax.com",
      "play.hbomax.com",
      "max.com",
      "www.max.com",
      "play.max.com",
    ],
    start: "https://play.hbomax.com/",
  },
  {
    id: "primevideo",
    hosts: ["primevideo.com", "www.primevideo.com"],
    start: "https://www.primevideo.com/",
  },
  {
    id: "disneyplus",
    hosts: ["disneyplus.com", "www.disneyplus.com"],
    start: "https://www.disneyplus.com/",
  },
  {
    id: "crunchyroll",
    hosts: ["crunchyroll.com", "www.crunchyroll.com"],
    start: "https://www.crunchyroll.com/",
  },
] as const;
/** The streaming service an https link belongs to, by exact host. */
export function streamingService(url: URL) {
  if (url.protocol !== "https:") return null;
  return (
    streamingServices.find((service) =>
      (service.hosts as readonly string[]).includes(url.hostname),
    ) ?? null
  );
}
/** Where Katsodi embeds players: Twitch only plays inside these pages. */
export const twitchParents = [
  "katsodi.watch",
  "www.katsodi.watch",
  "localhost",
  "127.0.0.1",
];
const twitchReserved = new Set([
  "directory",
  "downloads",
  "jobs",
  "p",
  "payments",
  "search",
  "settings",
  "subscriptions",
  "turbo",
  "videos",
  "wallet",
  "inventory",
  "drops",
]);
/**
 * Twitch's official embed (player.twitch.tv / clips.twitch.tv) for a
 * channel, a past broadcast (twitch.tv/videos/<id>) or a clip. The player
 * names every page allowed to show it in `parent`.
 */
export function twitchEmbed(url: URL): string | null {
  const parents = twitchParents.map((p) => `parent=${p}`).join("&");
  const clipEmbed = (clip: string) =>
    `https://clips.twitch.tv/embed?clip=${clip}&${parents}`;
  if (url.hostname === "clips.twitch.tv") {
    const clip = url.pathname.match(/^\/([A-Za-z0-9_-]{4,100})\/?$/)?.[1];
    return clip ? clipEmbed(clip) : null;
  }
  if (!["twitch.tv", "www.twitch.tv", "m.twitch.tv"].includes(url.hostname))
    return null;
  const video = url.pathname.match(/^\/videos\/(\d{1,12})\/?$/)?.[1];
  if (video) return `https://player.twitch.tv/?video=v${video}&${parents}`;
  const clip = url.pathname.match(
    /^\/[A-Za-z0-9_]{3,25}\/clip\/([A-Za-z0-9_-]{4,100})\/?$/,
  )?.[1];
  if (clip) return clipEmbed(clip);
  const channel = url.pathname.match(/^\/([A-Za-z0-9_]{3,25})\/?$/)?.[1];
  if (channel && !twitchReserved.has(channel.toLowerCase()))
    return `https://player.twitch.tv/?channel=${channel.toLowerCase()}&${parents}`;
  return null;
}
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
  // VK's player API (postMessage: play, pause, seek, state and time), for
  // the shared timeline; https://vk.com/js/api/videoplayer.js.
  embed.searchParams.set("js_api", "1");
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
