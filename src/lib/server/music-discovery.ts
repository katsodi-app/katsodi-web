import "server-only";
import { cache } from "react";
import bundled from "@/data/music-discovery.json";
import collectionBundle from "@/data/music-collections.json";
import { collectionsSchema } from "@/lib/music-collections";
import { musicChart, musicTrack, musicNeighbours } from "@/lib/music";
import { currentViewer } from "@/lib/supabase/server";
import {
  chartProviders,
  discoveryChartSchema,
  discoveryChartsSchema,
  mostPlayedChartSchema,
  type DiscoveryChart,
} from "@/lib/music-discovery";

/** Public ranking snapshots only. No provider calls on page requests. */
export const musicLibraryData = cache(async () => {
  const fallback = discoveryChartsSchema.parse(bundled);
  const collections = collectionsSchema.parse(collectionBundle);
  const stale = (charts: DiscoveryChart[]) =>
    charts.map((chart): DiscoveryChart =>
      chart.checked && Date.now() - Date.parse(chart.checked) > 8 * 86400000
        ? { ...chart, status: "stale" }
        : chart,
    );
  try {
    const { client } = await currentViewer();
    if (!client)
      return { chart: musicChart, charts: stale(fallback), collections };
    const result = await client
      .from("music_chart_snapshots")
      .select("payload")
      .abortSignal(AbortSignal.timeout(3000));
    if (result.error)
      return { chart: musicChart, charts: stale(fallback), collections };
    const mostPlayed = mostPlayedChartSchema.safeParse(
      result.data?.find((row) => row.payload?.provider === "spotify-all-time")
        ?.payload,
    );
    return {
      chart: mostPlayed.success ? mostPlayed.data : musicChart,
      collections: (() => {
        const parsed = collectionsSchema.safeParse(
          result.data?.find(
            (row) => row.payload?.provider === "spotify-all-time",
          )?.payload?.collections,
        );
        return parsed.success ? parsed.data : collections;
      })(),
      charts: stale(
        chartProviders.flatMap((provider) => {
          const parsed = discoveryChartSchema.safeParse(
            result.data?.find((row) => row.payload?.provider === provider)
              ?.payload,
          );
          const chart = parsed.success
            ? parsed.data
            : fallback.find((entry) => entry.provider === provider);
          return chart ? [chart] : [];
        }),
      ),
    };
  } catch {
    return { chart: musicChart, charts: stale(fallback), collections };
  }
});
export const currentMusicTrack = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return null;
  const { chart } = await musicLibraryData();
  const index = chart.tracks.findIndex((track) => track.slug === slug);
  if (index < 0) {
    const track = musicTrack(slug);
    return track ? { track, ...musicNeighbours(slug) } : null;
  }
  const link = (position: number) => {
    const track = chart.tracks[position];
    return track
      ? { slug: track.slug, rank: track.rank, title: track.title }
      : null;
  };
  return {
    track: chart.tracks[index],
    previous: link(index - 1),
    next: link(index + 1),
  };
});
