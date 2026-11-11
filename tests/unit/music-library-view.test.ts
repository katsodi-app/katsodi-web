import { expect, it } from "vitest";
import { musicLibraryView } from "../../src/lib/music-library-view";
import { musicChart } from "../../src/lib/music";
import charts from "../../src/data/music-discovery.json";
import collections from "../../src/data/music-collections.json";
import { discoveryChartsSchema } from "../../src/lib/music-discovery";
import { collectionsSchema } from "../../src/lib/music-collections";

it("keeps all browsing and queue data while excluding unused provenance at the client boundary", () => {
  const input = {
    chart: musicChart,
    charts: discoveryChartsSchema.parse(charts),
    collections: collectionsSchema.parse(collections),
  };
  const original = JSON.stringify(input);
  const view = musicLibraryView(input);
  expect(view.chart.tracks.map((t) => t.slug)).toEqual(
    input.chart.tracks.map((t) => t.slug),
  );
  expect(view.charts.map((c) => c.provider)).toEqual(["spotify", "youtube"]);
  for (const name of ["popular", "trending"] as const) {
    expect(
      view.collections[name].tracks.map((t) => [
        t.id,
        t.url,
        t.duration,
        t.cover,
        t.plays,
        t.artists,
      ]),
    ).toEqual(
      input.collections[name].tracks.map((t) => [
        t.id,
        t.url,
        t.duration,
        t.cover,
        t.plays,
        t.artists,
      ]),
    );
    expect(view.collections[name].tracks[0]).not.toHaveProperty("evidence");
  }
  expect(view.chart.tracks[0]).not.toHaveProperty("soundcloud");
  expect(JSON.stringify(input)).toBe(original);
});
