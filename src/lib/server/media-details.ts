import { readOembedDetails, type MediaDetails } from "../media";
import { inspectSource } from "../providers";
import { spotifyTrackDetails } from "./spotify-embed";
import { knownOembed } from "./oembed-providers";
import { publicPlayerPage } from "./public-player-request";

const cache = new Map<
  string,
  { until: number; details: MediaDetails | null }
>();
const pending = new Map<string, Promise<MediaDetails | null>>();

/**
 * Title, author, cover and (where offered) duration for a room source, from
 * the provider's official oEmbed endpoint only. Uses the same pinned public
 * fetcher as player discovery. Cached 10 minutes (1 minute for misses).
 */
export async function mediaDetails(url: string): Promise<MediaDetails | null> {
  // A Spotify track: its widget names the artists (Spotify's oEmbed does not).
  // Playlists and albums likewise get their cover and owner from the widget.
  const spotify = inspectSource(url)?.url.match(
    /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|playlist|album)\/([A-Za-z0-9]{22})\/?$/,
  );
  if (spotify) {
    const details = await spotifyTrackDetails(
      spotify[2],
      spotify[1] as "track" | "playlist" | "album",
    );
    if (details) return details;
  }
  const official = knownOembed(url);
  if (!official) return null;
  const key = official.request;
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.details;
  const underway = pending.get(key);
  if (underway) return underway;
  const lookup = (async () => {
    try {
      const document = await publicPlayerPage(
        official.request,
        Date.now() + 8000,
        0,
        "json",
      );
      return readOembedDetails(
        JSON.parse(document.body),
        official.provider.name,
      );
    } catch {
      return null;
    }
  })();
  pending.set(key, lookup);
  try {
    const details = await lookup;
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, {
      until: Date.now() + (details ? 600000 : 60000),
      details,
    });
    return details;
  } finally {
    pending.delete(key);
  }
}
