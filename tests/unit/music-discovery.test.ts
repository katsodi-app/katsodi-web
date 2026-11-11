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
} from "../../src/lib/music-discovery";
import {
  parseKworbChart,
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
