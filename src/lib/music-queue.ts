import { musicRoomSource, safeMusicCover } from "./music-discovery";
import type { MusicTrack } from "./music-format";

export type QueueTrack = {
  id: string;
  title: string;
  artists: string[];
  url: string;
  cover: string | null;
  duration?: number;
};
export function chartQueue(tracks: MusicTrack[]): QueueTrack[] {
  return tracks.map((track) => ({
    id: `spotify:${track.spotifyId}`,
    title: track.title,
    artists: track.artists,
    cover: track.thumb,
    url: `https://open.spotify.com/track/${track.spotifyId}`,
  }));
}
export function validQueue(tracks: QueueTrack[]) {
  return (
    tracks.length > 0 &&
    tracks.length <= 150 &&
    new Set(tracks.map((t) => t.id)).size === tracks.length &&
    tracks.every(
      (t) =>
        t.id &&
        t.title &&
        t.artists.length > 0 &&
        musicRoomSource(t.url) &&
        (!t.cover || safeMusicCover(t.cover)),
    )
  );
}
export function adjacentTrack(
  index: number,
  length: number,
  direction: number,
) {
  const next = index + direction;
  return next >= 0 && next < length ? next : null;
}
export function playbackProvider(
  url: string,
): "soundcloud" | "youtube" | "spotify" {
  return new URL(url).hostname.includes("soundcloud")
    ? "soundcloud"
    : new URL(url).hostname.includes("spotify")
      ? "spotify"
      : "youtube";
}
export function clockTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
