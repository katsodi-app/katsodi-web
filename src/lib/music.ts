import chart from "@/data/music-top150.json";
import type { MusicTrack, MusicTrackLink } from "./music-format";

export * from "./music-format";

export const musicChart = chart as {
  source: string;
  checked: string;
  tracks: MusicTrack[];
};
export const musicTracks = musicChart.tracks;

export function musicTrack(slug: string) {
  return musicTracks.find((track) => track.slug === slug);
}

const link = (track?: MusicTrack): MusicTrackLink | null =>
  track ? { slug: track.slug, rank: track.rank, title: track.title } : null;

/** The tracks before and after `slug` in the chart, for the pager. */
export function musicNeighbours(slug: string) {
  const index = musicTracks.findIndex((track) => track.slug === slug);
  return {
    previous: link(musicTracks[index - 1]),
    next: link(musicTracks[index + 1]),
  };
}
