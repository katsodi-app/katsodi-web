// Builds src/data/music-top150.json: the 150 most-streamed songs of all time
// on Spotify, each verified against official sources.
//   1. Ranking and stream counts: kworb.net/spotify/songs.html.
//   2. Spotify track id: the lead artist's kworb page (row with the same title
//      and the same stream count).
//   3. Title, artists, release date, cover: Spotify's own embed page for that
//      id (open.spotify.com/embed/track/<id>), title must match.
//   4. SoundCloud: an artist account whose profile name equals the artist's,
//      then a track URL on that account whose oEmbed title matches. Tracks
//      without such a match get no SoundCloud URL (the UI offers a search).
// Usage: node scripts/build-music-chart.mjs [--limit=150]
import { writeFileSync } from "node:fs";

const limit = Number(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 150,
);
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 KatsodiMusicCheck/1.0";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, { json = false, tries = 3 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.8" },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!r.ok) return null;
      return json ? await r.json() : await r.text();
    } catch {
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const norm = (s) =>
  decode(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
// "Song (feat. X) - Remastered" -> "song"
const base = (title) =>
  norm(
    title
      .replace(/\s*[([].*?[)\]]/g, "")
      .replace(/\s+-\s+.*$/, "")
      .trim(),
  );
const slugify = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// 1. Ranking
const chart = await get("https://kworb.net/spotify/songs.html");
if (!chart) throw new Error("kworb chart unavailable");
const rows = [
  ...chart.matchAll(
    /<tr><td class="text"><div>(.*?)<\/div><\/td><td>([\d,]+)<\/td>/g,
  ),
]
  .slice(0, limit)
  .map((m, i) => {
    const text = decode(m[1].replace(/<[^>]+>/g, ""));
    const cut = text.indexOf(" - ");
    return {
      rank: i + 1,
      artist: text.slice(0, cut),
      title: text.slice(cut + 3),
      streams: Number(m[2].replace(/,/g, "")),
    };
  });
console.log(`chart rows: ${rows.length}`);

// 2. Artist ids and their song pages
const artistsHtml = await get("https://kworb.net/spotify/artists.html");
const artistIds = new Map(
  [
    ...artistsHtml.matchAll(
      /href="\/spotify\/artist\/([A-Za-z0-9]+)_songs\.html">([^<]+)</g,
    ),
  ].map((m) => [norm(m[2]), m[1]]),
);
const artistPages = new Map();
async function artistTracks(id) {
  if (!artistPages.has(id)) {
    await sleep(700);
    const html =
      (await get(`https://kworb.net/spotify/artist/${id}_songs.html`)) ?? "";
    artistPages.set(
      id,
      [
        ...html.matchAll(
          /open\.spotify\.com\/track\/([A-Za-z0-9]{22})"[^>]*>([^<]+)<\/a><\/div><\/td><td>([\d,]+)</g,
        ),
      ].map((m) => ({
        id: m[1],
        title: decode(m[2]),
        streams: Number(m[3].replace(/,/g, "")),
      })),
    );
  }
  return artistPages.get(id);
}

// 3. Spotify embed data
async function spotify(id) {
  const html = await get(`https://open.spotify.com/embed/track/${id}`);
  const m = html?.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!m) return null;
  const e = JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity;
  if (!e || e.type !== "track") return null;
  const images = e.visualIdentity?.image ?? [];
  const pick = (size) =>
    images.find((i) => i.maxWidth === size)?.url ?? images[0]?.url;
  return {
    title: e.title ?? e.name,
    artists: (e.artists ?? []).map((a) => a.name),
    released: e.releaseDate?.isoString?.slice(0, 10) ?? null,
    explicit: Boolean(e.isExplicit),
    cover: pick(640),
    thumb: pick(300),
  };
}

// 4. SoundCloud
const handles = new Map();
async function soundcloudHandle(artist) {
  if (handles.has(artist)) return handles.get(artist);
  const flat = slugify(artist).replace(/-/g, "");
  const dashed = slugify(artist);
  const guesses = [
    ...new Set([
      flat,
      dashed,
      dashed.replace(/-/g, "_"),
      `${flat}official`,
      `${flat}music`,
      `official${flat}`,
      `${flat}-official`,
      `the${flat}`,
      flat.replace(/^the/, ""),
    ]),
  ].filter((h) => h.length > 2);
  let found = null;
  for (const h of guesses) {
    const o = await get(
      `https://soundcloud.com/oembed?format=json&url=https://soundcloud.com/${h}`,
      { json: true },
    );
    await sleep(250);
    if (o && norm(o.author_name ?? o.title ?? "") === norm(artist)) {
      found = new URL(o.author_url).pathname.slice(1);
      break;
    }
  }
  handles.set(artist, found);
  return found;
}
async function soundcloud(artist, title) {
  const handle = await soundcloudHandle(artist);
  if (!handle) return null;
  const variants = [
    ...new Set([
      slugify(title),
      slugify(title.replace(/\s*[([].*?[)\]]/g, "")),
      slugify(title.replace(/\s+-\s+.*$/, "")),
      slugify(title.replace(/\s*[([].*?[)\]]/g, "").replace(/\s+-\s+.*$/, "")),
    ]),
  ].filter(Boolean);
  for (const v of variants) {
    for (const slug of [v, `${v}-1`]) {
      const url = `https://soundcloud.com/${handle}/${slug}`;
      const o = await get(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`,
        { json: true },
      );
      await sleep(250);
      if (!o) continue;
      const owner = new URL(o.author_url).pathname.slice(1);
      const t = norm(o.title.replace(/\s+by\s+[^]*$/i, ""));
      if (owner === handle && t.startsWith(base(title)))
        return { url, author: o.author_name };
    }
  }
  return null;
}

const today = new Date().toISOString().slice(0, 10);
const tracks = [];
const problems = [];
const slugs = new Set();
for (const row of rows) {
  const aid = artistIds.get(norm(row.artist));
  const list = aid ? await artistTracks(aid) : [];
  const match =
    list.find((t) => t.title === row.title && t.streams === row.streams) ??
    list.find((t) => norm(t.title) === norm(row.title)) ??
    // Same song, longer title on the artist page ("Sunflower - Spider-Man…").
    list.find(
      (t) => t.streams === row.streams && base(t.title) === base(row.title),
    );
  if (!match) {
    problems.push(`#${row.rank} ${row.artist} - ${row.title}: no Spotify id`);
    continue;
  }
  const sp = await spotify(match.id);
  await sleep(300);
  if (!sp || base(sp.title) !== base(row.title)) {
    problems.push(
      `#${row.rank} ${row.artist} - ${row.title}: Spotify title "${sp?.title}"`,
    );
    continue;
  }
  const sc = await soundcloud(row.artist, row.title);
  let slug = slugify(`${row.artist} ${base(row.title) || row.title}`);
  while (slugs.has(slug)) slug += "-2";
  slugs.add(slug);
  tracks.push({
    rank: row.rank,
    slug,
    title: sp.title,
    artists: sp.artists,
    released: sp.released,
    explicit: sp.explicit,
    streams: row.streams,
    cover: sp.cover,
    thumb: sp.thumb,
    spotifyId: match.id,
    soundcloud: sc,
    checked: today,
  });
  console.log(
    `#${row.rank} ${row.artist} - ${row.title} ${match.id} sc:${sc ? sc.url : "-"}`,
  );
}
if (tracks.length !== limit || new Set(tracks.map((track) => track.spotifyId)).size !== limit) {
  for (const problem of problems) console.error("PROBLEM", problem);
  throw Error(`Keeping the previous chart: only ${tracks.length}/${limit} tracks verified`);
}
writeFileSync(
  "src/data/music-top150.json",
  JSON.stringify(
    {
      source: "https://kworb.net/spotify/songs.html",
      checked: today,
      tracks,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `\n${tracks.length}/${rows.length} tracks, ${tracks.filter((t) => t.soundcloud).length} with SoundCloud`,
);
for (const p of problems) console.log("PROBLEM", p);
