import { z } from "zod";

export const chartProviders = [
  "spotify",
  "youtube",
  "soundcloud",
  "tiktok",
] as const;
export type ChartProvider = (typeof chartProviders)[number];
/** Only a playable, public track URL can become a room source. */
export function musicRoomSource(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    const host = url.hostname.replace(/^(www|music|m)\./, "");
    if (host === "youtube.com" || host === "youtu.be") {
      const id =
        host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
      return id && /^[\w-]{11}$/.test(id)
        ? `https://www.youtube.com/watch?v=${id}`
        : null;
    }
    const spotify = url.pathname.match(
      /^\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]{22})\/?$/,
    );
    if (url.hostname === "open.spotify.com" && spotify)
      return `https://open.spotify.com/track/${spotify[1]}`;
    if (
      host === "soundcloud.com" &&
      /^\/[^/]+\/[^/]+\/?$/.test(url.pathname) &&
      !/^\/(discover|charts|search|tags)\//.test(url.pathname)
    )
      return `https://soundcloud.com${url.pathname.replace(/\/$/, "")}`;
    return null;
  } catch {
    return null;
  }
}
export function safeMusicCover(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const url = new URL(input);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^(?:i\.scdn\.co|image-cdn-(?:fa|ak)\.spotifycdn\.com|i\.ytimg\.com|(?:i[0-9]+|[^.]+)\.sndcdn\.com)$/.test(
        url.hostname,
      )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export const discoveryTrackSchema = z.object({
  id: z.string().min(1).max(100),
  rank: z.number().int().min(1).max(150),
  title: z.string().min(1).max(500),
  artists: z.array(z.string().max(200)).max(20),
  url: z.string().refine((value) => musicRoomSource(value) !== null),
  cover: z
    .string()
    .nullable()
    .refine((value) => value === null || safeMusicCover(value) !== null),
  plays: z.number().int().nonnegative().nullable(),
});
export const discoveryChartSchema = z
  .object({
    provider: z.enum(chartProviders),
    source: z.string().url(),
    scope: z.enum(["global", "US"]),
    checked: z.string().datetime().nullable(),
    attempted: z.string().datetime(),
    period: z.string().max(80).nullable(),
    status: z.enum(["ready", "partial", "unavailable", "stale"]),
    tracks: z.array(discoveryTrackSchema).max(150),
  })
  .refine(
    (chart) =>
      chart.source === chartSources[chart.provider].source &&
      chart.scope === chartSources[chart.provider].scope &&
      new Set(chart.tracks.map((track) => track.id)).size ===
        chart.tracks.length,
    { message: "invalid_chart_source" },
  );
export const discoveryChartsSchema = z.array(discoveryChartSchema).max(4);
export type DiscoveryTrack = z.infer<typeof discoveryTrackSchema>;
export type DiscoveryChart = z.infer<typeof discoveryChartSchema>;
export const mostPlayedChartSchema = z
  .object({
    source: z.literal("https://kworb.net/spotify/songs.html"),
    checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tracks: z
      .array(
        z.object({
          rank: z.number().int().min(1).max(150),
          slug: z.string().regex(/^[a-z0-9-]{1,160}$/),
          title: z.string().min(1).max(300),
          artists: z.array(z.string().min(1).max(200)).min(1).max(20),
          released: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable(),
          explicit: z.boolean(),
          streams: z.number().int().nonnegative(),
          cover: z.string().refine((url) => safeMusicCover(url) !== null),
          thumb: z.string().refine((url) => safeMusicCover(url) !== null),
          spotifyId: z.string().regex(/^[A-Za-z0-9]{22}$/),
          soundcloud: z
            .object({
              url: z
                .string()
                .refine(
                  (url) =>
                    musicRoomSource(url)?.startsWith(
                      "https://soundcloud.com/",
                    ) === true,
                ),
              author: z.string().min(1).max(200),
            })
            .nullable(),
          checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .length(150),
  })
  .refine(
    (chart) =>
      new Set(chart.tracks.map((track) => track.spotifyId)).size === 150 &&
      new Set(chart.tracks.map((track) => track.slug)).size === 150,
    { message: "duplicate_tracks" },
  );
export const chartSources: Record<
  ChartProvider,
  { source: string; scope: "global" | "US" }
> = {
  spotify: {
    source: "https://kworb.net/spotify/country/global_weekly.html",
    scope: "global",
  },
  youtube: { source: "https://kworb.net/youtube/weekly/", scope: "global" },
  soundcloud: {
    source: "https://soundcloud.com/music-charts-us/sets/all-music-genres",
    scope: "US",
  },
  tiktok: {
    source: "https://ads.tiktok.com/creative/creativeCenter/trends",
    scope: "global",
  },
};
