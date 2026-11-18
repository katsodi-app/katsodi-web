import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ openMusicRoom: vi.fn(), library: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: () => {
    throw new Error("cookies must not be read for a native request");
  },
}));
vi.mock("../../src/lib/server/music-operations", () => ({
  openMusicRoom: mocks.openMusicRoom,
}));
vi.mock("../../src/lib/server/music-discovery", () => ({
  musicLibraryData: mocks.library,
}));

import { GET as library } from "../../src/app/api/native/v1/music/route";
import { POST as listen } from "../../src/app/api/native/v1/music/listen/route";

const bearer = `Bearer ${"a".repeat(20)}.${"b".repeat(40)}.${"c".repeat(30)}`;
const room = "10000000-0000-4000-8000-000000000001";
const track = "https://open.spotify.com/track/" + "a".repeat(22);
const post = (body: unknown, auth = true) =>
  new Request("http://localhost/api/native/v1/music/listen", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: bearer } : {}),
    },
    body: JSON.stringify(body),
  });

beforeEach(() => vi.resetAllMocks());

describe("native music", () => {
  it("serves the library to guests, projected like the website", async () => {
    mocks.library.mockResolvedValue({
      chart: {
        source: "s",
        checked: "2026-11-01",
        tracks: [
          {
            rank: 1,
            slug: "x",
            title: "Song",
            artists: ["A"],
            streams: 5,
            thumb: "",
            spotifyId: "b".repeat(22),
            extra: 1,
          },
        ],
      },
      charts: [],
      collections: {
        popular: { checked: "c", tracks: [] },
        trending: { checked: "c", tracks: [] },
      },
    });
    const response = await library(
      new Request("http://localhost/api/native/v1/music"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.chart.tracks[0]).toEqual({
      rank: 1,
      slug: "x",
      title: "Song",
      artists: ["A"],
      streams: 5,
      thumb: "",
      spotifyId: "b".repeat(22),
    });
  });

  it("opens a track in a room through the shared operation", async () => {
    mocks.openMusicRoom.mockImplementation(async (form: FormData) => {
      expect(form.get("url")).toBe(track);
      expect(form.get("room")).toBe(room);
      return { status: "opened", roomId: room };
    });
    const opened = await listen(post({ url: track, title: "Song", room }));
    expect(opened.status).toBe(201);
    expect(await opened.json()).toEqual({ roomId: room });
    expect((await listen(post({ url: track }, false))).status).toBe(401);
    for (const bad of [{}, { url: 5 }, { url: track, owner: "x" }])
      expect((await listen(post(bad))).status).toBe(400);
    mocks.openMusicRoom.mockResolvedValue({ status: "error", code: "invalid" });
    expect((await listen(post({ url: "https://example.org" }))).status).toBe(
      400,
    );
  });
});
