import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  rows: [] as { payload: unknown }[],
  unavailable: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ currentViewer: mocks.viewer }));
import { musicChart } from "../../src/lib/music";
import collections from "../../src/data/music-collections.json";
import {
  currentMusicTrack,
  musicLibraryData,
} from "../../src/lib/server/music-discovery";
beforeEach(() => {
  mocks.rows = [];
  mocks.unavailable = false;
  mocks.viewer.mockResolvedValue({
    client: {
      from: () => ({
        select: () => ({
          abortSignal: async () => ({
            data: mocks.rows,
            error: mocks.unavailable ? { code: "missing_table" } : null,
          }),
        }),
      }),
    },
  });
});
it("serves newly ranked track pages and neighbours from validated weekly storage", async () => {
  const chart = {
    ...musicChart,
    provider: "spotify-all-time",
    tracks: musicChart.tracks.map((track, index) =>
      index === 0
        ? { ...track, title: "New weekly song", slug: "new-weekly-song" }
        : track,
    ),
  };
  mocks.rows = [{ payload: chart }];
  expect((await currentMusicTrack("new-weekly-song"))?.track.title).toBe(
    "New weekly song",
  );
  expect((await currentMusicTrack("new-weekly-song"))?.next?.slug).toBe(
    musicChart.tracks[1].slug,
  );
  expect(
    (await currentMusicTrack(musicChart.tracks[0].slug))?.track.title,
  ).toBe(musicChart.tracks[0].title);
});
it("ignores malformed stored charts and keeps the verified bundled catalogue", async () => {
  mocks.rows = [
    {
      payload: {
        provider: "spotify-all-time",
        source: "javascript:alert(1)",
        tracks: [],
      },
    },
  ];
  expect((await musicLibraryData()).chart).toEqual(musicChart);
  expect(await currentMusicTrack("not-a-known-song")).toBeNull();
});

it("loads validated weekly curated collections and rejects malformed remote artwork", async () => {
  const updated = structuredClone(collections);
  updated.trending.tracks[0].title = "Updated public selection";
  mocks.rows = [
    {
      payload: {
        provider: "spotify-all-time",
        ...musicChart,
        collections: updated,
      },
    },
  ];
  expect((await musicLibraryData()).collections.trending.tracks[0].title).toBe(
    "Updated public selection",
  );
  updated.trending.tracks[0].cover = "https://untrusted.invalid/image.png";
  expect((await musicLibraryData()).collections.trending.tracks[0].title).toBe(
    collections.trending.tracks[0].title,
  );
});
it("keeps the public page available before the chart migration is applied", async () => {
  mocks.unavailable = true;
  const data = await musicLibraryData();
  expect(data.chart.tracks).toHaveLength(150);
  expect(
    data.charts.find((chart) => chart.provider === "youtube")?.tracks,
  ).toHaveLength(150);
});
