import { parse } from "parse5";
export { mostPlayedChartSchema } from "@/lib/music-discovery";
export { collectionsSchema } from "@/lib/music-collections";
import { soundcloudPlaylist } from "./soundcloud-api";
import {
  chartProviders,
  chartSources,
  discoveryChartSchema,
  musicRoomSource,
  safeMusicCover,
  sharpMusicCover,
  type ChartProvider,
  type DiscoveryChart,
  type DiscoveryTrack,
} from "@/lib/music-discovery";

type HtmlNode = {
  nodeName: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: HtmlNode[];
};
const attr = (node: HtmlNode, name: string) =>
  node.attrs?.find((a) => a.name === name)?.value || "";
const text = (node: HtmlNode): string =>
  (node.value || (node.childNodes || []).map(text).join(""))
    .replace(/\s+/g, " ")
    .trim();
function find(
  node: HtmlNode,
  predicate: (node: HtmlNode) => boolean,
): HtmlNode[] {
  return [
    ...(predicate(node) ? [node] : []),
    ...(node.childNodes || []).flatMap((child) => find(child, predicate)),
  ];
}
const number = (value: string) =>
  /^\d[\d,]*$/.test(value) ? Number(value.replaceAll(",", "")) : null;

export function parseKworbChart(
  html: string,
  provider: "spotify" | "youtube",
): { tracks: DiscoveryTrack[]; period: string | null } {
  const doc = parse(html) as HtmlNode;
  const tracks: DiscoveryTrack[] = [];
  const seen = new Set<string>();
  for (const row of find(doc, (node) => node.nodeName === "tr")) {
    const cells = (row.childNodes || []).filter(
      (node) => node.nodeName === "td",
    );
    if (!cells.length || !number(text(cells[0]))) continue;
    const rank = number(text(cells[0]))!;
    if (rank > 150) break;
    const links = find(row, (node) => node.nodeName === "a");
    const link = links.find((node) =>
      provider === "spotify"
        ? /\/track\/[A-Za-z0-9]{22}\.html/.test(attr(node, "href"))
        : /(?:watch\?v=|video\/)[\w-]{11}/.test(attr(node, "href")),
    );
    if (!link) continue;
    const href = attr(link, "href");
    const id =
      provider === "spotify"
        ? href.match(/\/track\/([A-Za-z0-9]{22})\.html/)?.[1]
        : href.match(/(?:watch\?v=|video\/)([\w-]{11})/)?.[1];
    if (!id || seen.has(id)) continue;
    const label = text(link);
    const titleCell = cells.find((node) =>
      attr(node, "class").split(" ").includes("text"),
    );
    const artistLinks = links.filter((node) =>
      /\/artist\//.test(attr(node, "href")),
    );
    const artists = artistLinks.map(text);
    let title = label;
    if (provider === "spotify" && !artists.length && label.includes(" - ")) {
      const cut = label.indexOf(" - ");
      artists.push(label.slice(0, cut));
      title = label.slice(cut + 3);
    }
    if (provider === "spotify" && !artists.length && titleCell) {
      const value = text(titleCell);
      const cut = value.indexOf(" - ");
      if (cut > 0) artists.push(value.slice(0, cut));
    }
    if (!title || (provider === "spotify" && !artists.length)) continue;
    // Metric columns differ by provider; resolve by their published headings.
    const headings = find(doc, (node) => node.nodeName === "th").map(text);
    const metric = headings.findIndex((value) =>
      provider === "spotify"
        ? value === "Streams"
        : /^(Views|Weekly Views)$/i.test(value),
    );
    const url =
      provider === "spotify"
        ? `https://open.spotify.com/track/${id}`
        : `https://www.youtube.com/watch?v=${id}`;
    tracks.push({
      id: `${provider}:${id}`,
      rank,
      title,
      artists: [...new Set(artists)],
      url,
      cover:
        provider === "youtube"
          ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
          : null,
      plays: metric >= 0 && cells[metric] ? number(text(cells[metric])) : null,
    });
    seen.add(id);
    if (tracks.length === 150) break;
  }
  const dates = text(doc).match(/20\d\d\/\d\d\/\d\d/g);
  return {
    tracks,
    period: dates ? [...new Set(dates)].slice(0, 2).join(" – ") : null,
  };
}

