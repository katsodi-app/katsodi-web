import { inspectSource } from "../providers";

export type OembedProvider = {
  name: string;
  hosts: string[];
  endpoint: string;
  /**
   * Hosts of the provider's own embed player. An iframe returned by the
   * provider's official endpoint on one of these hosts is embeddable by
   * definition, so it is used without fetching it server-side (some players,
   * like Dailymotion's, refuse non-browser requests).
   */
  players: string[];
};

/**
 * Official oEmbed endpoints for providers whose pages do not declare
 * <link rel="alternate" type="application/json+oembed"> in their server HTML.
 * Each endpoint was checked live on 2026-11-04 and returned a video/rich
 * iframe player. Hosts match exactly, as everywhere else in source inspection.
 * Sites that declare oEmbed themselves need no entry here.
 */
const providers: OembedProvider[] = [
  {
    // Used for media details; YouTube players are recognized before discovery.
    name: "YouTube",
    hosts: ["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"],
    endpoint: "https://www.youtube.com/oembed",
    players: ["www.youtube.com"],
  },
  {
    name: "Dailymotion",
    hosts: ["www.dailymotion.com", "dailymotion.com", "dai.ly"],
    endpoint: "https://www.dailymotion.com/services/oembed",
    players: ["geo.dailymotion.com", "www.dailymotion.com"],
  },
  {
    name: "Vimeo",
    hosts: ["vimeo.com", "www.vimeo.com"],
    endpoint: "https://vimeo.com/api/oembed.json",
    players: ["player.vimeo.com"],
  },
  {
    name: "SoundCloud",
    hosts: ["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"],
    endpoint: "https://soundcloud.com/oembed",
    players: ["w.soundcloud.com"],
  },
  {
    name: "Rutube",
    hosts: ["rutube.ru", "www.rutube.ru"],
    endpoint: "https://rutube.ru/api/oembed/",
    players: ["rutube.ru"],
  },
];

/** The provider and its oEmbed request URL for a page, or null. */
export function knownOembed(
  input: string,
): { request: string; provider: OembedProvider } | null {
  const source = inspectSource(input);
  if (!source) return null;
  const url = new URL(source.url);
  url.hash = "";
  const provider = providers.find((p) => p.hosts.includes(url.hostname));
  if (!provider) return null;
  const request = new URL(provider.endpoint);
  request.searchParams.set("url", url.href);
  request.searchParams.set("format", "json");
  return { request: request.href, provider };
}
