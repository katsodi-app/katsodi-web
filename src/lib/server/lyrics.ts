// Server-side only. Song lyrics from LRCLIB (https://lrclib.net), a free and
// open lyrics database: time-synced lines (LRC) when it has them, otherwise
// plain text. Only the track's title, artist and length are sent. Answers
// are cached for an hour (misses for ten minutes).

export type LyricLine = { time: number; text: string };
export type Lyrics = {
  synced: LyricLine[];
  plain: string | null;
  instrumental: boolean;
};

const AGENT = "Katsodi (https://katsodi.watch)";
const cache = new Map<string, { until: number; lyrics: Lyrics | null }>();

/** "[01:02.34] words" lines into seconds and text (exported for tests). */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [
      ...raw.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g),
    ];
    if (!stamps.length) continue;
    const text = raw
      .replace(/\[[^\]]*\]/g, "")
      .trim()
      .slice(0, 300);
    for (const stamp of stamps) {
      const time = Number(stamp[1]) * 60 + Number(stamp[2].replace(":", "."));
      if (Number.isFinite(time) && time >= 0 && time < 172800)
        lines.push({ time: Math.round(time * 100) / 100, text });
    }
    if (lines.length >= 1000) break;
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** The words a lyrics search matches on: no "(from …)", "(feat. …)", "[…]" (exported for tests). */
export function searchTitle(title: string): string {
  return title
    .replace(
      /\s*[([][^)\]]*(?:feat\.?|ft\.|from|prod\.?|remaster|version|live|edit)[^)\]]*[)\]]/gi,
      "",
    )
    .replace(/\s+-\s+(?:remaster|live|radio edit).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Record_ = {
  trackName?: unknown;
  artistName?: unknown;
  duration?: unknown;
  instrumental?: unknown;
  plainLyrics?: unknown;
  syncedLyrics?: unknown;
};

function fromRecord(record: Record_): Lyrics | null {
  const synced =
    typeof record.syncedLyrics === "string"
      ? parseLrc(record.syncedLyrics)
      : [];
  const plain =
    typeof record.plainLyrics === "string" && record.plainLyrics.trim()
      ? record.plainLyrics.trim().slice(0, 20000)
      : null;
  const instrumental = record.instrumental === true;
  return synced.length || plain || instrumental
    ? { synced, plain, instrumental }
    : null;
}

async function call(path: string, params: Record<string, string>) {
  const url = new URL(`https://lrclib.net/api/${path}`);
  for (const [key, value] of Object.entries(params))
    if (value) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { "User-Agent": AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

/** Lyrics for a track, or null when LRCLIB has none. */
export async function findLyrics(
  title: string,
  artist: string,
  duration: number,
): Promise<Lyrics | null> {
  const name = searchTitle(title).slice(0, 200);
  const who = artist.trim().slice(0, 120);
  if (!name) return null;
  const key = `${name.toLowerCase()}|${who.toLowerCase()}|${Math.round(duration)}`;
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.lyrics;
  let lyrics: Lyrics | null = null;
  try {
    // The exact record first (title, artist, length), then a search.
    const exact = who
      ? await call("get", {
          track_name: name,
          artist_name: who,
          ...(duration > 0 ? { duration: String(Math.round(duration)) } : {}),
        })
      : null;
    if (exact && typeof exact === "object")
      lyrics = fromRecord(exact as Record_);
    if (!lyrics) {
      const found = await call(
        "search",
        who ? { track_name: name, artist_name: who } : { q: name },
      );
      if (Array.isArray(found)) {
        // Synced first, then the closest length.
        const ranked = (found as Record_[])
          .slice(0, 20)
          .filter((r) => r && typeof r === "object")
          .sort((a, b) => {
            const sync =
              Number(typeof b.syncedLyrics === "string") -
              Number(typeof a.syncedLyrics === "string");
            if (sync) return sync;
            const da = Math.abs(Number(a.duration) - duration) || 0;
            const db = Math.abs(Number(b.duration) - duration) || 0;
            return da - db;
          });
        for (const record of ranked) {
          if (duration > 0 && Math.abs(Number(record.duration) - duration) > 8)
            continue;
          lyrics = fromRecord(record);
          if (lyrics) break;
        }
      }
    }
  } catch {
    lyrics = null;
  }
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + (lyrics ? 3600000 : 600000), lyrics });
  return lyrics;
}
