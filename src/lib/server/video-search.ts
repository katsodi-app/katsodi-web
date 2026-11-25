/**
 * Universal video search for the desktop app's search (Ctrl+K): videos from
 * the platforms a room can play, found by words. No platform keys:
 *
 * - YouTube: its public results page, read for the `ytInitialData` it embeds
 *   (videoRenderer entries only: no shorts, channels or playlists).
 * - Rutube: its public search API (rutube.ru/api/search/video).
 *
 * VK's video.search needs a user token (a service token is refused), so VK is
 * not searched. Every source has its own time limit; one failing never fails
 * the others. Results are cached for five minutes per query.
 */

export type VideoHit = {
  source: "youtube" | "rutube";
  /** The page a room plays (a watch link the providers recognise). */
  url: string;
  title: string;
  author: string;
  /** https thumbnail on the platform's own image host, or "". */
  cover: string;
  /** Seconds; 0 when unknown or live. */
  duration: number;
  live: boolean;
};

const LIMIT = 12;
const cache = new Map<string, { until: number; hits: VideoHit[] }>();

/** "1:02:03" / "12:34" -> seconds; anything else -> 0. */
export function clockSeconds(text: unknown): number {
  if (typeof text !== "string") return 0;
  const parts = text.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p)))
    return 0;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

function httpsImage(value: unknown, hosts: RegExp): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.test(url.hostname) ? url.href : "";
  } catch {
    return "";
  }
}

type Renderer = {
  videoId?: unknown;
  title?: { runs?: { text?: unknown }[]; simpleText?: unknown };
  ownerText?: { runs?: { text?: unknown }[] };
  lengthText?: { simpleText?: unknown };
  thumbnail?: { thumbnails?: { url?: unknown }[] };
  badges?: { metadataBadgeRenderer?: { style?: unknown } }[];
};

/** The video entries of a YouTube results page's ytInitialData (pure, for tests). */
export function youtubeHits(html: string): VideoHit[] {
  const start = html.indexOf("var ytInitialData = ");
  if (start < 0) return [];
  const end = html.indexOf(";</script>", start);
  if (end < 0) return [];
  let data: unknown;
  try {
    data = JSON.parse(html.slice(start + "var ytInitialData = ".length, end));
  } catch {
    return [];
  }
  const found: Renderer[] = [];
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 40 || found.length >= LIMIT * 2) return;
    const record = node as Record<string, unknown>;
    if (record.videoRenderer && typeof record.videoRenderer === "object") {
      found.push(record.videoRenderer as Renderer);
      return;
    }
    for (const value of Object.values(record)) walk(value, depth + 1);
  };
  walk(data, 0);
  const hits: VideoHit[] = [];
  for (const video of found) {
    const id = typeof video.videoId === "string" ? video.videoId : "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
    const title = clean(video.title?.runs?.map((r) => r.text).join("") ?? video.title?.simpleText, 200);
    if (!title) continue;
    const length = clockSeconds(video.lengthText?.simpleText);
    const live = !length && !!video.badges?.some((b) => String(b.metadataBadgeRenderer?.style).includes("LIVE"));
    hits.push({
      source: "youtube",
      url: `https://www.youtube.com/watch?v=${id}`,
      title,
      author: clean(video.ownerText?.runs?.[0]?.text, 120),
      cover: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: length,
      live,
    });
    if (hits.length >= LIMIT) break;
  }
  return hits;
}

type RutubeResult = {
  id?: unknown;
  title?: unknown;
  duration?: unknown;
  thumbnail_url?: unknown;
  author?: { name?: unknown };
  is_adult?: unknown;
  is_livestream?: unknown;
};

/** Rutube search API results (pure, for tests). Adult videos are left out. */
export function rutubeHits(body: unknown): VideoHit[] {
  const results = (body as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const hits: VideoHit[] = [];
  for (const item of results as RutubeResult[]) {
    const id = typeof item.id === "string" ? item.id.toLowerCase() : "";
    if (!/^[0-9a-f]{32}$/.test(id) || item.is_adult === true) continue;
    const title = clean(item.title, 200);
    if (!title) continue;
    const duration = Number(item.duration);
    hits.push({
      source: "rutube",
      url: `https://rutube.ru/video/${id}/`,
      title,
      author: clean(item.author?.name, 120),
      cover: httpsImage(item.thumbnail_url, /(^|\.)(rtbcdn\.ru|rutube\.ru)$/),
      duration: Number.isFinite(duration) && duration > 0 && duration < 172800 ? Math.round(duration) : 0,
      live: item.is_livestream === true,
    });
    if (hits.length >= LIMIT) break;
  }
  return hits;
}

async function youtube(query: string): Promise<VideoHit[]> {
  const response = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ru&gl=RU`,
    {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: "text/html",
        "Accept-Language": "ru,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      },
    },
  );
  if (!response.ok) return [];
  const html = await response.text();
  return html.length > 6 * 1024 * 1024 ? [] : youtubeHits(html);
}

async function rutube(query: string): Promise<VideoHit[]> {
  const response = await fetch(
    `https://rutube.ru/api/search/video/?query=${encodeURIComponent(query)}`,
    {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json", "Accept-Language": "ru,en;q=0.8" },
    },
  );
  if (!response.ok) return [];
  return rutubeHits(await response.json());
}

/** Videos for `query` from every source, interleaved so each shows up early. */
export async function searchVideos(query: string): Promise<VideoHit[]> {
  const key = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return [];
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return cached.hits;
  const lists = await Promise.all(
    [youtube(key), rutube(key)].map((search) => search.catch(() => [] as VideoHit[])),
  );
  const hits: VideoHit[] = [];
  for (let i = 0; hits.length < LIMIT * 2 && lists.some((list) => i < list.length); i++)
    for (const list of lists) if (i < list.length) hits.push(list[i]);
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 5 * 60 * 1000, hits });
  return hits;
}
