import { afterEach, expect, it, vi } from "vitest";
import snapshot from "../../src/data/music-discovery.json";
import { musicChart } from "../../src/lib/music";
import { syncSource } from "../../src/lib/playback";
import {
  chartSources,
  discoveryChartsSchema,
  mostPlayedChartSchema,
  musicRoomSource,
  safeMusicCover,
  sharpMusicCover,
} from "../../src/lib/music-discovery";
import {
  enrichCovers,
  parseKworbChart,
  parseKworbTopVideos,
  parseSoundcloudChart,
  refreshMusicCharts,
} from "../../src/lib/server/music-chart-sources";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("ships verified source-specific snapshots with actual availability", () => {
  const charts = discoveryChartsSchema.parse(snapshot);
  expect(
    charts.find((chart) => chart.provider === "spotify")?.tracks,
  ).toHaveLength(150);
  expect(
    charts.find((chart) => chart.provider === "youtube")?.tracks,
  ).toHaveLength(150);
  expect(
    charts.find((chart) => chart.provider === "tiktok")?.tracks,
  ).toHaveLength(0);
  for (const chart of charts) {
    expect(chart.source).toBe(chartSources[chart.provider].source);
    expect(new Set(chart.tracks.map((track) => track.id)).size).toBe(
      chart.tracks.length,
    );
  }
  const verified = mostPlayedChartSchema.safeParse(musicChart);
  expect(
    verified.success,
    JSON.stringify(verified.success ? null : verified.error.issues.slice(0, 4)),
  ).toBe(true);
  expect(
    mostPlayedChartSchema.safeParse({
      ...musicChart,
      tracks: musicChart.tracks.map(() => musicChart.tracks[0]),
    }).success,
  ).toBe(false);
});
it("preserves published YouTube video titles without inventing artist credits", () => {
  const html = `<table><tr><th>Pos</th><th>P+</th><th>Video</th><th>Views</th></tr><tr><td>1</td><td>NEW</td><td class="text"><a href="../video/abcdefghijk.html">A title &amp; a second title | Official Video</a></td><td>1,234</td></tr></table>`;
  expect(parseKworbChart(html, "youtube").tracks[0]).toMatchObject({
    title: "A title & a second title | Official Video",
    artists: [],
    plays: 1234,
    url: "https://www.youtube.com/watch?v=abcdefghijk",
  });
});
it("reads Spotify IDs, collaborators and metrics from the matching columns", () => {
  const html = `<h1>2026/11/05</h1><table><tr><th>Pos</th><th>Artist</th><th>Streams</th></tr><tr><td>1</td><td class="text"><a href="../artist/${"b".repeat(22)}.html">Artist</a> - <a href="../track/${"a".repeat(22)}.html">Song</a></td><td>9,876</td></tr></table>`;
  expect(parseKworbChart(html, "spotify")).toMatchObject({
    period: "2026/11/05",
    tracks: [{ title: "Song", artists: ["Artist"], plays: 9876 }],
  });
});
it("omits incomplete or private SoundCloud preview entries rather than filling a chart", () => {
  const html = `<script>window.__sc_hydration = ${JSON.stringify([{ hydratable: "playlist", data: { sharing: "public", tracks: [{ id: 1, title: "Track", public: true, permalink_url: "https://soundcloud.com/artist/song", user: { username: "Artist" }, playback_count: 42 }, { id: 2 }, { id: 3, public: false, title: "Private", permalink_url: "https://soundcloud.com/artist/private", user: { username: "Artist" } }] } }])};</script>`;
  expect(parseSoundcloudChart(html)).toHaveLength(1);
  expect(parseSoundcloudChart(html)[0]).toMatchObject({
    title: "Track",
    rank: 1,
    plays: 42,
  });
});
it("keeps the last good chart and its checked date when a weekly source fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("blocked", { status: 403 })),
  );
  const previous = discoveryChartsSchema.parse(snapshot);
  const expectedTracks = structuredClone(previous[0].tracks);
  Reflect.set(previous[0].tracks[0], "internalField", "not-public");
  const now = new Date("2026-11-16T06:00:00Z");
  const refreshed = await refreshMusicCharts(previous, now);
  const spotify = refreshed.find((chart) => chart.provider === "spotify")!;
  expect(spotify.status).toBe("stale");
  expect(spotify.checked).toBe(previous[0].checked);
  expect(spotify.attempted).toBe(now.toISOString());
  expect(spotify.tracks).toEqual(expectedTracks);
  expect(spotify.tracks[0]).not.toHaveProperty("internalField");
  expect(refreshed.find((chart) => chart.provider === "tiktok")).toMatchObject({
    status: "unavailable",
    checked: null,
    tracks: [],
  });
});
it("restricts room sources and artwork to known public providers", () => {
  expect(musicRoomSource("https://youtu.be/abcdefghijk?si=tracking")).toBe(
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
  expect(musicRoomSource("https://soundcloud.com/artist/sets/list")).toBeNull();
  expect(syncSource("https://soundcloud.com/artist/sets/list")).toBeNull();
  expect(syncSource("https://soundcloud.com/artist/track")).toBe("soundcloud");
  for (const value of [
    "https://evil.test/cover.jpg",
    "http://i.scdn.co/x",
    "https://i.scdn.co.evil.test/x",
    "https://user:secret@i.scdn.co/x",
  ])
    expect(safeMusicCover(value)).toBeNull();
});

it("reads kworb's all-time most viewed videos in page order", () => {
  const html = `<table><tr><th class="text">Video</th><th>Views</th><th>Yesterday</th></tr>
<tr><td class="text"><div><a href="video/kJQP7kiw5Fk.html">Luis Fonsi - Despacito ft. Daddy Yankee</a></div></td><td>9,175,162,172</td><td>1,250,899</td></tr>
<tr><td class="text"><div><a href="video/XqZsoesa55w.html">Baby Shark Dance</a></div></td><td>16,000,000,000</td><td>2</td></tr>
<tr><td class="text"><div><a href="video/kJQP7kiw5Fk.html">Duplicate - Row</a></div></td><td>1</td><td>1</td></tr></table>`;
  const tracks = parseKworbTopVideos(html);
  expect(tracks).toHaveLength(2);
  expect(tracks[0]).toMatchObject({
    id: "youtube:kJQP7kiw5Fk",
    rank: 1,
    title: "Despacito ft. Daddy Yankee",
    artists: ["Luis Fonsi"],
    url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
    plays: 9175162172,
  });
  // No "Artist - Title": the title stays whole, no invented artist.
  expect(tracks[1]).toMatchObject({
    rank: 2,
    title: "Baby Shark Dance",
    artists: [],
  });
  expect(chartSources.youtube.source).toBe(
    "https://kworb.net/youtube/topvideos.html",
  );
});

it("upgrades provider artwork to its large size and keeps unknown hosts out", () => {
  expect(sharpMusicCover("https://i.scdn.co/image/ab67616d00001e02abc")).toBe(
    "https://i.scdn.co/image/ab67616d0000b273abc",
  );
  expect(sharpMusicCover("https://i1.sndcdn.com/artworks-x-0-large.jpg")).toBe(
    "https://i1.sndcdn.com/artworks-x-0-t500x500.jpg",
  );
  expect(sharpMusicCover("https://i.ytimg.com/vi/a/hqdefault.jpg")).toBe(
    "https://i.ytimg.com/vi/a/hqdefault.jpg",
  );
  expect(sharpMusicCover("https://evil.example/a.jpg")).toBeNull();
  expect(sharpMusicCover(null)).toBeNull();
});

it("adds large covers at refresh: YouTube maxres when present, Spotify via oEmbed", async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("maxresdefault") && url.includes("/vi/aaaaaaaaaaa/"))
      return new Response("", { status: 200 });
    if (url.includes("maxresdefault")) return new Response("", { status: 404 });
    if (url.startsWith("https://open.spotify.com/oembed"))
      return Response.json({
        thumbnail_url:
          "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02cafe",
      });
    return new Response("", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  const yt = (id: string) => ({
    id: `youtube:${id}`,
    rank: 1,
    title: "T",
    artists: [],
    url: `https://www.youtube.com/watch?v=${id}`,
    cover: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    plays: 1,
  });
  const [withMaxres, without] = await enrichCovers("youtube", [
    yt("aaaaaaaaaaa"),
    yt("bbbbbbbbbbb"),
  ]);
  expect(withMaxres.cover).toBe(
    "https://i.ytimg.com/vi/aaaaaaaaaaa/maxresdefault.jpg",
  );
  expect(without.cover).toBe(
    "https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg",
  );
  const [spotify] = await enrichCovers("spotify", [
    {
      id: "spotify:x",
      rank: 1,
      title: "S",
      artists: ["A"],
      url: "https://open.spotify.com/track/2sFepQNyl1WjpROruP8bJ0",
      cover: null,
      plays: 1,
    },
  ]);
  expect(spotify.cover).toBe(
    "https://image-cdn-fa.spotifycdn.com/image/ab67616d0000b273cafe",
  );
});
