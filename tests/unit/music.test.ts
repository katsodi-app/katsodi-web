import { describe, expect, it } from "vitest";
import {
  formatStreams,
  musicChart,
  musicDescription,
  musicNeighbours,
  musicTrack,
  musicTracks,
  soundcloudSearchUrl,
  soundcloudWidgetUrl,
  spotifyEmbedUrl,
  spotifyUrl,
} from "../../src/lib/music";

describe("Top 150 data", () => {
  it("is ranked from 1 without gaps or duplicates", () => {
    expect(musicTracks.length).toBeGreaterThanOrEqual(140);
    expect(musicTracks.length).toBeLessThanOrEqual(150);
    const ranks = musicTracks.map((t) => t.rank);
    expect(new Set(ranks).size).toBe(ranks.length);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(ranks[0]).toBe(1);
    // Ranked by streams, highest first.
    for (let i = 1; i < musicTracks.length; i++)
      expect(musicTracks[i].streams).toBeLessThanOrEqual(
        musicTracks[i - 1].streams,
      );
  });
  it("has unique URL-safe slugs and complete verified fields", () => {
    const slugs = new Set<string>();
    const ids = new Set<string>();
    for (const t of musicTracks) {
      expect(t.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slugs.has(t.slug), t.slug).toBe(false);
      slugs.add(t.slug);
      expect(t.spotifyId).toMatch(/^[A-Za-z0-9]{22}$/);
      expect(ids.has(t.spotifyId), t.slug).toBe(false);
      ids.add(t.spotifyId);
      expect(t.title.trim()).not.toBe("");
      expect(t.artists.length, t.slug).toBeGreaterThan(0);
      for (const url of [t.cover, t.thumb])
        expect(new URL(url).protocol, t.slug).toBe("https:");
      expect(t.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (t.released) expect(t.released).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(new URL(musicChart.source).host).toBe("kworb.net");
  });
  it("only stores SoundCloud tracks on soundcloud.com", () => {
    for (const t of musicTracks.filter((t) => t.soundcloud)) {
      const url = new URL(t.soundcloud!.url);
      expect(url.protocol).toBe("https:");
      expect(url.host).toBe("soundcloud.com");
      expect(url.pathname.split("/").filter(Boolean)).toHaveLength(2);
      expect(t.soundcloud!.author.trim()).not.toBe("");
    }
  });
  it("finds tracks by slug", () => {
    const first = musicTracks[0];
    expect(musicTrack(first.slug)).toBe(first);
    expect(musicTrack("not-a-track")).toBeUndefined();
  });
});

describe("music helpers", () => {
  const track = {
    ...musicTracks[0],
    title: "Song & Dance",
    artists: ["A", "B"],
    released: "2020-03-20",
    streams: 5_668_555_657,
    checked: "2026-11-06",
    rank: 1,
    spotifyId: "3iRwigDWGH0z3R3wFmYmBW",
  };
  it("builds official Spotify and SoundCloud URLs with encoded input", () => {
    expect(spotifyUrl(track.spotifyId)).toBe(
      "https://open.spotify.com/track/3iRwigDWGH0z3R3wFmYmBW",
    );
    expect(spotifyEmbedUrl(track.spotifyId)).toBe(
      "https://open.spotify.com/embed/track/3iRwigDWGH0z3R3wFmYmBW",
    );
    const widget = new URL(
      soundcloudWidgetUrl("https://soundcloud.com/a/song?x=1&y=2"),
    );
    expect(widget.host).toBe("w.soundcloud.com");
    expect(widget.searchParams.get("url")).toBe(
      "https://soundcloud.com/a/song?x=1&y=2",
    );
    const search = new URL(soundcloudSearchUrl(track));
    expect(search.host).toBe("soundcloud.com");
    expect(search.searchParams.get("q")).toBe("A Song & Dance");
  });
  it("formats streams per locale", () => {
    expect(formatStreams(track.streams, "en")).toBe("5.67B");
    expect(formatStreams(track.streams, "ru")).toMatch(/^5,67\sмлрд$/);
  });
  it("describes a track only with verified facts in both locales", () => {
    const en = musicDescription(track, "en");
    expect(en).toContain("“Song & Dance” by A, B.");
    expect(en).toContain("March 20, 2020");
    expect(en).toContain("5.67B Spotify streams as of November 6, 2026");
    expect(en).toContain("number 1");
    const ru = musicDescription(track, "ru");
    expect(ru).toContain("«Song & Dance» — A, B.");
    expect(ru).toContain("20 марта 2020");
    expect(ru).toContain("1-е место");
    expect(musicDescription({ ...track, released: null }, "en")).not.toContain(
      "Released",
    );
  });
});

describe("track pager", () => {
  it("links only the neighbouring tracks, without the rest of the chart", () => {
    const [first, second, third] = musicTracks;
    expect(musicNeighbours(first.slug)).toEqual({
      previous: null,
      next: { slug: second.slug, rank: second.rank, title: second.title },
    });
    expect(musicNeighbours(second.slug).previous?.slug).toBe(first.slug);
    expect(musicNeighbours(second.slug).next?.slug).toBe(third.slug);
    expect(musicNeighbours(musicTracks.at(-1)!.slug).next).toBeNull();
  });
});
