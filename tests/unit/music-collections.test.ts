import { expect, it } from "vitest";
import data from "../../src/data/music-collections.json";
import { collectionsSchema } from "../../src/lib/music-collections";
import {
  adjacentTrack,
  chartQueue,
  clockTime,
  validQueue,
} from "../../src/lib/music-queue";
import { musicTracks } from "../../src/lib/music";

it("ships researched full-play collections with minimum counts, evidence and unique canonical sources", () => {
  const collections = collectionsSchema.parse(data);
  expect(collections.popular.tracks.length).toBeGreaterThanOrEqual(75);
  expect(collections.trending.tracks.length).toBeGreaterThanOrEqual(50);
  for (const collection of Object.values(collections)) {
    expect(validQueue(collection.tracks)).toBe(true);
    for (const track of collection.tracks) {
      expect(track.url).toMatch(/^https:\/\/soundcloud.com\/[^/]+\/[^/]+$/);
      expect(track.evidence.url).toBe(track.url);
      expect(track.evidence.embedVerified).toBe(true);
      expect(track.evidence.policy).toBe("ALLOW");
      expect(track.artists[0].trim()).not.toBe("");
      expect(track.cover).toMatch(/^https:\/\/.*\.sndcdn\.com\//);
    }
  }
  expect(
    collections.trending.tracks.some((t) => /poster boy/i.test(t.title)),
  ).toBe(true);
  expect(collections.trending.tracks.some((t) => /FEVER/.test(t.title))).toBe(
    true,
  );
});
it("preserves collection order without wrapping the last track or duplicating sources", () => {
  expect(adjacentTrack(0, 60, 1)).toBe(1);
  expect(adjacentTrack(59, 60, 1)).toBeNull();
  expect(adjacentTrack(0, 60, -1)).toBeNull();
  expect(validQueue([data.popular.tracks[0], data.popular.tracks[0]])).toBe(
    false,
  );
  expect(
    validQueue([{ ...data.popular.tracks[0], url: "javascript:alert(1)" }]),
  ).toBe(false);
  expect(chartQueue(musicTracks)[0].url).toContain("open.spotify.com/track/");
  expect(clockTime(145)).toBe("2:25");
  expect(clockTime(NaN)).toBe("0:00");
});
it("rejects foreign artwork and fabricated popularity evidence", () => {
  const copy = structuredClone(data);
  copy.popular.tracks[0].cover = "https://untrusted.invalid/image.png";
  expect(collectionsSchema.safeParse(copy).success).toBe(false);
  copy.popular.tracks[0] = data.popular.tracks[0];
  copy.popular.tracks[0] = { ...copy.popular.tracks[0], plays: 100 };
  expect(collectionsSchema.safeParse(copy).success).toBe(false);
});
