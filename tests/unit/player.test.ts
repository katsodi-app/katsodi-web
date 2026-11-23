import { afterEach, describe, it, expect, vi } from "vitest";
import {
  knownPlayer,
  kinogoPage,
  approvedFrame,
  findPlayerFrames,
  readPlayerResolution,
} from "../../src/lib/player";
import { resolvePlayer } from "../../src/lib/server/player-resolver";
import { embedCodeSource } from "../../src/lib/providers";
afterEach(() => vi.unstubAllGlobals());
describe("player URL boundaries", () => {
  it("embeds VK only through its official export code", () => {
    const src =
      "https://vkvideo.ru/video_ext.php?oid=-238162296&id=456239108&hash=0123abcd4567ef89&hd=2&js_api=1";
    for (const url of [
      "https://vk.com/video_ext.php?oid=-238162296&id=456239108&hash=0123abcd4567ef89",
      "https://vkvideo.ru/video_ext.php?hash=0123abcd4567ef89&id=456239108&oid=-238162296&autoplay=1",
    ])
      expect(knownPlayer(url)).toMatchObject({ kind: "iframe", src });
    for (const url of [
      "https://vkvideo.ru/live-238162296_456239108",
      "https://vk.com/video-238162296_456239108",
      "https://vk.com/club1?z=video-238162296_456239108%2Fpl_cat",
    ])
      expect(knownPlayer(url)).toEqual({
        kind: "discover",
        provider: "VK Видео",
        sync: false,
      });
    for (const url of [
      "https://vk.com/feed",
      "https://vkvideo.ru/video_ext.php?oid=-238162296&id=456239108",
      "https://vkvideo.ru/video_ext.php?oid=x&id=1&hash=0123abcd4567ef89",
    ])
      expect(knownPlayer(url)).toEqual({
        kind: "external",
        reason: "vkEmbedRequired",
        sync: false,
      });
    expect(
      knownPlayer(
        "https://vkvideo.ru.evil.org/video_ext.php?oid=1&id=1&hash=0123abcd4567ef89",
      ).kind,
    ).toBe("discover");
  });
  it("reads the src of pasted iframe embed code", () => {
    expect(
      embedCodeSource(
        '<iframe src="https://vkvideo.ru/video_ext.php?oid=-1&amp;id=2&amp;hash=0123abcd4567ef89" width="853" allowfullscreen></iframe>',
      ),
    ).toBe(
      "https://vkvideo.ru/video_ext.php?oid=-1&id=2&hash=0123abcd4567ef89",
    );
    expect(embedCodeSource("  https://youtu.be/M7lc1UVf-VE ")).toBe(
      "https://youtu.be/M7lc1UVf-VE",
    );
    expect(embedCodeSource("<iframe></iframe>")).toBe("<iframe></iframe>");
  });
  it("recognizes exact YouTube variants without trusting arbitrary hosts", () => {
    for (const url of [
      "https://youtu.be/M7lc1UVf-VE",
      "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      "https://youtube.com/shorts/M7lc1UVf-VE",
      "https://youtube.com/live/M7lc1UVf-VE",
    ]) {
      expect(knownPlayer(url)).toMatchObject({
        kind: "iframe",
        src: "https://www.youtube.com/embed/M7lc1UVf-VE?playsinline=1&rel=0",
        sync: false,
      });
    }
    for (const url of [
      "https://www.youtube.com/watch?v=oops",
      "javascript:alert(1)",
      "https://127.0.0.1/movie.mp4",
    ]) {
      expect(knownPlayer(url).kind).toBe("external");
    }
    expect(knownPlayer("https://cdn.example.org/movie.mp4").kind).toBe("video");
    expect(
      knownPlayer("https://youtube.com.evil.org/watch?v=M7lc1UVf-VE").kind,
    ).toBe("discover");
  });
  it("limits discovery to canonical reviewed title paths", () => {
    expect(
      kinogoPage("https://kinogo.is/240-diuna.html?tracking=discarded"),
    ).toBe("https://kinogo.is/240-diuna.html");
    for (const url of [
      "https://kinogo.is/index.php?do=search",
      "https://evil.org/240-diuna.html",
      "https://name:pass@kinogo.is/240-diuna.html",
      "https://kinogo.is:444/240-diuna.html",
    ]) {
      expect(kinogoPage(url)).toBeNull();
    }
  });
  it("reads only approved iframe URLs and never treats scripts as players", () => {
    const html = `<script>const ad='<iframe src="https://api.nextembed.ws/embed/movie/1">';</script><iframe src="javascript:alert(1)"></iframe><iframe src="//evil.org/embed/movie/2"></iframe><iframe src="//api.nextembed.ws/embed/movie/3"></iframe>`;
    expect(findPlayerFrames(html, "https://kinogo.is/240-diuna.html")).toEqual([
      "https://api.nextembed.ws/embed/movie/3",
    ]);
    for (const url of [
      "https://api.nextembed.ws.evil.org/embed/movie/1",
      "https://api.nextembed.ws/embed/movie/1?redirect=https://evil.org",
      "http://api.nextembed.ws/embed/movie/1",
    ]) {
      expect(approvedFrame(url, "https://kinogo.is/")).toBeNull();
    }
    expect(
      readPlayerResolution({
        kind: "iframe",
        src: "https://evil.org/",
        sync: true,
      }),
    ).toBeNull();
    expect(
      readPlayerResolution({
        kind: "iframe",
        src: "https://api.nextembed.ws/embed/movie/3",
        sync: true,
      }),
    ).toMatchObject({ kind: "iframe", sync: false });
  });
});
describe("bounded public player discovery", () => {
  it("finds a public iframe without proxying HTML or forwarding credentials", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          '<iframe src="//api.nextembed.ws/embed/movie/36036"></iframe>',
          { headers: { "Content-Type": "text/html" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response("<html>player</html>", {
          headers: { "Content-Type": "text/html" },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await resolvePlayer("https://kinogo.is/901-player.html"),
    ).toMatchObject({
      kind: "iframe",
      src: "https://api.nextembed.ws/embed/movie/36036",
      sync: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: "manual",
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    await resolvePlayer("https://kinogo.is/901-player.html");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not bypass frame restrictions or follow redirects", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          '<iframe src="//api.nextembed.ws/embed/movie/5"></iframe>',
          { headers: { "Content-Type": "text/html" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response("blocked", {
          headers: {
            "Content-Type": "text/html",
            "Content-Security-Policy": "frame-ancestors 'self'",
          },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await resolvePlayer("https://kinogo.is/902-player.html"),
    ).toMatchObject({ kind: "external", reason: "blocked" });
    fetcher.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { Location: "https://127.0.0.1/" },
      }),
    );
    expect(
      await resolvePlayer("https://kinogo.is/903-player.html"),
    ).toMatchObject({ kind: "external", reason: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("never fetches unsupported sites and bounds large response bodies", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("x".repeat(2 * 1024 * 1024 + 1), {
        headers: { "Content-Type": "text/html" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(await resolvePlayer("javascript:alert(1)")).toMatchObject({
      kind: "external",
      reason: "unsupported",
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      await resolvePlayer("https://kinogo.is/904-player.html"),
    ).toMatchObject({ kind: "external", reason: "unavailable" });
  });
});

describe("playlist links", () => {
  it("embeds a YouTube playlist page as YouTube's playlist player", () => {
    expect(
      knownPlayer(
        "https://www.youtube.com/playlist?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSU",
      ),
    ).toEqual({
      kind: "iframe",
      src: "https://www.youtube.com/embed/videoseries?list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSU&playsinline=1&rel=0",
      provider: "YouTube",
      sync: false,
    });
    // A watch link with a list stays the (synchronizable) video itself.
    expect(
      knownPlayer(
        "https://www.youtube.com/watch?v=aqz-KE-bpKQ&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSU",
      ),
    ).toMatchObject({
      src: "https://www.youtube.com/embed/aqz-KE-bpKQ?playsinline=1&rel=0",
    });
    expect(
      knownPlayer("https://www.youtube.com/playlist?list=bad list"),
    ).toMatchObject({ kind: "external" });
  });
});

describe("players kept in step through their <video>", () => {
  it("embeds Kick, Google Drive, Rutube, OK and Dailymotion in their own players", () => {
    expect(knownPlayer("https://kick.com/XQC")).toMatchObject({
      kind: "iframe",
      src: "https://player.kick.com/xqc",
      provider: "Kick",
    });
    expect(
      knownPlayer(
        "https://kick.com/xqc/videos/0b6f1b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
      ),
    ).toMatchObject({
      src: "https://player.kick.com/video/0b6f1b1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b",
    });
    expect(
      knownPlayer(
        "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing",
      ),
    ).toMatchObject({
      src: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/preview",
      provider: "Google Drive",
    });
    expect(
      knownPlayer("https://rutube.ru/video/0123456789abcdef0123456789abcdef/"),
    ).toMatchObject({
      src: "https://rutube.ru/play/embed/0123456789abcdef0123456789abcdef",
      provider: "Rutube",
    });
    expect(knownPlayer("https://ok.ru/video/8540390816")).toMatchObject({
      src: "https://ok.ru/videoembed/8540390816",
    });
    expect(knownPlayer("https://www.dailymotion.com/video/x2kdx9f")).toMatchObject({
      src: "https://geo.dailymotion.com/player.html?video=x2kdx9f",
      provider: "Dailymotion",
    });
    expect(knownPlayer("https://dai.ly/x2kdx9f")).toMatchObject({
      src: "https://geo.dailymotion.com/player.html?video=x2kdx9f",
    });
  });
  it("leaves their other pages alone", () => {
    expect(knownPlayer("https://kick.com/categories")).not.toMatchObject({ provider: "Kick" });
    expect(
      knownPlayer("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz012345"),
    ).not.toMatchObject({ provider: "Google Drive" });
    expect(knownPlayer("https://kick.com.evil.org/xqc")).not.toMatchObject({ provider: "Kick" });
  });
});
describe("Twitch", () => {
  const parents =
    "parent=katsodi.watch&parent=www.katsodi.watch&parent=localhost&parent=127.0.0.1";
  it("embeds channels, past broadcasts and clips in Twitch's own player", () => {
    expect(knownPlayer("https://www.twitch.tv/SkyWhyWalker")).toEqual({
      kind: "iframe",
      src: `https://player.twitch.tv/?channel=skywhywalker&${parents}`,
      provider: "Twitch",
      sync: false,
    });
    expect(
      knownPlayer("https://www.twitch.tv/videos/2290112233"),
    ).toMatchObject({
      src: `https://player.twitch.tv/?video=v2290112233&${parents}`,
    });
    expect(
      knownPlayer(
        "https://www.twitch.tv/somechannel/clip/FunnyClipSlug-abc123",
      ),
    ).toMatchObject({
      src: `https://clips.twitch.tv/embed?clip=FunnyClipSlug-abc123&${parents}`,
    });
    expect(knownPlayer("https://clips.twitch.tv/FunnyClipSlug")).toMatchObject({
      src: `https://clips.twitch.tv/embed?clip=FunnyClipSlug&${parents}`,
    });
  });
  it("leaves Twitch's own pages alone", () => {
    expect(knownPlayer("https://www.twitch.tv/directory")).not.toMatchObject({
      provider: "Twitch",
    });
    expect(knownPlayer("https://www.twitch.tv/settings")).not.toMatchObject({
      provider: "Twitch",
    });
  });
});
