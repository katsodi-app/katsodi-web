import { describe, expect, it } from "vitest";
import {
  clockSeconds,
  rutubeHits,
  youtubeHits,
} from "../../src/lib/server/video-search";

const page = (data: unknown) =>
  `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;

describe("universal video search", () => {
  it("reads lengths like the platforms print them", () => {
    expect(clockSeconds("50:02")).toBe(3002);
    expect(clockSeconds("1:02:03")).toBe(3723);
    expect(clockSeconds("LIVE")).toBe(0);
    expect(clockSeconds(undefined)).toBe(0);
  });

  it("takes YouTube's video entries only, with their watch links", () => {
    const hits = youtubeHits(
      page({
        contents: {
          list: [
            {
              videoRenderer: {
                videoId: "M84mzkM5KeM",
                title: { runs: [{ text: "БЛИЧ ЗА 50 МИНУТ" }] },
                ownerText: { runs: [{ text: "AniMillion" }] },
                lengthText: { simpleText: "50:02" },
              },
            },
            { channelRenderer: { channelId: "UC1" } },
            { videoRenderer: { videoId: "bad id", title: { runs: [{ text: "x" }] } } },
            {
              videoRenderer: {
                videoId: "aqz-KE-bpKQ",
                title: { runs: [{ text: "Live now" }] },
                badges: [{ metadataBadgeRenderer: { style: "BADGE_STYLE_TYPE_LIVE_NOW" } }],
              },
            },
          ],
        },
      }),
    );
    expect(hits).toEqual([
      {
        source: "youtube",
        url: "https://www.youtube.com/watch?v=M84mzkM5KeM",
        title: "БЛИЧ ЗА 50 МИНУТ",
        author: "AniMillion",
        cover: "https://i.ytimg.com/vi/M84mzkM5KeM/hqdefault.jpg",
        duration: 3002,
        live: false,
      },
      expect.objectContaining({ url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", live: true, duration: 0 }),
    ]);
    expect(youtubeHits("<html>no data</html>")).toEqual([]);
  });

  it("takes Rutube's results without adult videos or foreign images", () => {
    const hits = rutubeHits({
      results: [
        {
          id: "58dc746767bb74c48857f390adfeafa6",
          title: "Блич / Bleach OST",
          duration: 1350,
          thumbnail_url: "https://pic.rtbcdn.ru/video/a.jpg",
          author: { name: "Shuramaru Oni" },
        },
        { id: "0123456789abcdef0123456789abcdef", title: "18+", is_adult: true },
        {
          id: "fedcba9876543210fedcba9876543210",
          title: "Other",
          thumbnail_url: "https://evil.example/x.jpg",
        },
      ],
    });
    expect(hits.map((hit) => hit.url)).toEqual([
      "https://rutube.ru/video/58dc746767bb74c48857f390adfeafa6/",
      "https://rutube.ru/video/fedcba9876543210fedcba9876543210/",
    ]);
    expect(hits[0]).toMatchObject({ cover: "https://pic.rtbcdn.ru/video/a.jpg", duration: 1350 });
    expect(hits[1].cover).toBe("");
    expect(rutubeHits(null)).toEqual([]);
  });
});
