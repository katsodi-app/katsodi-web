// Server-side only. Spotify's public embed pages (open.spotify.com/embed/…)
// carry the same data their widget shows: a playlist's or album's track
// list, a track's title, artists, cover and length. Katsodi reads them when
// the Spotify Web API keys are not configured. The page's format is not a
// documented API and may change; every field is checked and bounded, and a
// change only turns into "nothing found".
import { mediaDetailsSchema, type MediaDetails } from "../media";
import { inspectSource } from "../providers";
import { publicPlayerPage } from "./public-player-request";

export type SpotifyEmbedTrack = {
  id: string;
  title: string;
  artists: string;
  /** Seconds. */
  duration: number | null;
};
export type SpotifyEmbedEntity = {
  title: string;
  subtitle: string | null;
  cover: string | null;
  duration: number | null;
  tracks: SpotifyEmbedTrack[];
};

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : null;
const seconds = (ms: unknown) => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 && n <= 172800000
    ? Math.round(n / 1000)
    : null;
};

/** Reads the widget's data from an embed page's HTML (exported for tests). */
export function readSpotifyEmbed(html: string): SpotifyEmbedEntity | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) return null;
  let entity: Record<string, unknown>;
  try {
    entity = JSON.parse(match[1])?.props?.pageProps?.state?.data?.entity;
  } catch {
    return null;
  }
  if (!entity || typeof entity !== "object") return null;
  const title = text(entity.name ?? entity.title, 200);
  if (!title) return null;
  // Playlists and albums: coverArt.sources; tracks: visualIdentity.image
  // (largest first). Only Spotify's own image hosts.
  const sources =
    (entity.coverArt as { sources?: { url?: unknown }[] })?.sources ??
    (entity.visualIdentity as { image?: { url?: unknown }[] })?.image;
  const cover = Array.isArray(sources)
    ? (sources
        .map((s) => (typeof s?.url === "string" ? inspectSource(s.url) : null))
        .find(
          (s) =>
            !!s &&
            /^(?:i\.scdn\.co|[a-z0-9-]+\.spotifycdn\.com)$/.test(
              new URL(s.url).hostname,
            ),
        )?.url ?? null)
    : null;
  const artists = Array.isArray(
    (entity.artists as unknown[]) ?? (entity.authors as unknown[]),
  )
    ? ((entity.artists ?? entity.authors) as { name?: unknown }[])
        .map((a) => text(a?.name, 80))
        .filter(Boolean)
        .join(", ") || null
    : null;
  const tracks: SpotifyEmbedTrack[] = [];
  if (Array.isArray(entity.trackList))
    for (const raw of entity.trackList as Record<string, unknown>[]) {
      const id = String(raw?.uri ?? "").match(
        /^spotify:track:([A-Za-z0-9]{22})$/,
      )?.[1];
      const trackTitle = text(raw?.title, 200);
      if (!id || !trackTitle || raw?.isPlayable === false) continue;
      tracks.push({
        id,
        title: trackTitle,
        artists: text(raw?.subtitle, 120) ?? "",
        duration: seconds(raw?.duration),
      });
      if (tracks.length >= 300) break;
    }
  return {
    title,
    subtitle: text(entity.subtitle, 120) ?? artists,
    cover,
    duration: seconds(entity.duration),
    tracks,
  };
}

const cache = new Map<
  string,
  { until: number; entity: SpotifyEmbedEntity | null }
>();

/** One embed page, cached 10 minutes (1 minute for misses). */
export async function spotifyEmbedEntity(
  kind: "track" | "album" | "playlist",
  id: string,
): Promise<SpotifyEmbedEntity | null> {
  if (!/^[A-Za-z0-9]{22}$/.test(id)) return null;
  const key = `${kind}/${id}`;
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.entity;
  let entity: SpotifyEmbedEntity | null = null;
  try {
    const page = await publicPlayerPage(
      `https://open.spotify.com/embed/${key}`,
      Date.now() + 8000,
    );
    entity = readSpotifyEmbed(page.body);
  } catch {
    entity = null;
  }
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + (entity ? 600000 : 60000), entity });
  return entity;
}

/**
 * "Now playing" details of a track (with its artists, which oEmbed lacks),
 * a playlist or an album (with its cover and owner).
 */
export async function spotifyTrackDetails(
  id: string,
  kind: "track" | "playlist" | "album" = "track",
): Promise<MediaDetails | null> {
  const entity = await spotifyEmbedEntity(kind, id);
  if (!entity) return null;
  const parsed = mediaDetailsSchema.safeParse({
    title: entity.title,
    author: entity.subtitle,
    thumbnail: entity.cover,
    provider: "Spotify",
    duration: entity.duration,
  });
  return parsed.success ? parsed.data : null;
}
