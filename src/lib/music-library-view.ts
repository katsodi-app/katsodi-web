import type { DiscoveryChart, DiscoveryTrack } from "./music-discovery";
import type { MusicCollections } from "./music-collections";
import type { MusicTrack } from "./music-format";

type ChartTrack = Pick<
  MusicTrack,
  "rank" | "slug" | "title" | "artists" | "streams" | "thumb" | "spotifyId"
>;
type Collection = {
  checked: string;
  tracks: (DiscoveryTrack & { duration: number })[];
};
export type MusicLibraryView = {
  chart: { source: string; checked: string; tracks: ChartTrack[] };
  charts: Pick<
    DiscoveryChart,
    "provider" | "source" | "scope" | "period" | "status" | "checked" | "tracks"
  >[];
  collections: { popular: Collection; trending: Collection };
};

/** Project validated server snapshots at the RSC boundary. Research provenance
 * stays in the source snapshots; it is never needed for client rendering. */
export function musicLibraryView(data: {
  chart: { source: string; checked: string; tracks: MusicTrack[] };
  charts: DiscoveryChart[];
  collections: MusicCollections;
}): MusicLibraryView {
  const track = ({
    id,
    rank,
    title,
    artists,
    url,
    cover,
    plays,
  }: DiscoveryTrack): DiscoveryTrack => ({
    id,
    rank,
    title,
    artists,
    url,
    cover,
    plays,
  });
  const collection = (value: MusicCollections["popular"]): Collection => ({
    checked: value.checked,
    tracks: value.tracks.map((t) => ({ ...track(t), duration: t.duration })),
  });
  return {
    chart: {
      source: data.chart.source,
      checked: data.chart.checked,
      tracks: data.chart.tracks.map(
        ({ rank, slug, title, artists, streams, thumb, spotifyId }) => ({
          rank,
          slug,
          title,
          artists,
          streams,
          thumb,
          spotifyId,
        }),
      ),
    },
    charts: data.charts
      .filter((c) => c.provider === "spotify" || c.provider === "youtube")
      .map(({ provider, source, scope, period, status, checked, tracks }) => ({
        provider,
        source,
        scope,
        period,
        status,
        checked,
        tracks: tracks.map(track),
      })),
    collections: {
      popular: collection(data.collections.popular),
      trending: collection(data.collections.trending),
    },
  };
}
