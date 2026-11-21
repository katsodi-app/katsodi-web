// Server-side only. A public SoundCloud set's page carries the set's data
// (its hydration JSON): the title, cover, owner and every track, the first
// few in full and the rest by id. Katsodi reads it when the SoundCloud API
// keys are not configured. Tracks known only by id are queued as
// https://api.soundcloud.com/tracks/<id>, an address SoundCloud's own player
// widget and oEmbed accept. The page's format is not a documented API; every
// field is checked and bounded, and a change only means "nothing found".
import { publicPlayerPage } from "./public-player-request";

export type SoundcloudSet = { title: string; urls: string[] };

/** The set's track links from its page HTML (exported for tests). */
export function readSoundcloudSet(html: string): SoundcloudSet | null {
  const match = html.match(
    /window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/,
  );
  if (!match) return null;
  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;
  const entry = data.find(
    (item) =>
      item && typeof item === "object" && item.hydratable === "playlist",
  ) as { data?: { title?: unknown; tracks?: unknown } } | undefined;
  const set = entry?.data;
  if (!set || typeof set.title !== "string" || !Array.isArray(set.tracks))
    return null;
  const urls: string[] = [];
  for (const raw of set.tracks as Record<string, unknown>[]) {
    if (!raw || typeof raw !== "object") continue;
    const link = typeof raw.permalink_url === "string" ? raw.permalink_url : "";
    if (/^https:\/\/soundcloud\.com\/[^/\s?#]+\/[^/\s?#]+$/.test(link))
      urls.push(link);
    else if (Number.isSafeInteger(raw.id) && Number(raw.id) > 0)
      urls.push(`https://api.soundcloud.com/tracks/${raw.id}`);
    if (urls.length >= 300) break;
  }
  return { title: set.title.trim().slice(0, 200), urls };
}

/** A public set's tracks, from its page; null when it cannot be read. */
export async function soundcloudSetFromPage(
  url: string,
): Promise<SoundcloudSet | null> {
  try {
    const page = await publicPlayerPage(url, Date.now() + 8000);
    return readSoundcloudSet(page.body);
  } catch {
    return null;
  }
}
