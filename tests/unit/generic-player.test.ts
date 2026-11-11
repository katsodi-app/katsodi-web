import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ page: vi.fn() }));
vi.mock(
  "../../src/lib/server/public-player-request",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    publicPlayerPage: mocks.page,
  }),
);
import { genericPlayer } from "../../src/lib/server/generic-player-resolver";
import { knownOembed } from "../../src/lib/server/oembed-providers";
import {
  oembedPlayer,
  pagePlayerSignals,
} from "../../src/lib/server/page-player-parser";
import { readPlayerResolution, knownPlayer } from "../../src/lib/player";
const page = (url: string, body: string, headers = {}) => ({
  url,
  body,
  headers: new Headers(headers),
});
beforeEach(() => vi.resetAllMocks());
it("skips removed providers inside otherwise supported pages", async () => {
  mocks.page.mockResolvedValueOnce(
    page(
      "https://new-video.org/retired",
      '<iframe src="https://reanime.to/watch/test"></iframe><iframe src="https://liveball.sx/match/12"></iframe>',
    ),
  );
  expect(await genericPlayer("https://new-video.org/retired")).toMatchObject({
    kind: "external",
  });
  expect(mocks.page).toHaveBeenCalledTimes(1);
});
it("parses real HTML attributes and entities without treating comments, scripts or templates as players", () => {
  const signals = pagePlayerSignals(
    `<!-- <video src=x> --><script>const fake='<iframe src="https://evil.org/player">';</script><template><video></video></template><iframe data-src=/embed?id=2&amp;lang=en allowfullscreen></iframe>`,
    "https://new-video.org/watch",
  );
  expect(signals).toMatchObject({
    native: false,
    frames: ["https://new-video.org/embed?id=2&lang=en"],
  });
  expect(
    pagePlayerSignals(
      '<div class="skin video-js ready"></div>',
      "https://new-video.org/",
    ).native,
  ).toBe(true);
});
it("discovers an unknown site's nested native player and preserves its original iframe URL", async () => {
  mocks.page
    .mockResolvedValueOnce(
      page(
        "https://new-video.org/watch",
        '<iframe src="https://other-player.org/embed/42" allowfullscreen></iframe>',
      ),
    )
    .mockResolvedValueOnce(
      page(
        "https://other-player.org/embed/42",
        '<video src="/movie.mp4"></video>',
      ),
    );
  const result = await genericPlayer("https://new-video.org/watch");
  expect(result).toMatchObject({
    kind: "iframe",
    src: "https://other-player.org/embed/42",
    presentation: "discovered",
    sync: false,
  });
  expect(readPlayerResolution(result)).toMatchObject(result);
  expect(knownPlayer("https://new-video.org/watch").kind).toBe("discover");
});
it("reads VideoObject metadata and known script-created player containers without eval", () => {
  expect(
    pagePlayerSignals(
      '<script type="application/ld+json">{"@graph":[{"@type":"VideoObject","embedUrl":"/embed/42"}]}</script>',
      "https://new-video.org/watch",
    ).frames,
  ).toEqual(["https://new-video.org/embed/42"]);
  expect(
    pagePlayerSignals(
      '<div id="player"></div><script>jwplayer("player").setup({file:"stream"});</script>',
      "https://new-video.org/",
    ).native,
  ).toBe(true);
  expect(
    pagePlayerSignals(
      '<div id="player"></div><script>throw new Error("not executed")</script>',
      "https://new-video.org/",
    ).native,
  ).toBe(false);
});
it("keeps native players on their source page instead of copying signed streams or removing site UI", async () => {
  mocks.page.mockResolvedValueOnce(
    page(
      "https://new-video.org/watch",
      '<video src="https://cdn.org/private.m3u8?token=abc"></video>',
    ),
  );
  expect(await genericPlayer("https://new-video.org/watch")).toMatchObject({
    kind: "iframe",
    src: "https://new-video.org/watch",
    presentation: "source-page",
  });
  expect(mocks.page).toHaveBeenCalledTimes(1);
});
it("can embed a declared fullscreen player even when its video is created later by JavaScript", async () => {
  mocks.page
    .mockResolvedValueOnce(
      page(
        "https://new-video.org/",
        '<iframe src="https://js-player.org/embed" allowfullscreen></iframe>',
      ),
    )
    .mockResolvedValueOnce(
      page(
        "https://js-player.org/embed",
        '<main id="app"></main><script src="/app.js"></script>',
      ),
    );
  expect(await genericPlayer("https://new-video.org/")).toMatchObject({
    kind: "iframe",
    src: "https://js-player.org/embed",
    presentation: "discovered",
  });
});
it("respects all enforced CSP policies and falls through to another candidate", async () => {
  mocks.page
    .mockResolvedValueOnce(
      page(
        "https://new-video.org/watch",
        '<iframe src="/embed/good"></iframe><iframe src="/embed/bad"></iframe>',
      ),
    )
    .mockResolvedValueOnce(
      page("https://new-video.org/embed/bad", "<video></video>", {
        "Content-Security-Policy": "frame-ancestors *, frame-ancestors 'self'",
      }),
    )
    .mockResolvedValueOnce(
      page("https://new-video.org/embed/good", "<video></video>"),
    );
  expect(await genericPlayer("https://new-video.org/watch")).toMatchObject({
    kind: "iframe",
    src: "https://new-video.org/embed/good",
  });
});
it("does not claim discovery for a login page or an unrecognized script-only app", async () => {
  mocks.page.mockResolvedValue(
    page(
      "https://new-video.org/",
      "<form><input type=password></form><script>loadPlayer()</script>",
    ),
  );
  expect(await genericPlayer("https://new-video.org/")).toMatchObject({
    kind: "external",
    reason: "notFound",
  });
});
it("bounds recursive iframe traversal and detects cycles", async () => {
  mocks.page.mockImplementation(async (url: string) =>
    page(url, `<iframe src="/player/loop"></iframe>`),
  );
  expect(await genericPlayer("https://new-video.org/")).toMatchObject({
    kind: "external",
    reason: "notFound",
  });
  expect(mocks.page.mock.calls.length).toBeLessThanOrEqual(6);
});
it("reads twitter:player cards and oEmbed discovery links as declared embeds", () => {
  const signals = pagePlayerSignals(
    `<meta name="twitter:player" content="https://new-video.org/card/7">
     <link rel="alternate" type="application/json+oembed" href="/oembed?url=https%3A%2F%2Fnew-video.org%2Fw%2F7&amp;format=json">
     <link rel="alternate" type="text/xml+oembed" href="/oembed.xml">
     <link rel="alternate" type="application/json+oembed" href="http://insecure.org/oembed">`,
    "https://new-video.org/w/7",
  );
  expect(signals.frames).toEqual(["https://new-video.org/card/7"]);
  expect(signals.declared).toContain("https://new-video.org/card/7");
  expect(signals.oembed).toEqual([
    "https://new-video.org/oembed?url=https%3A%2F%2Fnew-video.org%2Fw%2F7&format=json",
  ]);
});
it("accepts only video/rich oEmbed iframes and never treats scripts as players", () => {
  const endpoint = "https://new-video.org/oembed";
  const json = (data: object) => JSON.stringify(data);
  expect(
    oembedPlayer(
      json({
        type: "video",
        html: '<iframe src="https://player.new-video.org/e/7" allowfullscreen></iframe>',
      }),
      endpoint,
    ),
  ).toBe("https://player.new-video.org/e/7");
  for (const bad of [
    json({ type: "photo", html: '<iframe src="https://a.org/e"></iframe>' }),
    json({ type: "link" }),
    json({ type: "rich", html: "<script src=https://a.org/x.js></script>" }),
    json({
      type: "video",
      html: '<iframe src="javascript:alert(1)"></iframe>',
    }),
    json({ type: "video", html: "x".repeat(16385) }),
    "not json",
  ])
    expect(oembedPlayer(bad, endpoint), bad.slice(0, 40)).toBeNull();
});
it("prefers a page's oEmbed player and still checks that player's framing headers", async () => {
  mocks.page.mockImplementation(async (url: string, _deadline, _r, format) => {
    if (url === "https://new-video.org/w/7")
      return page(
        url,
        '<link rel="alternate" type="application/json+oembed" href="/oembed?id=7"><iframe src="/ads/banner" allowfullscreen></iframe>',
      );
    if (url === "https://new-video.org/oembed?id=7") {
      expect(format).toBe("json");
      return page(
        url,
        JSON.stringify({
          type: "video",
          html: '<iframe src="https://player.new-video.org/e/7"></iframe>',
        }),
      );
    }
    if (url === "https://player.new-video.org/e/7")
      return page(url, '<video src="/7.mp4"></video>');
    throw new Error(`unexpected ${url}`);
  });
  expect(await genericPlayer("https://new-video.org/w/7")).toMatchObject({
    kind: "iframe",
    src: "https://player.new-video.org/e/7",
    presentation: "discovered",
    sync: false,
  });
  expect(mocks.page.mock.calls.map((call) => call[0])).not.toContain(
    "https://new-video.org/ads/banner",
  );
});
it("does not embed an oEmbed player that forbids framing, and survives a broken endpoint", async () => {
  mocks.page.mockImplementation(async (url: string) => {
    if (url === "https://new-video.org/w/8")
      return page(
        url,
        '<link rel="alternate" type="application/json+oembed" href="/oembed?id=8">',
      );
    if (url === "https://new-video.org/oembed?id=8")
      return page(
        url,
        JSON.stringify({
          type: "video",
          html: '<iframe src="https://player.new-video.org/e/8"></iframe>',
        }),
      );
    return page(url, "<video></video>", { "X-Frame-Options": "SAMEORIGIN" });
  });
  expect(await genericPlayer("https://new-video.org/w/8")).toMatchObject({
    kind: "external",
    reason: "blocked",
  });
  mocks.page.mockReset();
  mocks.page.mockImplementation(async (url: string) => {
    if (url.includes("/oembed")) throw new Error("broken endpoint");
    if (url === "https://new-video.org/w/9")
      return page(
        url,
        '<link rel="alternate" type="application/json+oembed" href="/oembed?id=9"><iframe src="/embed/9" allowfullscreen></iframe>',
      );
    return page(url, "<video></video>");
  });
  expect(await genericPlayer("https://new-video.org/w/9")).toMatchObject({
    kind: "iframe",
    src: "https://new-video.org/embed/9",
  });
});
it("maps only exact reviewed hosts to their official oEmbed endpoints", () => {
  expect(knownOembed("https://vimeo.com/76979871#t=10")?.request).toBe(
    "https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F76979871&format=json",
  );
  expect(knownOembed("https://rutube.ru/video/abc/")?.provider.name).toBe(
    "Rutube",
  );
  for (const url of [
    "https://evil-vimeo.com/1",
    "https://vimeo.com.evil.org/1",
    "http://vimeo.com/1",
    "https://new-video.org/w/1",
  ])
    expect(knownOembed(url), url).toBeNull();
});
it("uses an official provider's own player without fetching it, but checks foreign hosts", async () => {
  const oembed = (src: string) =>
    page(
      "https://www.dailymotion.com/services/oembed",
      JSON.stringify({ type: "video", html: `<iframe src="${src}"></iframe>` }),
    );
  mocks.page.mockResolvedValueOnce(
    oembed("https://geo.dailymotion.com/player.html?video=x1"),
  );
  expect(
    await genericPlayer("https://www.dailymotion.com/video/x1"),
  ).toMatchObject({
    kind: "iframe",
    src: "https://geo.dailymotion.com/player.html?video=x1",
    provider: "Dailymotion",
  });
  expect(mocks.page).toHaveBeenCalledTimes(1);
  mocks.page.mockReset();
  mocks.page.mockImplementation(async (url: string) =>
    url.includes("/services/oembed")
      ? oembed("https://tracker.example.org/frame")
      : page(url, "<video></video>", { "X-Frame-Options": "DENY" }),
  );
  expect(
    await genericPlayer("https://www.dailymotion.com/video/x2"),
  ).toMatchObject({ kind: "external", reason: "blocked" });
  expect(mocks.page.mock.calls.map((call) => call[0])).toContain(
    "https://tracker.example.org/frame",
  );
});