/**
 * kworb's all-time most viewed music videos: rows in rank order without a
 * rank column, "Artist - Title" labels and a total Views column.
 */
export function parseKworbTopVideos(html: string): DiscoveryTrack[] {
  const doc = parse(html) as HtmlNode;
  const tracks: DiscoveryTrack[] = [];
  const seen = new Set<string>();
  for (const row of find(doc, (node) => node.nodeName === "tr")) {
    const cells = (row.childNodes || []).filter(
      (node) => node.nodeName === "td",
    );
    if (cells.length < 2) continue;
    const link = find(row, (node) => node.nodeName === "a").find((node) =>
      /video\/[\w-]{11}\.html/.test(attr(node, "href")),
    );
    const id =
      link && attr(link, "href").match(/video\/([\w-]{11})\.html/)?.[1];
    if (!link || !id || seen.has(id)) continue;
    const label = text(link);
    const cut = label.indexOf(" - ");
    const artists = cut > 0 ? [label.slice(0, cut)] : [];
    const title = cut > 0 ? label.slice(cut + 3) : label;
    if (!title) continue;
    seen.add(id);
    tracks.push({
      id: `youtube:${id}`,
      rank: tracks.length + 1,
      title,
      artists,
      url: `https://www.youtube.com/watch?v=${id}`,
      cover: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      plays: number(text(cells[1])),
    });
    if (tracks.length === 150) break;
  }
  return tracks;
}

/** Fetches with a timeout; null on any failure. */
async function probe(url: string, method: "GET" | "HEAD") {
  try {
    const response = await fetch(url, {
      method,
      headers: { "User-Agent": "KatsodiChartRefresh/1.0" },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
      cache: "no-store",
    });
    return response.ok ? response : null;
  } catch {
    return null;
  }
}
/** A few requests at a time, in order. */
async function inBatches<T, R>(
  items: T[],
  size: number,
  work: (item: T) => Promise<R>,
) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(...(await Promise.all(items.slice(i, i + size).map(work))));
  return out;
}
/**
 * Large covers: YouTube's 1280 px frame where the video has one (otherwise
 * the 480 px one), and Spotify album art through Spotify's public oEmbed
 * endpoint (no key), upgraded from 300 to 640 px.
 */
