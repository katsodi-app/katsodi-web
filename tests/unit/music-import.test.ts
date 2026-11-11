import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyLink, isMusicOrPlaylist } from "../../src/lib/music-links";
import { knownPlayer } from "../../src/lib/player";

const { resolveImport, IMPORT_LIMIT } =
  await import("../../src/lib/server/playlist-import");

const track = "3iRwigDWGH0z3R3wFmYmBW";
describe("music links", () => {
  it("classifies playlists, albums and single tracks", () => {
    expect(
      classifyLink(
        "https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
      )?.kind,
    ).toBe("youtube-playlist");
    expect(
      classifyLink(
        "https://music.youtube.com/watch?v=abcdefghijk&list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
      )?.kind,
    ).toBe("youtube-playlist");
    expect(classifyLink("https://youtu.be/abcdefghijk")?.kind).toBe("single");
    expect(
      classifyLink(`https://open.spotify.com/playlist/${track}`)?.kind,
    ).toBe("spotify-playlist");
    expect(
      classifyLink(`https://open.spotify.com/intl-de/album/${track}?si=1`)
        ?.kind,
    ).toBe("spotify-album");
    expect(classifyLink(`https://open.spotify.com/track/${track}`)?.kind).toBe(
      "single",
    );
    expect(
      classifyLink("https://soundcloud.com/theweeknd/blinding-lights")?.kind,
    ).toBe("single");
    expect(classifyLink("https://soundcloud.com/theweeknd")).toBeNull();
    expect(classifyLink("http://youtube.com/watch?v=abcdefghijk")).toBeNull();
    expect(classifyLink("https://example.org/a")).toBeNull();
    expect(classifyLink("not a url")).toBeNull();
  });
  it("tells music and playlists apart from ordinary videos", () => {
    expect(isMusicOrPlaylist(`https://open.spotify.com/track/${track}`)).toBe(
      true,
    );
    expect(isMusicOrPlaylist("https://soundcloud.com/a/b")).toBe(true);
    expect(
      isMusicOrPlaylist(
        "https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
      ),
    ).toBe(true);
    expect(
      isMusicOrPlaylist("https://music.youtube.com/watch?v=abcdefghijk"),
    ).toBe(true);
    expect(
      isMusicOrPlaylist("https://www.youtube.com/watch?v=abcdefghijk"),
    ).toBe(false);
    expect(isMusicOrPlaylist("https://vimeo.com/123")).toBe(false);
  });
  it("plays Spotify links through Spotify's official embed", () => {
    expect(
      knownPlayer(`https://open.spotify.com/intl-de/track/${track}?si=x`),
    ).toEqual({
      kind: "iframe",
      src: `https://open.spotify.com/embed/track/${track}`,
      provider: "Spotify",
      sync: false,
    });
    expect(
      knownPlayer(`https://open.spotify.com/artist/${track}`).kind,
    ).not.toBe("iframe");
  });
});

describe("playlist import", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("YOUTUBE_API_KEY", "yt-key");
    vi.stubEnv("SPOTIFY_CLIENT_ID", "id");
    vi.stubEnv("SPOTIFY_CLIENT_SECRET", "secret");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

  it("pages through a YouTube playlist with the official API", async () => {
    fetchMock
      .mockReturnValueOnce(
        reply(200, {
          items: [
            { contentDetails: { videoId: "aaaaaaaaaaa" } },
            { contentDetails: { videoId: "bad" } },
          ],
          nextPageToken: "p2",
        }),
      )
      .mockReturnValueOnce(
        reply(200, { items: [{ contentDetails: { videoId: "bbbbbbbbbbb" } }] }),
      );
    const r = await resolveImport(
      "https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
    );
    expect(r).toEqual({
      status: "ok",
      source: "YouTube",
      capped: false,
      urls: [
        "https://www.youtube.com/watch?v=aaaaaaaaaaa",
        "https://www.youtube.com/watch?v=bbbbbbbbbbb",
      ],
    });
    const first = new URL(String(fetchMock.mock.calls[0][0]));
    expect(first.host).toBe("www.googleapis.com");
    expect(first.searchParams.get("key")).toBe("yt-key");
    expect(
      new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("pageToken"),
    ).toBe("p2");
  });
  it("reads a Spotify playlist with client credentials and keeps tracks only", async () => {
    fetchMock
      .mockReturnValueOnce(
        reply(200, { access_token: "tok", expires_in: 3600 }),
      )
      .mockReturnValueOnce(
        reply(200, {
          items: [
            { track: { id: track, type: "track" } },
            { track: { id: "1234567890123456789012", type: "episode" } },
            { track: null },
          ],
          next: null,
        }),
      );
    const r = await resolveImport(`https://open.spotify.com/playlist/${track}`);
    expect(r).toEqual({
      status: "ok",
      source: "Spotify",
      capped: false,
      urls: [`https://open.spotify.com/track/${track}`],
    });
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://accounts.spotify.com/api/token");
    expect(tokenInit.headers.Authorization).toBe(
      `Basic ${Buffer.from("id:secret").toString("base64")}`,
    );
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer tok");
  });
  it("caps a long playlist at the queue size", async () => {
    const page = (n: number) => ({
      items: Array.from({ length: 50 }, (_, i) => ({
        contentDetails: { videoId: String(n * 50 + i).padStart(11, "v") },
      })),
      nextPageToken: `p${n + 1}`,
    });
    for (let n = 0; n < 8; n++)
      fetchMock.mockReturnValueOnce(reply(200, page(n)));
    const r = await resolveImport(
      "https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
    );
    expect(r.status === "ok" && r.urls.length).toBe(IMPORT_LIMIT);
    expect(r.status === "ok" && r.capped).toBe(true);
  });
  it("says which key is missing, and reports private or empty playlists", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    expect(
      await resolveImport(
        "https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
      ),
    ).toEqual({
      status: "error",
      code: "unconfigured",
      service: "YouTube",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockReturnValueOnce(reply(404, { error: "notFound" }));
    vi.stubEnv("YOUTUBE_API_KEY", "k");
    expect(
      (
        await resolveImport(
          "https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
        )
      ).status,
    ).toBe("error");
    fetchMock.mockReturnValueOnce(reply(200, { items: [] }));
    expect(
      await resolveImport(
        "https://www.youtube.com/playlist?list=PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
      ),
    ).toMatchObject({ code: "empty" });
  });
  it("queues single tracks as they are, without any API", async () => {
    expect(
      await resolveImport("https://soundcloud.com/theweeknd/blinding-lights"),
    ).toMatchObject({
      status: "ok",
      urls: ["https://soundcloud.com/theweeknd/blinding-lights"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await resolveImport("https://example.org/x")).toMatchObject({
      code: "unsupported",
    });
  });
});
