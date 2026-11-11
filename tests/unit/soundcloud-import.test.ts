import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resolveImport } from "../../src/lib/server/playlist-import";
import { soundcloudPlaylist } from "../../src/lib/server/soundcloud-api";
const url = "https://soundcloud.com/artist/sets/album";
beforeEach(() => {
  vi.stubEnv("SOUNDCLOUD_CLIENT_ID", "client");
  vi.stubEnv("SOUNDCLOUD_CLIENT_SECRET", "secret");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("reports missing SoundCloud credentials while single tracks still import", async () => {
  vi.stubEnv("SOUNDCLOUD_CLIENT_ID", "");
  expect(await resolveImport(url)).toMatchObject({
    status: "error",
    code: "unconfigured",
    service: "SoundCloud",
  });
  expect(
    await resolveImport("https://soundcloud.com/artist/track"),
  ).toMatchObject({
    status: "ok",
    urls: ["https://soundcloud.com/artist/track"],
  });
});
it("imports public set tracks in order with the official OAuth API and filters private tracks", async () => {
  const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const href = String(input);
    if (href.includes("oauth/token")) {
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        "Basic " + Buffer.from("client:secret").toString("base64"),
      );
      return Response.json({ access_token: "token", expires_in: 3600 });
    }
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "OAuth token",
    );
    return Response.json({
      kind: "playlist",
      sharing: "public",
      track_count: 3,
      tracks: [
        {
          id: 1,
          sharing: "public",
          permalink_url: "https://soundcloud.com/artist/one",
        },
        {
          id: 2,
          sharing: "private",
          permalink_url: "https://soundcloud.com/artist/private",
        },
        {
          id: 3,
          sharing: "public",
          permalink_url: "https://soundcloud.com/artist/two",
        },
      ],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  expect(await resolveImport(url)).toMatchObject({
    status: "ok",
    source: "SoundCloud",
    urls: [
      "https://soundcloud.com/artist/one",
      "https://soundcloud.com/artist/two",
    ],
  });
});
it("never sends the SoundCloud token to a redirect on another origin", async () => {
  const fetcher = vi.fn(async (input: string | URL) =>
    String(input).includes("oauth/token")
      ? Response.json({ access_token: "token", expires_in: 3600 })
      : new Response(null, {
          status: 302,
          headers: { location: "https://evil.test/steal" },
        }),
  );
  vi.stubGlobal("fetch", fetcher);
  await expect(soundcloudPlaylist(url)).rejects.toThrow(
    "invalid_soundcloud_url",
  );
  expect(
    fetcher.mock.calls.every(([input]) => !String(input).includes("evil.test")),
  ).toBe(true);
});
it("hydrates public playlist IDs without changing their playlist order", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      if (String(input).includes("oauth/token"))
        return Response.json({ access_token: "token", expires_in: 3600 });
      if (String(input).includes("/tracks?"))
        return Response.json({
          collection: [
            {
              id: 2,
              sharing: "public",
              permalink_url: "https://soundcloud.com/artist/two",
            },
            {
              id: 1,
              sharing: "public",
              permalink_url: "https://soundcloud.com/artist/one",
            },
          ],
        });
      return Response.json({
        kind: "playlist",
        sharing: "public",
        tracks: [{ id: 1 }, { id: 2 }],
      });
    }),
  );
  expect(
    (await soundcloudPlaylist(url))?.tracks.map((track) => track.permalink_url),
  ).toEqual([
    "https://soundcloud.com/artist/one",
    "https://soundcloud.com/artist/two",
  ]);
});