export async function enrichCovers(
  provider: ChartProvider,
  tracks: DiscoveryTrack[],
): Promise<DiscoveryTrack[]> {
  if (provider === "youtube")
    return inBatches(tracks, 8, async (track) => {
      const id = track.url.match(/v=([\w-]{11})/)?.[1];
      if (!id) return track;
      const large = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
      return (await probe(large, "HEAD")) ? { ...track, cover: large } : track;
    });
  if (provider === "spotify")
    return inBatches(tracks, 6, async (track) => {
      if (track.cover) return track;
      const answer = await probe(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(track.url)}`,
        "GET",
      );
      const body = answer ? await answer.json().catch(() => null) : null;
      const cover = sharpMusicCover(
        typeof body?.thumbnail_url === "string" ? body.thumbnail_url : null,
      );
      return cover ? { ...track, cover } : track;
    });
  return tracks;
}

/** Reads only data the public HTML exposes. No client IDs, hidden APIs or challenge bypasses. */
export function parseSoundcloudChart(html: string): DiscoveryTrack[] {
  const match = html.match(/window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    const hydration: unknown = JSON.parse(match[1]);
    if (!Array.isArray(hydration)) return [];
    const playlist = hydration.find(
      (entry) => entry?.hydratable === "playlist",
    )?.data;
    if (!Array.isArray(playlist?.tracks) || playlist.sharing !== "public")
      return [];
    return playlist.tracks
      .slice(0, 150)
      .flatMap((entry: Record<string, unknown>, index: number) => {
        const url =
          typeof entry.permalink_url === "string"
            ? musicRoomSource(entry.permalink_url)
            : null;
        const user = entry.user as { username?: string } | undefined;
        if (
          !url ||
          typeof entry.title !== "string" ||
          !user?.username ||
          entry.public !== true
        )
          return [];
        return [
          {
            id: `soundcloud:${String(entry.id)}`,
            rank: index + 1,
            title: entry.title,
            artists: [user.username],
            url,
            cover: safeMusicCover(entry.artwork_url),
            plays:
              typeof entry.playback_count === "number"
                ? entry.playback_count
                : null,
          },
        ];
      });
  } catch {
    return [];
  }
}

async function readPublicPage(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "KatsodiChartRefresh/1.0", Accept: "text/html" },
    signal: AbortSignal.timeout(20000),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) throw Error("source_unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw Error("empty_response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 3_000_000) {
      await reader.cancel();
      throw Error("response_too_large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
export async function refreshMusicCharts(
  previous: unknown[] = [],
  now = new Date(),
): Promise<DiscoveryChart[]> {
  const attempted = now.toISOString();
  const verifiedPrevious = previous.flatMap((candidate) => {
    const parsed = discoveryChartSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
  return Promise.all(
    chartProviders.map(
      async (provider: ChartProvider): Promise<DiscoveryChart> => {
        const base = { provider, ...chartSources[provider], attempted };
        try {
          const html = await readPublicPage(base.source).catch((error) => {
            if (provider === "soundcloud") return "";
            throw error;
          });
          const parsed =
            provider === "youtube"
              ? { tracks: parseKworbTopVideos(html), period: null }
              : provider === "spotify"
                ? parseKworbChart(html, provider)
                : {
                    tracks:
                      provider === "soundcloud"
                        ? parseSoundcloudChart(html)
                        : [],
                    period: null,
                  };
          if (provider === "soundcloud") {
            const playlist = await soundcloudPlaylist(base.source).catch(
              () => null,
            );
            if (playlist?.tracks.length)
              parsed.tracks = playlist.tracks
                .slice(0, 150)
                .flatMap((track, index) =>
                  track.title && track.user?.username
                    ? [
                        {
                          id: `soundcloud:${track.id}`,
                          rank: index + 1,
                          title: track.title,
                          artists: [track.user.username],
                          url: track.permalink_url!,
                          cover: safeMusicCover(track.artwork_url),
                          plays: track.playback_count ?? null,
                        },
                      ]
                    : [],
                );
          }
          // TikTok currently serves an application shell without a public song list.
          // Do not invent entries or call protected endpoints when that happens.
          if (!parsed.tracks.length) throw Error("no_public_tracks");
          parsed.tracks = await enrichCovers(provider, parsed.tracks);
          if (
            (provider === "spotify" || provider === "youtube") &&
            parsed.tracks.length !== 150
          )
            throw Error("incomplete_chart");
          const old = verifiedPrevious.find(
            (chart) => chart.provider === provider,
          );
          if (
            provider === "soundcloud" &&
            old &&
            old.tracks.length > parsed.tracks.length
          )
            throw Error("incomplete_chart");
          return discoveryChartSchema.parse({
            ...base,
            checked: attempted,
            period: parsed.period,
            status: parsed.tracks.length === 150 ? "ready" : "partial",
            tracks: parsed.tracks,
          });
        } catch {
          const old = verifiedPrevious.find(
            (chart) => chart.provider === provider && chart.tracks.length,
          );
          return {
            ...base,
            checked: old?.checked || null,
            period: old?.period || null,
            status: old ? "stale" : "unavailable",
            tracks: old?.tracks || [],
          };
        }
      },
    ),
  );
}
