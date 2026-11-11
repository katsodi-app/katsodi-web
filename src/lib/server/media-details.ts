import { readOembedDetails, type MediaDetails } from "../media";
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
