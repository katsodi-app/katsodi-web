import { z } from "zod";
import { inspectSource, youtubeVideoId } from "./providers";

/** Server-authoritative shared timeline, as returned by get_room_playback. */
export const playbackSchema = z.object({
  state: z.enum(["playing", "paused"]),
  position: z.number().finite().min(0).max(172800),
  updated_at: z.string(),
  source_url: z.string(),
});
export type PlaybackState = z.infer<typeof playbackSchema>;

/** Followers re-seek when they drift further than this from the host. */
export const DRIFT_TOLERANCE = 1.5;

/**
 * Only providers with an official player API can be synchronized. YouTube is
 * the first; everything else keeps independent playback.
 */
export function syncableVideoId(url: string): string | null {
  const source = inspectSource(url);
  return source ? youtubeVideoId(new URL(source.url)) : null;
}

/**
 * The synced-player adapter for a room source, by the exact host of the page
 * the room links to. YouTube, Vimeo and SoundCloud expose official player
 * APIs with play/pause/seek; other providers keep independent playback.
 */
export function syncSource(
  url: string,
): "youtube" | "vimeo" | "soundcloud" | null {
  if (syncableVideoId(url)) return "youtube";
  const source = inspectSource(url);
  if (!source) return null;
  const host = new URL(source.url).hostname;
  if (["vimeo.com", "www.vimeo.com"].includes(host)) return "vimeo";
  if (
    ["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(
      host,
    ) &&
    /^\/[^/]+\/[^/]+\/?$/.test(new URL(source.url).pathname)
  )
    return "soundcloud";
  return null;
}

/**
 * Where the shared timeline is now, from a state received `elapsedMs` ago.
 * The server already extrapolated `position` to its response time.
 */
export function expectedPosition(state: PlaybackState, elapsedMs: number) {
  return state.state === "playing"
    ? state.position + Math.max(0, elapsedMs) / 1000
    : state.position;
}

/** True when a local player must seek to rejoin the shared timeline. */
export function drifted(local: number, expected: number) {
  return Math.abs(local - expected) > DRIFT_TOLERANCE;
}
