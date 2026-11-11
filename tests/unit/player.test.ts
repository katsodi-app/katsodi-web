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
      "https://vkvideo.ru/video_ext.php?oid=-238162296&id=456239108&hash=0123abcd4567ef89&hd=2";
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
