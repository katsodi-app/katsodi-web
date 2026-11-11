import fs from "node:fs";
const root = ".local/music-research";
const sets = {
  popular: ["liluzivert", "postmalone", "g59", "travisscott-2"],
  trending: [
    "2hollis",
    "buckshottt",
    "fakemink",
    "odetari",
    "lumiathena",
    "nettspend",
  ],
};
fs.mkdirSync(root, { recursive: true });
for (const slug of new Set(Object.values(sets).flat())) {
  const response = await fetch(
    "https://soundcloud.com/" + slug + "/popular-tracks",
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw Error("Artist index unavailable: " + slug);
  const html = await response.text();
  const urls = [
    ...new Set(
      [...html.matchAll(new RegExp('href="(/' + slug + '/[^"?]+)"', "g"))]
        .map((m) => "https://soundcloud.com" + m[1])
        .filter((u) => !/(likes|sets|tracks|comments|albums|reposts)$/.test(u)),
    ),
  ];
  fs.writeFileSync(root + "/" + slug + "-links.json", JSON.stringify(urls));
}
const candidates = new Map();
const add = (url, group, indexUrl, index) => {
  const key = url.split("?")[0];
  const old = candidates.get(key) || { url: key, groups: [], indexes: [] };
  if (!old.groups.includes(group)) old.groups.push(group);
  old.indexes.push({ url: indexUrl, rank: index });
  candidates.set(key, old);
};
const alltime = JSON.parse(fs.readFileSync("src/data/music-top150.json"));
for (const t of alltime.tracks)
  if (t.soundcloud) add(t.soundcloud.url, "popular", alltime.source, t.rank);
for (const [group, profiles] of Object.entries(sets))
  for (const slug of profiles) {
    const urls = JSON.parse(fs.readFileSync(`${root}/${slug}-links.json`));
    urls.forEach((url, i) =>
      add(url, group, `https://soundcloud.com/${slug}/popular-tracks`, i + 1),
    );
  }
const records = [];
let index = 0;
async function worker() {
  while (index < candidates.size) {
    const c = [...candidates.values()][index++];
    try {
      const response = await fetch(c.url, {
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();
      const d = JSON.parse(
        html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);/s)?.[1] || "[]",
      ).find((x) => x.hydratable === "sound")?.data;
      if (!d) continue;
      records.push({
        ...c,
        id: String(d.id),
        title: d.title,
        artists: [d.publisher_metadata?.artist || d.user?.username],
        url: d.permalink_url,
        cover: d.artwork_url,
        plays: d.playback_count,
        likes: d.likes_count,
        duration: Math.round(d.duration / 1000),
        policy: d.policy,
        streamable: d.streamable,
        embeddable: d.embeddable_by,
        public: d.public,
        released: d.created_at,
        uploader: d.user?.username,
        checked: new Date().toISOString(),
      });
    } catch {}
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
fs.writeFileSync(`${root}/records.json`, JSON.stringify(records, null, 2));
console.log("Candidates", candidates.size, "metadata", records.length);
for (const group of Object.keys(sets)) {
  const good = records.filter(
    (r) =>
      r.groups.includes(group) &&
      r.public &&
      r.policy === "ALLOW" &&
      r.streamable &&
      r.embeddable === "all" &&
      r.cover &&
      r.plays >= (group === "popular" ? 1000000 : 100000) &&
      !/(slowed|sped up|instrumental|remix|speed up)/i.test(r.title),
  );
  console.log(
    group,
    good.length,
    good.slice(0, 4).map((r) => [r.title, r.artists, r.plays]),
  );
}
// Final selection is based on current public artist-popular indexes and public
// play counts; it is a curated selection, never an official TikTok/global chart.
const usable = records.filter(
  (t) =>
    t.public &&
    t.policy === "ALLOW" &&
    t.streamable &&
    t.embeddable === "all" &&
    t.cover &&
    !/(slowed|sped up|instrumental|remix|speed up)/i.test(t.title),
);
const popular = usable
  .filter((t) => t.plays >= 1000000)
  .sort((a, b) => b.plays - a.plays)
  .slice(0, 100);
const groups = sets.trending.map((slug) =>
  usable
    .filter((t) => t.url.includes("/" + slug + "/") && t.plays >= 100000)
    .sort((a, b) => a.indexes[0].rank - b.indexes[0].rank)
    .slice(0, 10),
);
const trending = Array.from({ length: 10 }, (_, i) =>
  groups.flatMap((group) => (group[i] ? [group[i]] : [])),
).flat();
const selected = [
  ...new Map([...popular, ...trending].map((t) => [t.id, t])).values(),
];
let cursor = 0;
const verified = new Map();
async function verify() {
  while (cursor < selected.length) {
    const t = selected[cursor++];
    try {
      const [embed, cover] = await Promise.all([
        fetch(
          "https://soundcloud.com/oembed?format=json&url=" +
            encodeURIComponent(t.url),
          { signal: AbortSignal.timeout(15000) },
        ),
        fetch(t.cover, { method: "HEAD", signal: AbortSignal.timeout(15000) }),
      ]);
      const data = await embed.json();
      if (
        embed.ok &&
        data.provider_name === "SoundCloud" &&
        cover.ok &&
        cover.headers.get("content-type")?.startsWith("image/")
      )
        verified.set(t.id, t);
    } catch {}
  }
}
await Promise.all([verify(), verify(), verify(), verify()]);
const checked = new Date().toISOString();
const pack = (list, provider) => ({
  provider,
  checked,
  method:
    "Artist popular-track indexes, official public SoundCloud play counts and embed eligibility; curated, not an official platform-wide chart.",
  tracks: list
    .filter((t) => verified.has(t.id))
    .map((t, i) => ({
      id: "soundcloud:" + t.id,
      rank: i + 1,
      title: t.title,
      artists: t.artists,
      url: t.url,
      cover: t.cover,
      plays: t.plays,
      duration: t.duration,
      evidence: {
        url: t.url,
        indexUrl:
          t.indexes.find((x) => x.url.includes("popular-tracks"))?.url ||
          t.indexes[0].url,
        checked: t.checked,
        likes: t.likes,
        policy: t.policy,
        embedVerified: true,
      },
    })),
});
const result = {
  popular: pack(popular, "soundcloud-popular"),
  trending: pack(trending, "trending"),
};
if (result.popular.tracks.length < 75 || result.trending.tracks.length < 50)
  throw Error(
    "Verification left fewer than the required 75/50 tracks; existing catalogue preserved.",
  );
fs.writeFileSync(
  "src/data/music-collections.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  "Verified collections:",
  result.popular.tracks.length,
  result.trending.tracks.length,
);
