import { test, expect, type Page, type Route } from "@playwright/test";
import { captureAll, skipCapture } from "./capture";
import { build } from "esbuild";
import type { RoomSnapshot } from "../../src/lib/server/network-data";
import type { PlayerResolution } from "../../src/lib/player";
const roomId = "20000000-0000-4000-8000-000000000001";
// Matches the room snapshot endpoint with or without the ?after= delta cursor.
const roomApi = new RegExp(`/api/rooms/${roomId}(?:\\?.*)?$`);
const mine = "10000000-0000-4000-8000-000000000001",
  friend = "10000000-0000-4000-8000-000000000002";
let bundle = "",
  styles: string[] = [];
// Playback states the room's host published during the current test.
let playbackPosts: NonNullable<RoomSnapshot["playback"]>[] = [];
// Presence heartbeats the room sent during this test.
let presencePings: string[] = [];
// Shared browser actions the fake server handled during this test.
let browserActions: string[] = [];
// Queue actions the fixture's fake server handled during this test.
let queueActions: string[] = [];
// "Now playing" details the fixture's media endpoint returns in this test.
let mediaFixture: unknown = null;
// Room website actions, and the embedding verdict the fake server returns.
let siteActions: string[] = [];
// Demo actions the fake server handled, and the embedding verdict for it.
let demoActions: string[] = [];
// Occupancy pings (Task 3.1) the room sent during this test.
let occupancyPings = 0;
let demoEmbedding: "allowed" | "blocked" = "allowed";
let siteCheck: "allowed" | "blocked" | "unchecked" = "allowed";
test.beforeEach(() => {
  siteActions = [];
  siteCheck = "allowed";
  demoActions = [];
  demoEmbedding = "allowed";
  occupancyPings = 0;
  playbackPosts = [];
  mediaFixture = null;
  queueActions = [];
  browserActions = [];
  presencePings = [];
});
const fakeYouTubeApi = `
window.__yt = { players: [], calls: [], gesture: false };
document.addEventListener("click", () => { window.__yt.gesture = true; }, true);
window.YT = { Player: class {
  constructor(el, opts) {
    this.opts = opts; this.state = -1; this.time = 0; this.t0 = 0;
    window.__yt.players.push(this);
    setTimeout(() => opts.events.onReady && opts.events.onReady({ target: this }), 0);
  }
  now() { return this.state === 1 ? this.time + (performance.now() - this.t0) / 1000 : this.time; }
  emit(s) {
    this.time = this.now(); this.state = s;
    if (s === 1) this.t0 = performance.now();
    this.opts.events.onStateChange && this.opts.events.onStateChange({ data: s, target: this });
  }
  playVideo() {
    window.__yt.calls.push(["play"]);
    if (window.__ytBlocked && !window.__yt.gesture) return;
    if (this.state !== 1) this.emit(1);
  }
  pauseVideo() { window.__yt.calls.push(["pause"]); if (this.state === 1) this.emit(2); }
  seekTo(s) { window.__yt.calls.push(["seek", s]); this.time = s; if (this.state === 1) this.t0 = performance.now(); }
  getCurrentTime() { return this.now(); }
  getPlayerState() { return this.state; }
  destroy() {}
  // Test helpers: the viewer uses YouTube's own controls.
  user(s, at) { if (at !== undefined) { this.time = at; this.t0 = performance.now(); } this.emit(s); }
  scrub(at) { this.time = at; this.t0 = performance.now(); }
} };
setTimeout(() => window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(), 0);
`;
const seed = (): RoomSnapshot => ({
  room: {
    id: roomId,
    name: "Вечер без спешки",
    description: "Смотрим, обсуждаем и остаёмся ещё на одну серию.",
    owner_id: friend,
    format: "video",
    visibility: "private",
    url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
    art: "orbit",
    closed_at: null,
    created_at: "2026-11-01T20:00:00Z",
  },
  userId: mine,
  joined: true,
  mediaEnabled: true,
  invites: [],
  members: [
    { user_id: mine, role: "member", status: "active" },
    { user_id: friend, role: "owner", status: "active" },
  ],
  profiles: [
    { id: mine, display_name: "Katsodi", username: "katsodi" },
    { id: friend, display_name: "Саша", username: "sasha" },
  ],
  messages: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      sender_id: friend,
      body: "Ну что, все устроились поудобнее? ✨",
      created_at: "2026-11-01T20:01:00Z",
      kind: "text",
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      sender_id: mine,
      body: "Чай готов. Можно начинать!",
      created_at: "2026-11-01T20:02:00Z",
      kind: "text",
    },
    {
      id: "30000000-0000-4000-8000-000000000003",
      sender_id: friend,
      body: "[sticker]",
      sticker_id: "cozy",
      created_at: "2026-11-01T20:03:00Z",
      kind: "sticker",
    },
  ],
});
test.beforeAll(async ({ request }) => {
  const compiled = await build({
    entryPoints: ["tests/fixtures/chat-preview.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "test-only-actions",
        setup(builder) {
          builder.onResolve({ filter: /^livekit-client$/ }, () => ({
            path: process.cwd() + "/tests/fixtures/voice-sdk.ts",
          }));
          builder.onResolve({ filter: /^@hyperbeam\/web$/ }, () => ({
            path: process.cwd() + "/tests/fixtures/hyperbeam-sdk.ts",
          }));
          builder.onResolve(
            {
              filter:
                /^@\/lib\/server\/(auth|room|browser|friend|progression)-actions$/,
            },
            (args) => ({ path: args.path, namespace: "test-actions" }),
          );
          builder.onLoad({ filter: /.*/, namespace: "test-actions" }, () => ({
            contents: [
              "updateRoomSource",
              "updateRoomSite",
              "pingRoomOccupancy",
              "setDemoAnnotations",
              "requestDemo",
              "decideDemo",
              "pauseDemo",
              "stopDemo",
              "beatDemo",
              "createNetworkRoom",
              "joinNetworkRoom",
              "sendMessage",
              "sendSticker",
              "createInvite",
              "redeemInvite",
              "moderateRoom",
              "deleteMessage",
              "revokeInvite",
              "updatePlayback",
              "addToQueue",
              "removeFromQueue",
              "playFromQueue",
              "importToQueue",
              "mixQueue",
              "startSharedBrowser",
              "endSharedBrowser",
              "claimSharedBrowserControl",
              "reportSharedBrowserUrl",
              "pingRoomPresence",
              "signIn",
              "signUp",
              "recoverPassword",
              "resetPassword",
              "saveProfile",
              "signOut",
              "resendConfirmation",
            ]
              .map(
                (name) =>
                  `export async function ${name}(prev, form) { form.set('_action','${name}'); const r=await fetch('/test-chat-action',{method:'POST',body:form}); return r.json(); }`,
              )
              .join("\n"),
          }));
          // No Next router context in the isolated harness (profile media,
          // friends and other pages call router.refresh()).
          builder.onResolve({ filter: /^next\/navigation$/ }, () => ({
            path: "navigation",
            namespace: "test-navigation",
          }));
          builder.onLoad(
            { filter: /.*/, namespace: "test-navigation" },
            () => ({
              contents:
                "export function useRouter(){return {refresh(){},prefetch(){}}} export function usePathname(){return '/room/20000000-0000-4000-8000-000000000001'}",
            }),
          );
          builder.onResolve({ filter: /^next\/link$/ }, () => ({
            path: "link",
            namespace: "test-link",
          }));
          builder.onLoad({ filter: /.*/, namespace: "test-link" }, () => ({
            contents:
              "import {createElement} from 'react'; export default function Link({children, ...props}) {return createElement('a',props,children)}",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  bundle = compiled.outputFiles[0].text;
  const html = await (await request.get("/home")).text();
  styles = [
    ...new Set(
      [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) =>
        m[1].replaceAll("&amp;", "&"),
      ),
    ),
  ];
  expect(styles.length).toBeGreaterThan(0);
});
async function openFixture(
  page: Page,
  media = true,
  initial?: RoomSnapshot,
  player?: PlayerResolution,
  voiceReady = false,
) {
  const snapshot = initial || seed();
  snapshot.mediaEnabled = media;
  await page.route(`**/api/rooms/${roomId}/voice`, (route) =>
    route.fulfill(
      voiceReady
        ? {
            json:
              route.request().method() === "POST"
                ? { url: "wss://fixture.livekit.cloud", token: "fixture" }
                : { ready: true },
          }
        : { status: 503, json: { error: "unconfigured" } },
    ),
  );
  await page.route("**/chat-preview-bundle.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: bundle }),
  );
  await page.route("**/chat-preview-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="ru" data-theme="obsidian"><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body><div id="root"></div><script>window.__chatFixture=${JSON.stringify(snapshot)}</script><script src="/chat-preview-bundle.js"></script></body></html>`,
    }),
  );
  await page.route(roomApi, (route) => route.fulfill({ json: snapshot }));
  await page.route(`**/api/rooms/${roomId}/site`, (route) =>
    route.fulfill({
      json: {
        site: snapshot.site
          ? {
              url: snapshot.site.url,
              embedding: siteCheck,
              src: snapshot.site.url,
            }
          : null,
      },
    }),
  );
  await page.route(`**/api/rooms/${roomId}/demo`, (route) =>
    route.fulfill({
      json:
        route.request().method() === "POST"
          ? {
              url: "wss://fixture.livekit.cloud",
              token: "fixture",
              publish: snapshot.demo?.user_id === mine,
              host: snapshot.members[0].role !== "member",
            }
          : {
              demo: snapshot.demo
                ? {
                    url: snapshot.demo.url,
                    embedding: demoEmbedding,
                    src: snapshot.demo.url,
                  }
                : null,
            },
    }),
  );
  // Websites shown in the room never reach the network in tests.
  await page.route("https://example.org/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Example</title><h1>Example site</h1>",
    }),
  );
  // Stand-in for the official IFrame Player API: same methods and state codes,
  // plus test helpers. __ytBlocked makes playVideo() fail until a page click,
  // like a browser autoplay policy.
  await page.route(`**/api/rooms/${roomId}/media`, (route) =>
    route.fulfill({ json: { details: mediaFixture } }),
  );
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({ contentType: "text/javascript", body: fakeYouTubeApi }),
  );
  await page.route("https://www.youtube.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html style="color-scheme:dark;background:#050505;color:#b5a8c4"><body>Test video provider</body></html>',
    }),
  );
  await page.route("https://api.nextembed.ws/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html style="color-scheme:dark;background:#050505;color:#b5a8c4"><body>Test discovered player</body></html>',
    }),
  );
  await page.route(`**/api/rooms/${roomId}/player`, (route) =>
    route.fulfill({
      json: player || {
        kind: "iframe",
        src: "https://api.nextembed.ws/embed/movie/36036",
        provider: "Kinogo",
        sync: false,
      },
    }),
  );
  await page.route(`**/api/rooms/${roomId}/images`, async (route) => {
    const form = await new Response(
      new Uint8Array(route.request().postDataBuffer() || []),
      {
        headers: { "content-type": route.request().headers()["content-type"] },
      },
    ).formData();
    expect(form.get("image")).toBeInstanceOf(Blob);
    snapshot.messages.push({
      id: "40000000-0000-4000-8000-000000000001",
      sender_id: mine,
      created_at: new Date().toISOString(),
      kind: "image",
      body: "[image]",
      image_width: 1,
      image_height: 1,
    });
    await route.fulfill({ json: { status: "success", code: "saved" } });
  });
  await page.route("**/api/chat-images/*", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1EAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.route("**/test-chat-action", async (route) => {
    const form = await new Response(
      new Uint8Array(route.request().postDataBuffer() || []),
      {
        headers: { "content-type": route.request().headers()["content-type"] },
      },
    ).formData();
    const action = form.get("_action");
    if (action === "updatePlayback") {
      snapshot.playback = {
        state: form.get("state") === "playing" ? "playing" : "paused",
        position: Number(form.get("position")),
        updated_at: new Date().toISOString(),
        source_url: String(form.get("source")),
      };
      playbackPosts.push({ ...snapshot.playback });
      return route.fulfill({
        json: { status: "success", code: "saved", playback: snapshot.playback },
      });
    }
    if (action === "pingRoomOccupancy") {
      occupancyPings++;
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "pingRoomPresence") {
      presencePings.push(String(form.get("room")));
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "startSharedBrowser") {
      snapshot.browser = {
        embed_url: "https://abc123.hyperbeam.com/SESSION?token=viewer",
        current_url: null,
        started_at: new Date().toISOString(),
      };
      browserActions.push("start:" + form.get("url"));
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "endSharedBrowser") {
      snapshot.browser = null;
      browserActions.push("end");
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "claimSharedBrowserControl") {
      browserActions.push("claim:" + form.get("connection"));
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "reportSharedBrowserUrl") {
      if (snapshot.browser)
        snapshot.browser.current_url = String(form.get("url"));
      browserActions.push("report:" + form.get("url"));
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "addToQueue") {
      snapshot.queue = [
        ...(snapshot.queue || []),
        {
          id: crypto.randomUUID(),
          url: String(form.get("url")),
          added_by: mine,
          created_at: new Date().toISOString(),
        },
      ];
      queueActions.push("add");
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "importToQueue") {
      // Fake service: any link becomes three Spotify tracks.
      const urls = ["a", "b", "c"].map(
        (x) => `https://open.spotify.com/track/${x.repeat(22)}`,
      );
      snapshot.queue = [
        ...(snapshot.queue || []),
        ...urls.map((url) => ({
          id: crypto.randomUUID(),
          url,
          added_by: mine,
          created_at: new Date().toISOString(),
        })),
      ];
      queueActions.push("import:" + form.get("url"));
      return route.fulfill({
        json: {
          status: "success",
          code: "imported",
          service: "Spotify",
          imported: { added: 3, found: 3, capped: false },
        },
      });
    }
    if (action === "mixQueue") {
      queueActions.push("mix");
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "removeFromQueue") {
      snapshot.queue = (snapshot.queue || []).filter(
        (item) => item.id !== form.get("item"),
      );
      queueActions.push("remove");
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "playFromQueue") {
      const queue = snapshot.queue || [];
      const item = form.get("item")
        ? queue.find((entry) => entry.id === form.get("item"))
        : queue[0];
      if (!item)
        return route.fulfill({ json: { status: "error", code: "failed" } });
      snapshot.room.url = item.url;
      snapshot.playback = null;
      snapshot.queue = queue.filter((entry) => entry.id !== item.id);
      queueActions.push("play");
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "setDemoAnnotations") {
      demoActions.push("annotations:" + form.get("open"));
      if (snapshot.demo)
        snapshot.demo = {
          ...snapshot.demo,
          annotations_open: form.get("open") === "1",
        };
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (
      [
        "requestDemo",
        "decideDemo",
        "pauseDemo",
        "stopDemo",
        "beatDemo",
      ].includes(String(action))
    ) {
      const now = new Date().toISOString();
      const host = snapshot.members[0].role !== "member";
      if (action === "requestDemo") {
        demoActions.push("request:" + form.get("url"));
        snapshot.demo = {
          user_id: mine,
          url: String(form.get("url")),
          status: host ? "live" : "pending",
          requested_at: now,
          decided_by: host ? mine : null,
          paused_by: null,
          seen_at: now,
        };
      } else if (action === "decideDemo") {
        demoActions.push("decide:" + form.get("accept"));
        snapshot.demo =
          form.get("accept") === "1" && snapshot.demo
            ? {
                ...snapshot.demo,
                status: "live",
                decided_by: mine,
                seen_at: now,
              }
            : null;
      } else if (action === "pauseDemo") {
        demoActions.push("pause:" + form.get("paused"));
        if (snapshot.demo)
          snapshot.demo = {
            ...snapshot.demo,
            status: form.get("paused") === "1" ? "paused" : "live",
            paused_by: form.get("paused") === "1" ? mine : null,
          };
      } else if (action === "stopDemo") {
        demoActions.push("stop");
        snapshot.demo = null;
      } else if (snapshot.demo) snapshot.demo.seen_at = now;
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "updateRoomSite") {
      const url = String(form.get("url") || "");
      snapshot.site = url
        ? { url, updated_at: new Date().toISOString() }
        : null;
      siteActions.push("site:" + url);
      return route.fulfill({ json: { status: "success", code: "saved" } });
    }
    if (action === "updateRoomSource") {
      snapshot.room.url = String(form.get("url") || "");
      snapshot.room.source_updated_at = new Date().toISOString();
    } else if (action === "deleteMessage")
      snapshot.messages = snapshot.messages.filter(
        (m) => m.id !== form.get("message"),
      );
    else
      snapshot.messages.push({
        id: crypto.randomUUID(),
        sender_id: mine,
        created_at: new Date().toISOString(),
        kind: action === "sendSticker" ? "sticker" : "text",
        sticker_id:
          action === "sendSticker" ? String(form.get("sticker")) : null,
        body: String(form.get("body") || "[sticker]"),
      });
    await route.fulfill({ json: { status: "success", code: "saved" } });
  });
  await page.goto("/chat-preview-test");
  await expect(
    page.getByRole("heading", { name: "Вечер без спешки" }),
  ).toBeVisible();
}
test("room composition, text and stickers work without live infrastructure", async ({
  page,
}, info) => {
  await openFixture(page);
  await expect(
    page.getByText("Чай готов. Можно начинать!", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Стикеры", exact: true }).click();
  await page.getByRole("button", { name: "Любовь", exact: true }).click();
  await expect(page.getByText("Стикер готов к отправке")).toBeVisible();
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(
    page
      .locator(".chat-messages")
      .getByRole("img", { name: "Любовь", exact: true }),
  ).toBeVisible();
  const input = page.getByRole("textbox", { name: "Сообщение", exact: true });
  await input.fill("Посмотрим ещё серию?");
  await input.press("Enter");
  await expect(
    page.getByText("Посмотрим ещё серию?", { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/chat-room-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  // The sidebar's People tab lists members and room actions; chat hides.
  await page.getByRole("tab", { name: /Люди/ }).click();
  await expect(page.locator(".member-row")).toHaveCount(2);
  await expect(page.locator(".chat-messages")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Покинуть комнату" }),
  ).toBeVisible();
  await page
    .locator(".room-side")
    .screenshot({ path: `.local/room-people-${info.project.name}.png` });
  await page.getByRole("tab", { name: /Чат/ }).click();
  await expect(page.locator(".chat-messages")).toBeVisible();
});

test("retired anime and live match integrations never return through a stored player result", async ({
  page,
}) => {
  // Publication Content Cleanup retired these sources. A player result saved
  // before the cleanup must not render their frames again.
  const snapshot = seed();
  snapshot.room.url = "https://reanime.to/watch/spirited-away-44grtu?ep=1";
  const framed: string[] = [];
  await page.route(/^https:\/\/(flixcloud\.cc|liveball\.sx)\//, (route) => {
    framed.push(route.request().url());
    return route.fulfill({ contentType: "text/html", body: "<html></html>" });
  });
  await openFixture(page, true, snapshot, {
    kind: "iframe",
    src: "https://flixcloud.cc/e/jbbfc4dspqs2?v=1&autoPlay=false",
    provider: "Re:ANIME",
    sync: false,
  });
  await expect(page.locator(".room-player")).toBeVisible();
  await expect(
    page.locator('.room-player iframe[src*="flixcloud.cc"]'),
  ).toHaveCount(0);
  snapshot.room.url = "https://liveball.sx/match/1493215";
  await openFixture(page, true, snapshot, {
    kind: "iframe",
    src: "https://liveball.sx/match/1493215#player_block",
    provider: "LiveBall",
    presentation: "source-page",
    sync: false,
  });
  await expect(page.locator(".room-player")).toBeVisible();
  await expect(
    page.locator('.room-player iframe[src*="liveball.sx"]'),
  ).toHaveCount(0);
  expect(framed).toEqual([]);
});

test("a previously unknown site can display its discovered player and retains an external fallback", async ({
  page,
}) => {
  const snapshot = seed();
  snapshot.room.url = "https://new-video.org/watch/42";
  await page.route("https://other-player.org/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body><video controls></video></body></html>",
    }),
  );
  await openFixture(page, true, snapshot, {
    kind: "iframe",
    src: "https://other-player.org/embed/42",
    provider: "other-player.org",
    presentation: "discovered",
    sync: false,
  });
  await expect(page.locator(".room-player iframe")).toHaveAttribute(
    "src",
    "https://other-player.org/embed/42",
  );
  await expect(page.locator(".room-player iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-presentation",
  );
  await expect(page.locator(".room-player footer a")).toHaveAttribute(
    "href",
    snapshot.room.url!,
  );
  await expect(page.locator(".room-player .pill")).toHaveText(
    "Плеер в комнате",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("player embeds a supported URL and explains independent playback in both locales", async ({
  page,
}, info) => {
  await openFixture(page);
  const frame = page.locator(".room-player iframe");
  await expect(frame).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/5qap5aO4i9A?playsinline=1&rel=0",
  );
  await expect(frame).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-presentation",
  );
  await expect(
    page.getByText("Видео запускается у каждого участника отдельно.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(frame).toHaveAttribute("title", "Embedded video player");
  await page.screenshot({
    path: ".local/player-" + info.project.name + ".png",
    fullPage: true,
  });
});

test("owner source changes reach two isolated member views through room polling", async ({
  page,
  browser,
  baseURL,
}) => {
  const commonRoom = { ...seed().room, source_updated_at: null };
  const ownerSnapshot = { ...seed(), userId: friend, room: commonRoom };
  const memberSnapshot = { ...seed(), userId: mine, room: commonRoom };
  const other = await browser.newPage({
    baseURL,
    viewport: page.viewportSize()!,
  });
  try {
    await openFixture(page, true, ownerSnapshot);
    await openFixture(other, true, memberSnapshot);
    await expect(other.locator(".room-source-form")).toHaveCount(0);
    await page
      .getByLabel("Что будем смотреть?", { exact: true })
      .fill("https://kinogo.is/240-diuna.html");
    await page
      .getByRole("button", { name: "Показать всем", exact: true })
      .click();
    for (const target of [page, other])
      await expect(target.locator(".room-player iframe")).toHaveAttribute(
        "src",
        "https://api.nextembed.ws/embed/movie/36036",
      );
  } finally {
    await other.close();
  }
});
test("voice lounge uses actual call state, explicit microphone controls, deafen and teardown", async ({
  page,
}, info) => {
  await openFixture(page, true, undefined, undefined, true);
  await openVoiceTab(page);
  const lounge = page.locator(".voice-lounge");
  await expect(
    lounge.getByRole("button", { name: "Включить микрофон", exact: true }),
  ).toBeDisabled();
  await lounge
    .getByRole("button", { name: "Войти в голос", exact: true })
    .click();
  await expect(lounge.getByText("На связи", { exact: true })).toBeVisible();
  await expect(lounge.locator("audio")).toHaveCount(1);
  const microphone = lounge.getByRole("button", {
    name: "Включить микрофон",
    exact: true,
  });
  await expect(microphone).toHaveAttribute("aria-pressed", "false");
  await microphone.click();
  await expect(
    lounge.getByRole("button", { name: "Выключить микрофон", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await lounge
    .getByRole("button", { name: "Отключить звук и микрофон", exact: true })
    .click();
  await expect(
    lounge.getByRole("button", { name: "Включить микрофон", exact: true }),
  ).toBeDisabled();
  await expect(lounge.locator("audio")).toHaveJSProperty("muted", true);
  await lounge
    .getByRole("button", { name: "Вернуть звук и микрофон", exact: true })
    .click();
  await expect(lounge.locator("audio")).toHaveJSProperty("muted", false);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("voice-fixture-speaking")),
  );
  await expect(lounge.locator(".is-speaking")).toHaveCount(1);
  await lounge
    .getByRole("button", { name: "Настройки звука", exact: true })
    .click();
  await expect(lounge.getByLabel("Микрофон", { exact: true })).toBeVisible();
  await lounge.getByLabel("Микрофон", { exact: true }).selectOption("");
  await expect(lounge.getByRole("alert")).toHaveCount(0);
  await lounge
    .getByRole("button", { name: "Настройки звука", exact: true })
    .click();
  const bounds = await lounge.evaluate((section) => {
    const box = section.getBoundingClientRect();
    return [
      ...section.querySelectorAll(
        ".voice-symbol,.voice-hint,.voice-controls button",
      ),
    ].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        className: el.className,
        left: r.left - box.left,
        right: r.right - box.right,
      };
    });
  });
  expect(
    bounds.every((b) => b.left >= 0 && b.right <= 0),
    JSON.stringify(bounds),
  ).toBe(true);
  await lounge.screenshot({
    path: `.local/voice-lounge-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    lounge.getByRole("heading", { name: "Voice lounge" }),
  ).toBeVisible();
  await lounge.getByRole("button", { name: "Leave call", exact: true }).click();
  await expect(lounge.locator("audio")).toHaveCount(0);
  await expect(
    lounge.getByRole("button", { name: "Join voice", exact: true }),
  ).toBeVisible();
});
test("voice remains disabled without its server and disconnects after access is revoked", async ({
  page,
}) => {
  await openFixture(page);
  await openVoiceTab(page);
  await expect(
    page.getByRole("button", { name: "Войти в голос", exact: true }),
  ).toBeDisabled();
  await openFixture(page, true, undefined, undefined, true);
  await openVoiceTab(page);
  await page
    .getByRole("button", { name: "Войти в голос", exact: true })
    .click();
  await expect(page.locator(".voice-audio audio")).toHaveCount(1);
  await page.route(`**/api/rooms/${roomId}/voice`, (route) =>
    route.fulfill({ status: 403, json: { error: "access" } }),
  );
  await expect(page.locator(".voice-lounge [role=alert]")).toContainText(
    "Доступ к голосовой комнате отозван",
  );
  await expect(page.locator(".voice-audio audio")).toHaveCount(0);
});
async function syntheticMicrophone(
  page: Page,
  mode: "signal" | "denied" | "delayed" = "signal",
) {
  await page.addInitScript((mode) => {
    const state = window as typeof window & {
      __micRequests: number;
      __micTracks: MediaStreamTrack[];
      __resolveMic?: () => void;
    };
    state.__micRequests = 0;
    state.__micTracks = [];
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
      value: async () => [
        {
          kind: "audioinput",
          deviceId: "synthetic",
          label: "Synthetic microphone",
        },
      ],
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        state.__micRequests++;
        if (mode === "denied")
          throw new DOMException("Test permission denied", "NotAllowedError");
        const context = new AudioContext(),
          oscillator = context.createOscillator(),
          destination = context.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        void context.resume();
        const stream = destination.stream;
        state.__micTracks.push(...stream.getTracks());
        stream.getTracks().forEach((track) => {
          const stop = track.stop.bind(track);
          track.stop = () => {
            stop();
            void context.close();
          };
        });
        if (mode === "delayed")
          return await new Promise<MediaStream>((resolve) => {
            state.__resolveMic = () => resolve(stream);
          });
        return stream;
      },
    });
  }, mode);
}
test("local microphone test measures synthetic audio and releases it before joining voice", async ({
  page,
}) => {
  await syntheticMicrophone(page);
  await openFixture(page, true, undefined, undefined, true);
  await openVoiceTab(page);
  await page
    .getByRole("button", { name: "Проверить микрофон", exact: true })
    .click();
  expect(await page.evaluate(() => Reflect.get(window, "__micRequests"))).toBe(
    0,
  );
  await page
    .getByRole("button", { name: "Начать проверку", exact: true })
    .click();
  const meter = page.getByRole("meter", { name: "Уровень микрофона" });
  await expect
    .poll(async () => Number(await meter.getAttribute("aria-valuenow")))
    .toBeGreaterThan(0);
  await expect(page.getByLabel("Микрофон", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Войти в голос", exact: true })
    .click();
  await expect(page.locator(".voice-state")).toContainText("На связи");
  expect(
    await page.evaluate(() =>
      (Reflect.get(window, "__micTracks") as MediaStreamTrack[]).every(
        (t) => t.readyState === "ended",
      ),
    ),
  ).toBe(true);
});
test("cancelling microphone permission disposes a late stream", async ({
  page,
}) => {
  await syntheticMicrophone(page, "delayed");
  await openFixture(page);
  await openVoiceTab(page);
  await page
    .getByRole("button", { name: "Проверить микрофон", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Начать проверку", exact: true })
    .click();
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await page.evaluate(() => Reflect.get(window, "__resolveMic")());
  await expect
    .poll(() =>
      page.evaluate(() =>
        (Reflect.get(window, "__micTracks") as MediaStreamTrack[]).every(
          (t) => t.readyState === "ended",
        ),
      ),
    )
    .toBe(true);
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
});
test("microphone permission errors are actionable in both locales", async ({
  page,
}, info) => {
  await syntheticMicrophone(page, "denied");
  await openFixture(page);
  await openVoiceTab(page);
  await page
    .getByRole("button", { name: "Проверить микрофон", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Начать проверку", exact: true })
    .click();
  await expect(page.locator(".mic-check [role=alert]")).toContainText(
    "Разреши микрофон",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator(".mic-check [role=alert]")).toContainText(
    "Allow the microphone",
  );
  await page
    .locator(".voice-lounge")
    .screenshot({ path: `.local/microphone-check-${info.project.name}.png` });
});

test("image selection validates size/type and can be removed", async ({
  page,
}) => {
  await openFixture(page);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "big.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("до 2 МБ");
  await input.setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.getByRole("alert")).toContainText("JPG, PNG или WebP");
  await input.setInputFiles({
    name: "small.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1EAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("img", { name: "Предпросмотр картинки" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Убрать вложение" }).click();
  await expect(
    page.getByRole("img", { name: "Предпросмотр картинки" }),
  ).toHaveCount(0);
  await input.setInputFiles({
    name: "small.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1EAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Картинка в чате", exact: true }),
  ).toBeVisible();
});

test("revoked access hides the previously loaded conversation", async ({
  page,
}) => {
  await openFixture(page);
  await expect(
    page.getByText("Чай готов. Можно начинать!", { exact: true }),
  ).toBeVisible();
  await page.route(roomApi, (route) =>
    route.fulfill({ status: 404, json: { error: "unavailable" } }),
  );
  await expect(page.getByRole("alert")).toContainText(
    "Комната недоступна или доступ отозван.",
  );
  await expect(page.locator(".chat-messages")).toHaveCount(0);
});
test("a transient refresh failure keeps the conversation and the voice call", async ({
  page,
}) => {
  await openFixture(page, true, undefined, undefined, true);
  await openVoiceTab(page);
  await page
    .getByRole("button", { name: "Войти в голос", exact: true })
    .click();
  await expect(page.locator(".voice-audio audio")).toHaveCount(1);
  const outage = (route: Route) =>
    route.fulfill({ status: 503, json: { error: "unavailable" } });
  await page.route(roomApi, outage);
  await expect(
    page.getByRole("status").filter({ hasText: "Связь с комнатой прервалась" }),
  ).toBeVisible();
  // Switching to chat hides the voice panel but must not end the call.
  await page.getByRole("tab", { name: /Чат/ }).click();
  await expect(
    page.getByText("Чай готов. Можно начинать!", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".voice-lounge")).toBeHidden();
  await expect(page.locator(".voice-audio audio")).toHaveCount(1);
  await page.unroute(roomApi, outage);
  await expect(
    page.getByRole("status").filter({ hasText: "Связь с комнатой прервалась" }),
  ).toHaveCount(0);
  await expect(page.locator(".voice-audio audio")).toHaveCount(1);
});
test("polling applies message deltas without pulling a reader away from history", async ({
  page,
}) => {
  const room = seed();
  room.messages = Array.from({ length: 40 }, (_, i) => ({
    id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    sender_id: friend,
    body: `История ${i + 1}`,
    created_at: new Date(Date.UTC(2026, 10, 1, 20, i)).toISOString(),
    kind: "text" as const,
  }));
  await openFixture(page, true, room);
  const list = page.locator(".chat-messages");
  await expect(list.getByText("История 40", { exact: true })).toBeVisible();
  const lastId = room.messages.at(-1)!.id;
  const fresh = {
    id: "30000000-0000-4000-8000-000000000999",
    sender_id: friend,
    body: "Новое сообщение",
    created_at: "2026-11-01T21:00:00Z",
    kind: "text" as const,
  };
  const ids = [...room.messages.map((m) => m.id), fresh.id];
  const cursors: (string | null)[] = [];
  // Register the delta handler before scrolling so the next poll uses it.
  await page.route(roomApi, (route) => {
    const after = new URL(route.request().url()).searchParams.get("after");
    cursors.push(after);
    if (after === lastId)
      return route.fulfill({
        json: { ...room, messages: [fresh], messageIds: ids },
      });
    if (after === fresh.id)
      return route.fulfill({
        json: { ...room, messages: [], messageIds: ids },
      });
    return route.fulfill({
      json: { ...room, messages: [...room.messages, fresh] },
    });
  });
  const scrollable = await list.evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll"));
    return el.scrollHeight > el.clientHeight + 100;
  });
  expect(scrollable).toBe(true);
  await expect(list.getByText("Новое сообщение", { exact: true })).toHaveCount(
    1,
  );
  // The delta kept every earlier message and did not trigger a full resync.
  await expect(list.locator("li.chat-message")).toHaveCount(41);
  expect(cursors[0]).toBe(lastId);
  expect(cursors).not.toContain(null);
  expect(await list.evaluate((el) => el.scrollTop)).toBeLessThan(40);
  // Hidden tabs stop polling; showing the tab polls again at once.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(500);
  const whileHidden = cursors.length;
  await page.waitForTimeout(4000);
  expect(cursors.length).toBe(whileHidden);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => cursors.length).toBeGreaterThan(whileHidden);
});
test("missing media migration disables attachments and keeps text composer", async ({
  page,
}) => {
  await openFixture(page, false);
  await expect(
    page.getByRole("button", { name: "Стикеры", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Прикрепить картинку", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Сообщение", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByText(
      "Attachments are not enabled for this room yet. Text messages are available.",
    ),
  ).toBeVisible();
});
// The voice lounge lives in the room sidebar's Voice tab (kept mounted).
async function openVoiceTab(page: Page) {
  await page.getByRole("tab", { name: /Голос|Voice/ }).click();
  await expect(page.locator(".voice-lounge")).toBeVisible();
}
type FakePlayer = {
  user(state: number, at?: number): void;
  scrub(at: number): void;
  getCurrentTime(): number;
  getPlayerState(): number;
};
type FakeYouTube = {
  players: FakePlayer[];
  calls: [string, number?][];
};
const yt = (page: Page) =>
  page.evaluate(() => {
    const state = Reflect.get(window, "__yt") as FakeYouTube;
    const player = state.players[0];
    return {
      players: state.players.length,
      calls: state.calls,
      time: player?.getCurrentTime() ?? 0,
      state: player?.getPlayerState() ?? -1,
    };
  });
test("the host's play, pause and seek are published as the room timeline", async ({
  page,
}) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.playback = null;
  await openFixture(page, true, room);
  await expect(
    page.getByText("Ты управляешь просмотром", { exact: false }),
  ).toBeVisible();
  await expect.poll(async () => (await yt(page)).players).toBe(1);
  await page.waitForTimeout(300);
  // The host presses play at 12 s with YouTube's own controls.
  await page.evaluate(() =>
    (Reflect.get(window, "__yt") as FakeYouTube).players[0].user(1, 12),
  );
  await expect.poll(() => playbackPosts.length).toBe(1);
  expect(playbackPosts[0]).toMatchObject({
    state: "playing",
    source_url: room.room.url,
  });
  expect(playbackPosts[0].position).toBeCloseTo(12, 0);
  // Seeking while playing is detected without a state change event.
  await page.evaluate(() =>
    (Reflect.get(window, "__yt") as FakeYouTube).players[0].scrub(95),
  );
  await expect.poll(() => playbackPosts.length).toBe(2);
  expect(playbackPosts[1].state).toBe("playing");
  expect(playbackPosts[1].position).toBeGreaterThan(94);
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    (Reflect.get(window, "__yt") as FakeYouTube).players[0].user(2),
  );
  await expect.poll(() => playbackPosts.length).toBe(3);
  expect(playbackPosts[2].state).toBe("paused");
  // The host is never pulled back by its own published state.
  expect((await yt(page)).calls.filter(([c]) => c === "seek")).toEqual([]);
});
test("members follow the shared timeline and can join when autoplay is blocked", async ({
  page,
}, info) => {
  await page.addInitScript(() => Reflect.set(window, "__ytBlocked", true));
  const room = seed();
  room.playback = {
    state: "playing",
    position: 30,
    updated_at: new Date().toISOString(),
    source_url: room.room.url,
  };
  await openFixture(page, true, room);
  await expect.poll(async () => (await yt(page)).players).toBe(1);
  // It seeks to the shared position and tries to play...
  await expect
    .poll(async () => (await yt(page)).calls.map(([c]) => c))
    .toEqual(expect.arrayContaining(["seek", "play"]));
  const seek = (await yt(page)).calls.find(([c]) => c === "seek")!;
  expect(seek[1]).toBeGreaterThanOrEqual(30);
  expect(seek[1]).toBeLessThan(40);
  // ...and the blocked autoplay becomes an explicit, accessible action.
  const join = page.getByRole("button", { name: "Подключиться к просмотру" });
  await expect(join).toBeVisible();
  await expect(page.locator(".sync-status")).toContainText(
    "Браузер не дал запустить воспроизведение",
  );
  await page
    .locator(".room-player")
    .screenshot({ path: `.local/sync-join-${info.project.name}.png` });
  await join.click();
  await expect.poll(async () => (await yt(page)).state).toBe(1);
  await expect(join).toHaveCount(0);
  await expect(page.locator(".sync-status")).toContainText(
    "Воспроизведение идёт синхронно",
  );
  // A member has no publishing rights: following never posts a state.
  expect(playbackPosts).toEqual([]);
  // The host pauses; the next room refresh pauses this member too.
  const paused = (await yt(page)).time;
  room.playback = {
    state: "paused",
    position: paused,
    updated_at: new Date().toISOString(),
    source_url: room.room.url,
  };
  await expect
    .poll(async () => (await yt(page)).state, { timeout: 8000 })
    .toBe(2);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator(".sync-status")).toContainText(
    "Playback follows the room's host",
  );
});
// Stand-ins for the official Vimeo Player SDK and SoundCloud Widget API.
const fakeVimeoSdk = `
window.__sdk = { calls: [], players: [] };
window.Vimeo = { Player: class {
  constructor() { this.h = {}; this.paused = true; this.t = 0; this.t0 = 0; window.__sdk.players.push(this); }
  ready() { return Promise.resolve(); }
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
  emit(e) { (this.h[e] || []).forEach((f) => f()); }
  now() { return this.paused ? this.t : this.t + (performance.now() - this.t0) / 1000; }
  play() { window.__sdk.calls.push(["play"]); this.t = this.now(); this.paused = false; this.t0 = performance.now(); this.emit("play"); return Promise.resolve(); }
  pause() { window.__sdk.calls.push(["pause"]); this.t = this.now(); this.paused = true; this.emit("pause"); return Promise.resolve(); }
  setCurrentTime(s) { window.__sdk.calls.push(["seek", s]); this.t = s; this.t0 = performance.now(); return Promise.resolve(s); }
  getCurrentTime() { return Promise.resolve(this.now()); }
  destroy() { return Promise.resolve(); }
  // Test helpers: the viewer uses Vimeo's own controls.
  userPlay(at) { this.t = at; this.paused = false; this.t0 = performance.now(); this.emit("play"); }
  userSeek(at) { this.t = at; this.t0 = performance.now(); this.emit("seeked"); }
} };`;
const fakeSoundCloudApi = `
window.__sdk = { calls: [], players: [] };
const Events = { READY: "ready", PLAY: "play", PAUSE: "pause", FINISH: "finish", SEEK: "seek" };
const Widget = () => {
  const w = { h: {}, paused: true, ms: 0, t0: 0,
    bind(e, f) { this.h[e] = f; if (e === "ready") setTimeout(f, 0); },
    unbind(e) { delete this.h[e]; },
    emit(e) { this.h[e] && this.h[e](); },
    now() { return this.paused ? this.ms : this.ms + (performance.now() - this.t0); },
    play() { window.__sdk.calls.push(["play"]); this.ms = this.now(); this.paused = false; this.t0 = performance.now(); this.emit("play"); },
    pause() { window.__sdk.calls.push(["pause"]); this.ms = this.now(); this.paused = true; this.emit("pause"); },
    seekTo(ms) { window.__sdk.calls.push(["seek", ms]); this.ms = ms; this.t0 = performance.now(); },
    getPosition(cb) { cb(this.now()); } };
  window.__sdk.players.push(w);
  return w;
};
Widget.Events = Events;
window.SC = { Widget };`;
type FakeSdk = {
  calls: [string, number?][];
  players: { userPlay(at: number): void; userSeek(at: number): void }[];
};
const sdk = (page: Page) =>
  page.evaluate(() => Reflect.get(window, "__sdk") as FakeSdk | undefined);
async function providerRoutes(page: Page) {
  await page.route("https://player.vimeo.com/api/player.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: fakeVimeoSdk }),
  );
  await page.route("https://w.soundcloud.com/player/api.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: fakeSoundCloudApi }),
  );
  await page.route(
    (url) =>
      url.href.startsWith("https://player.vimeo.com/video/") ||
      url.href.startsWith("https://w.soundcloud.com/player/?"),
    (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<html><body>Provider player</body></html>",
      }),
  );
}
test("a Vimeo host's play and seek are published through the official SDK", async ({
  page,
}) => {
  await providerRoutes(page);
  const room = seed();
  room.room.url = "https://vimeo.com/76979871";
  room.members[0].role = "owner";
  room.playback = null;
  await openFixture(page, true, room, {
    kind: "iframe",
    src: "https://player.vimeo.com/video/76979871",
    provider: "player.vimeo.com",
    presentation: "discovered",
    sync: false,
  });
  await expect(
    page.getByText("Ты управляешь просмотром", { exact: false }),
  ).toBeVisible();
  await expect.poll(async () => (await sdk(page))?.players.length).toBe(1);
  await page.evaluate(() =>
    (Reflect.get(window, "__sdk") as FakeSdk).players[0].userPlay(8),
  );
  await expect.poll(() => playbackPosts.length).toBe(1);
  expect(playbackPosts[0]).toMatchObject({
    state: "playing",
    source_url: "https://vimeo.com/76979871",
  });
  expect(playbackPosts[0].position).toBeCloseTo(8, 0);
  await page.waitForTimeout(300);
  // Vimeo reports seeks as an event: published without waiting for drift.
  await page.evaluate(() =>
    (Reflect.get(window, "__sdk") as FakeSdk).players[0].userSeek(140),
  );
  await expect.poll(() => playbackPosts.length).toBe(2);
  expect(playbackPosts[1].position).toBeGreaterThan(139);
});
test("a SoundCloud member follows the room timeline through the Widget API", async ({
  page,
}) => {
  await providerRoutes(page);
  const room = seed();
  // A video room: there members follow the host's timeline. (In music rooms
  // every member controls playback, see migration 2200.)
  room.room.format = "video";
  room.room.url = "https://soundcloud.com/forss/flickermood";
  room.playback = {
    state: "playing",
    position: 20,
    updated_at: new Date().toISOString(),
    source_url: room.room.url,
  };
  await openFixture(page, true, room, {
    kind: "iframe",
    src: "https://w.soundcloud.com/player/?url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F293",
    provider: "w.soundcloud.com",
    presentation: "discovered",
    sync: false,
  });
  await expect
    .poll(async () => (await sdk(page))?.calls.map(([c]) => c) ?? [])
    .toEqual(expect.arrayContaining(["seek", "play"]));
  const seek = (await sdk(page))!.calls.find(([c]) => c === "seek")!;
  // The Widget API works in milliseconds.
  expect(seek[1]).toBeGreaterThanOrEqual(20000);
  expect(seek[1]).toBeLessThan(30000);
  await expect(page.locator(".sync-status")).toContainText(
    "Воспроизведение идёт синхронно",
  );
  expect(playbackPosts).toEqual([]);
});

test("the player shows provider details as text with a no-referrer cover", async ({
  page,
}, info) => {
  mediaFixture = {
    title: "<b>Lo-fi</b> evening",
    author: "Katsodi Radio",
    thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
    provider: "YouTube",
    duration: 3725,
  };
  await page.route("https://i.ytimg.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: "<svg xmlns='http://www.w3.org/2000/svg'/>",
    }),
  );
  await openFixture(page);
  const strip = page.getByLabel("Сейчас играет");
  // Provider text is shown as text, never as HTML.
  await expect(strip.getByText("<b>Lo-fi</b> evening")).toBeVisible();
  await expect(strip).toContainText("Katsodi Radio · YouTube · 1:02:05");
  await expect(strip.locator("img")).toHaveAttribute(
    "referrerpolicy",
    "no-referrer",
  );
  await page
    .locator(".room-main")
    .screenshot({ path: `.local/now-playing-${info.project.name}.png` });
});
test("details with an unsafe cover are rejected in the browser", async ({
  page,
}) => {
  mediaFixture = {
    title: "Bad",
    author: null,
    thumbnail: "javascript:alert(1)",
    provider: "YouTube",
    duration: null,
  };
  await openFixture(page);
  await expect(page.locator(".room-player")).toBeVisible();
  await expect(page.getByLabel("Сейчас играет")).toHaveCount(0);
});
test("members queue links; the host plays the next one, which becomes the source", async ({
  page,
}, info) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.queue = [];
  await openFixture(page, true, room);
  await page.getByRole("tab", { name: /Очередь/ }).click();
  await expect(page.getByText("Очередь пуста", { exact: false })).toBeVisible();
  const input = page.getByLabel("Ссылка на видео или трек");
  await input.fill("https://vimeo.com/76979871");
  await page.getByRole("button", { name: "Добавить" }).click();
  await expect(page.locator(".queue-row")).toHaveCount(1);
  await expect(page.locator(".queue-row")).toContainText("Vimeo");
  await expect(page.locator(".queue-row")).toContainText("vimeo.com/76979871");
  // React resets the form after a successful action.
  await expect(input).toHaveValue("");
  await expect(page.getByRole("tab", { name: /Очередь/ })).toContainText("1");
  await page
    .locator(".room-side")
    .screenshot({ path: `.local/room-queue-${info.project.name}.png` });
  await page.getByRole("button", { name: "Включить следующее" }).click();
  await expect(page.locator(".queue-row")).toHaveCount(0);
  expect(queueActions).toEqual(["add", "play"]);
  await expect.poll(() => room.room.url).toBe("https://vimeo.com/76979871");
});
test("music rooms: members import playlists and switch tracks; hosts mix", async ({
  page,
}, info) => {
  const room = seed();
  room.room.format = "music";
  room.members[0].role = "member";
  room.queue = [];
  await openFixture(page, true, room);
  await page.getByRole("tab", { name: /Очередь/ }).click();
  await expect(
    page.getByText("Музыкальная комната", { exact: false }),
  ).toBeVisible();
  const importField = page.getByLabel(
    "Ссылка на плейлист или трек: Spotify, YouTube или SoundCloud",
  );
  await importField.fill("https://open.spotify.com/playlist/" + "p".repeat(22));
  await page.getByRole("button", { name: "Импорт" }).click();
  await expect(page.getByText("Добавлено в очередь: 3 из 3")).toBeVisible();
  await expect(page.locator(".queue-row")).toHaveCount(3);
  // An ordinary member switches tracks in a music room, but cannot mix.
  await expect(
    page.getByRole("button", { name: "Смешать плейлисты" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Включить следующее" }).click();
  await expect(page.locator(".queue-row")).toHaveCount(2);
  expect(queueActions).toEqual([
    "import:https://open.spotify.com/playlist/" + "p".repeat(22),
    "play",
  ]);
  await page
    .locator(".room-side")
    .screenshot({ path: `.local/music-room-queue-${info.project.name}.png` });
});
test("a created music room explains a failed import in both locales and keeps the queue usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__creationImportFailed = true;
  });
  const room = seed();
  room.room.format = "music";
  room.queue = [];
  await openFixture(page, true, room);
  await expect(page.getByRole("alert")).toContainText(
    "Комната создана, но треки не добавились",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The room was created, but its tracks could not be added",
  );
  await page.getByRole("tab", { name: /Queue/ }).click();
  await expect(
    page.getByRole("button", { name: "Import", exact: true }),
  ).toBeEnabled();
});

test("music rooms display all 300 queued tracks and can play the last one", async ({
  page,
}) => {
  const room = seed();
  room.room.format = "music";
  room.queue = Array.from({ length: 300 }, (_, index) => ({
    id: `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    url: `https://vimeo.com/${index + 1}`,
    added_by: mine,
    created_at: new Date(Date.UTC(2026, 10, 8, 0, 0, index)).toISOString(),
  }));
  await openFixture(page, true, room);
  await page.getByRole("tab", { name: /Очередь/ }).click();
  await expect(page.locator(".queue-row")).toHaveCount(300);
  await page
    .locator(".queue-row")
    .last()
    .getByRole("button", { name: "Включить сейчас" })
    .click();
  await expect.poll(() => room.room.url).toBe("https://vimeo.com/300");
  expect(queueActions).toContain("play");
});

test("music room hosts can mix everyone's tracks", async ({ page }) => {
  const room = seed();
  room.room.format = "music";
  room.members[0].role = "owner";
  room.queue = ["x", "y"].map((x) => ({
    id: crypto.randomUUID(),
    url: `https://open.spotify.com/track/${x.repeat(22)}`,
    added_by: friend,
    created_at: new Date().toISOString(),
  }));
  await openFixture(page, true, room);
  await page.getByRole("tab", { name: /Очередь/ }).click();
  await page.getByRole("button", { name: "Смешать плейлисты" }).click();
  await expect.poll(() => queueActions).toContain("mix");
});
test("video rooms suggest a music room for playlists and tracks", async ({
  page,
}) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.queue = [];
  await openFixture(page, true, room);
  await page.getByRole("tab", { name: /Очередь/ }).click();
  await expect(
    page.getByLabel("Ссылка на плейлист или трек", { exact: false }),
  ).toHaveCount(0);
  const link = "https://open.spotify.com/playlist/" + "q".repeat(22);
  await page.getByLabel("Ссылка на видео или трек").fill(link);
  await page.getByRole("button", { name: "Добавить" }).click();
  const prompt = page.getByRole("alertdialog", {
    name: "Похоже на музыку или плейлист",
  });
  await expect(prompt).toBeVisible();
  await expect(
    prompt.getByRole("link", { name: "Создать музыкальную комнату" }),
  ).toHaveAttribute(
    "href",
    `/network/create?format=music&import=${encodeURIComponent(link)}`,
  );
  expect(queueActions).toEqual([]);
  await prompt.getByRole("button", { name: "Всё равно добавить сюда" }).click();
  await expect(page.locator(".queue-row")).toHaveCount(1);
  expect(queueActions).toEqual(["add"]);
  // An ordinary video link goes straight in.
  await page
    .getByLabel("Ссылка на видео или трек")
    .fill("https://vimeo.com/76979871");
  await page.getByRole("button", { name: "Добавить" }).click();
  await expect(page.locator(".queue-row")).toHaveCount(2);
  await expect(prompt).toHaveCount(0);
});
test("a member can remove only links they added", async ({ page }) => {
  const room = seed();
  room.queue = [
    {
      id: "40000000-0000-4000-8000-000000000001",
      url: "https://vimeo.com/1",
      added_by: mine,
      created_at: "2026-11-04T12:00:00Z",
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      url: "https://vimeo.com/2",
      added_by: friend,
      created_at: "2026-11-04T12:01:00Z",
    },
  ];
  await openFixture(page, true, room);
  await page.getByRole("tab", { name: /Очередь/ }).click();
  const rows = page.locator(".queue-row");
  await expect(rows).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Включить следующее" }),
  ).toHaveCount(0);
  await expect(
    rows.nth(0).getByRole("button", { name: "Убрать из очереди" }),
  ).toHaveCount(1);
  await expect(
    rows.nth(1).getByRole("button", { name: "Убрать из очереди" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Ведущий включает ссылки из очереди."),
  ).toBeVisible();
  await rows.nth(0).getByRole("button", { name: "Убрать из очереди" }).click();
  await expect(rows).toHaveCount(1);
  expect(queueActions).toEqual(["remove"]);
});
test("when the host's synced video ends, the next queued link starts", async ({
  page,
}) => {
  const room = seed();
  room.members[0].role = "owner";
  room.playback = null;
  room.queue = [
    {
      id: "40000000-0000-4000-8000-000000000003",
      url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      added_by: friend,
      created_at: "2026-11-04T12:00:00Z",
    },
  ];
  await openFixture(page, true, room);
  await expect.poll(async () => (await yt(page)).players).toBe(1);
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    (Reflect.get(window, "__yt") as FakeYouTube).players[0].user(1, 10),
  );
  await expect.poll(() => playbackPosts.length).toBe(1);
  await page.waitForTimeout(300);
  // YouTube state 0 = ENDED.
  await page.evaluate(() =>
    (Reflect.get(window, "__yt") as FakeYouTube).players[0].user(0),
  );
  await expect.poll(() => queueActions).toEqual(["play"]);
  expect(room.room.url).toBe("https://www.youtube.com/watch?v=M7lc1UVf-VE");
});
test("voice settings set each participant's volume and the speaker", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
      value: async () => [
        { kind: "audioinput", deviceId: "mic-1", label: "Desk microphone" },
        { kind: "audiooutput", deviceId: "spk-1", label: "Headphones" },
      ],
    });
  });
  await openFixture(page, true, undefined, undefined, true);
  await openVoiceTab(page);
  await page
    .getByRole("button", { name: "Войти в голос", exact: true })
    .click();
  await expect(page.locator(".voice-state")).toContainText("На связи");
  await page
    .getByRole("button", { name: "Настройки звука", exact: true })
    .click();
  const slider = page.getByRole("slider", { name: "Громкость: Саша" });
  await expect(slider).toHaveValue("100");
  await slider.fill("40");
  await expect(page.locator(".voice-volume output")).toHaveText("40%");
  expect(
    await page.evaluate(() => Reflect.get(window, "__voiceVolumes")),
  ).toContain(0.4);
  // Only remote participants get a volume control.
  await expect(page.locator(".voice-volume")).toHaveCount(1);
  await page
    .locator(".voice-settings")
    .screenshot({ path: `.local/voice-settings-${info.project.name}.png` });
  await page.getByLabel("Динамики", { exact: true }).selectOption("spk-1");
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__voiceOutput")))
    .toBe("spk-1");
});
test("voice rejoins after a network drop but never after a kick", async ({
  page,
}) => {
  await openFixture(page, true, undefined, undefined, true);
  await openVoiceTab(page);
  await page
    .getByRole("button", { name: "Войти в голос", exact: true })
    .click();
  await expect(page.locator(".voice-state")).toContainText("На связи");
  const connects = () =>
    page.evaluate(() => Reflect.get(window, "__voiceConnects") as number);
  expect(await connects()).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("voice-fixture-drop")),
  );
  await expect(page.locator(".voice-state")).toContainText(
    "Восстанавливаем связь",
  );
  // First retry after 2 s, with a fresh token from the server.
  await expect.poll(connects, { timeout: 8000 }).toBe(2);
  await expect(page.locator(".voice-state")).toContainText("На связи");
  // Rejoining never turns the microphone on by itself.
  await expect(
    page.getByRole("button", { name: "Включить микрофон", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() =>
    window.dispatchEvent(new Event("voice-fixture-kick")),
  );
  await expect(page.locator(".voice-lounge [role=alert]")).toContainText(
    "Ты отключён от звонка.",
  );
  await page.waitForTimeout(3000);
  expect(await connects()).toBe(2);
  await expect(
    page.getByRole("button", { name: "Войти в голос", exact: true }),
  ).toBeVisible();
});
type FakeHyperbeam = {
  embeds: string[];
  options: { delegateKeyboard?: boolean }[];
  calls: string[];
  destroyed: number;
  update(url: string): void;
};
const hb = (page: Page) =>
  page.evaluate(() => Reflect.get(window, "__hb") as FakeHyperbeam | undefined);
test("the open room keeps pinging occupancy even in a background tab", async ({
  page,
}) => {
  await page.clock.install();
  await openFixture(page, true, seed());
  await expect.poll(() => occupancyPings).toBeGreaterThanOrEqual(1);
  const before = occupancyPings;
  // A hidden tab still counts as being in the room.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(61000);
  await expect.poll(() => occupancyPings).toBeGreaterThanOrEqual(before + 2);
});
test("joining a shared room sets the room dock; removal clears it", async ({
  page,
}) => {
  const room = seed();
  await openFixture(page, true, room);
  const stored = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("katsodi.currentRoom") || "null"),
    );
  await expect
    .poll(stored)
    .toMatchObject({ id: roomId, kind: "shared", title: room.room.name });
  // Removed from the room: the next refresh no longer shows it as joined.
  room.joined = false;
  await expect.poll(stored, { timeout: 10000 }).toBeNull();
});
const fakeCapture = () => {
  // Stand-ins for the browser's screen-capture picker and Region Capture.
  const canvas = document.createElement("canvas");
  const stream = (
    canvas as HTMLCanvasElement & {
      captureStream(): MediaStream;
    }
  ).captureStream();
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & {
    cropTo?: (target: unknown) => Promise<void>;
  };
  track.cropTo = async () => {
    Reflect.set(window, "__cropped", true);
  };
  Reflect.set(window, "CropTarget", { fromElement: async () => ({}) });
  navigator.mediaDevices.getDisplayMedia = async (options) => {
    Reflect.set(window, "__displayOptions", options);
    return stream;
  };
};
const liveDemo = (
  user: string,
  status: "pending" | "live" | "paused" = "live",
) => {
  const now = new Date().toISOString();
  return {
    user_id: user,
    url: "https://example.org/",
    status,
    requested_at: now,
    decided_by: status === "pending" ? null : friend,
    paused_by: status === "paused" ? friend : null,
    seen_at: now,
  };
};
test("a member launches a demo from a chat link and waits for a host", async ({
  page,
}) => {
  const room = seed();
  room.demo = null;
  await openFixture(page, true, room);
  const launch = page.getByRole("button", { name: "Запустить демо" });
  await expect(launch).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Сообщение" })
    .fill("https://example.org/");
  await launch.click();
  await expect
    .poll(() => demoActions)
    .toEqual(["request:https://example.org/"]);
  await expect(
    page.getByRole("heading", { name: "Ждём, пока ведущий примет демо" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Отозвать" }).click();
  await expect.poll(() => demoActions).toContain("stop");
});
test("phones without screen capture cannot launch a demo and are told why", async ({
  page,
}) => {
  const room = seed();
  room.demo = null;
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: undefined,
    });
  });
  await openFixture(page, true, room);
  await page
    .getByRole("textbox", { name: "Сообщение" })
    .fill("https://example.org/");
  const launch = page.getByRole("button", { name: "Запустить демо" });
  await expect(launch).toBeDisabled();
  await expect(launch).toHaveAttribute(
    "title",
    /С телефона демо пока не запустить/,
  );
  await page.getByRole("button", { name: "Демо", exact: true }).click();
  await expect(
    page
      .getByRole("note")
      .filter({ hasText: "С телефона демо пока не запустить" }),
  ).toBeVisible();
  expect(demoActions).toEqual([]);
});
test("a host sees a waiting request from any tab and accepts it", async ({
  page,
}) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.demo = liveDemo(friend, "pending");
  await openFixture(page, true, room);
  await expect(page.locator(".demo-request-bar")).toContainText(
    "хочет показать демо",
  );
  await page.getByRole("button", { name: "Открыть демо" }).click();
  await page.getByRole("button", { name: "Принять" }).click();
  await expect.poll(() => demoActions).toEqual(["decide:1"]);
});
test("the presenter broadcasts the site from inside Katsodi, cropped to it", async ({
  page,
}, info) => {
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await openFixture(page, true, room);
  await expect(
    page.frameLocator(".demo-frame iframe").getByRole("heading", {
      name: "Example site",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Начать показ" }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__published")))
    .toEqual(["screen_share"]);
  expect(await page.evaluate(() => Reflect.get(window, "__cropped"))).toBe(
    true,
  );
  expect(
    await page.evaluate(() => Reflect.get(window, "__displayOptions")),
  ).toMatchObject({ audio: false, preferCurrentTab: true });
  // A host's drawing appears over the presenter's live site.
  await page.evaluate((identity) => {
    window.dispatchEvent(
      new CustomEvent("demo-fixture-data", {
        detail: {
          identity,
          signal: { t: "hint", id: "h1", x: 0.5, y: 0.5 },
        },
      }),
    );
  }, friend);
  await expect(page.locator(".demo-frame .demo-hint")).toHaveCount(1);
  await page
    .locator(".room-main")
    .screenshot({ path: `.local/demo-presenter-${info.project.name}.png` });
  // A host pauses: the presenter stops sending frames.
  room.demo.status = "paused";
  room.demo.paused_by = friend;
  await expect(page.getByText("Пауза — Саша")).toBeVisible({ timeout: 10000 });
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__muted")))
    .toBe(true);
  await page.getByRole("button", { name: "Завершить демо" }).click();
  await expect.poll(() => demoActions).toContain("stop");
});
test("hosts draw, suggest a click and pause; members only watch", async ({
  page,
}) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.demo = liveDemo(friend);
  await page.addInitScript(() => Reflect.set(window, "__screenViewer", true));
  await openFixture(page, true, room);
  await expect(page.locator("[data-fake-screen=remote]")).toBeAttached();
  const overlay = page.locator(".demo-screen .demo-overlay");
  await page.getByRole("button", { name: "Карандаш" }).click();
  const box = (await overlay.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(overlay.locator(".demo-stroke")).toHaveCount(1);
  await page.getByRole("button", { name: "Подсказать клик" }).click();
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6);
  await expect(overlay.locator(".demo-hint")).toHaveCount(1);
  const sent = (await page.evaluate(() =>
    Reflect.get(window, "__demoData"),
  )) as { t: string }[];
  expect(sent.map((m) => m.t)).toContain("stroke");
  expect(sent.map((m) => m.t)).toContain("hint");
  await page.getByRole("button", { name: "Пауза" }).click();
  await expect.poll(() => demoActions).toEqual(["pause:1"]);
});
test("annotations persist with names, text and stamps; erasing only your own", async ({
  page,
}, info) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.demo = liveDemo(friend);
  await page.addInitScript(() => Reflect.set(window, "__screenViewer", true));
  await page.clock.install();
  await openFixture(page, true, room);
  await expect(page.locator("[data-fake-screen=remote]")).toBeAttached();
  const overlay = page.locator(".demo-screen .demo-overlay");
  // Measured fresh each time: clicking a tool may scroll the page.
  const at = async (x: number, y: number) => {
    const box = (await overlay.boundingBox())!;
    return [box.x + box.width * x, box.y + box.height * y] as const;
  };
  // Arrow, then a stamp and a text label.
  await page.getByRole("button", { name: "Стрелка" }).click();
  const from = await at(0.2, 0.2),
    to = await at(0.5, 0.5);
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move(...to, { steps: 4 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Штамп: галочка" }).click();
  await page.mouse.click(...(await at(0.7, 0.3)));
  await page.getByRole("button", { name: "Текст", exact: true }).click();
  await page.mouse.click(...(await at(0.3, 0.7)));
  await page.getByLabel("Текст пометки, Enter — готово").fill("Нажми здесь");
  await page.keyboard.press("Enter");
  await expect(overlay.locator(".demo-arrow")).toHaveCount(1);
  await expect(overlay.locator(".demo-stamp")).toContainText("✓");
  await expect(overlay.locator(".demo-text")).toContainText("Нажми здесь");
  // Each mark carries its author's name; the legend lists annotators.
  await expect(overlay.locator(".demo-legend")).toContainText("Katsodi");
  await expect(overlay.locator(".demo-stamp .demo-author")).toHaveText(
    "Katsodi",
  );
  // Unlike before, marks stay until cleared (Zoom behaviour).
  await page.clock.runFor(30000);
  await expect(overlay.locator(".demo-stamp")).toHaveCount(1);
  // Someone else's stamp cannot be erased by me; mine can.
  await page.evaluate((identity) => {
    window.dispatchEvent(
      new CustomEvent("demo-fixture-data", {
        detail: {
          identity,
          signal: { t: "stamp", id: "theirs", stamp: "star", x: 0.4, y: 0.4 },
        },
      }),
    );
  }, friend);
  await expect(overlay.locator(".demo-stamp")).toHaveCount(2);
  await expect(overlay.locator(".demo-legend")).toContainText("Саша");
  await page
    .locator(".room-main")
    .screenshot({ path: `.local/demo-annotations-${info.project.name}.png` });
  await page.getByRole("button", { name: "Ластик (свои пометки)" }).click();
  await overlay.locator(".demo-stamp", { hasText: "★" }).click();
  await expect(overlay.locator(".demo-stamp")).toHaveCount(2);
  await overlay.locator(".demo-stamp", { hasText: "✓" }).click();
  await expect(overlay.locator(".demo-stamp")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Отменить мою последнюю пометку" })
    .click();
  await expect(overlay.locator(".demo-text")).toHaveCount(0);
  await page.getByRole("button", { name: "Стереть все" }).click();
  await expect(overlay.locator(".demo-mark")).toHaveCount(0);
  await expect(overlay.locator(".demo-arrow")).toHaveCount(0);
});
test("hosts open annotations to everyone; members then annotate", async ({
  page,
}) => {
  const host = seed();
  host.members[0].role = "moderator";
  host.demo = liveDemo(friend);
  await page.addInitScript(() => Reflect.set(window, "__screenViewer", true));
  await openFixture(page, true, host);
  await page.getByRole("button", { name: "Пометки для всех" }).click();
  await expect.poll(() => demoActions).toEqual(["annotations:1"]);
  await expect(
    page.getByRole("button", { name: "Пометки для всех" }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("a member annotates once annotations are open to everyone", async ({
  page,
}) => {
  const room = seed();
  room.demo = { ...liveDemo(friend), annotations_open: true };
  await page.addInitScript(() => Reflect.set(window, "__screenViewer", true));
  await openFixture(page, true, room);
  await expect(page.locator("[data-fake-screen=remote]")).toBeAttached();
  await expect(page.getByText(/Ведущий открыл пометки для всех/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Пометки для всех" }),
  ).toHaveCount(0);
  const overlay = page.locator(".demo-screen .demo-overlay");
  await page.getByRole("button", { name: "Штамп: вопрос" }).click();
  // Measured after choosing the tool: the click may have scrolled the page.
  const box = (await overlay.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(overlay.locator(".demo-stamp")).toContainText("?");
  // Other members' marks count too while annotations are open.
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("demo-fixture-data", {
        detail: {
          identity: "another-member",
          signal: { t: "stamp", id: "m2", stamp: "check", x: 0.2, y: 0.2 },
        },
      }),
    );
  });
  await expect(overlay.locator(".demo-stamp")).toHaveCount(2);
  // Members cannot clear everyone's marks: only their own.
  await expect(page.getByRole("button", { name: "Стереть все" })).toHaveCount(
    0,
  );
});
test("the presenter sends current annotations to someone who joins late", async ({
  page,
}) => {
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "Начать показ" }).click();
  await page.evaluate((identity) => {
    window.dispatchEvent(
      new CustomEvent("demo-fixture-data", {
        detail: {
          identity,
          signal: { t: "stamp", id: "s1", stamp: "star", x: 0.5, y: 0.5 },
        },
      }),
    );
  }, friend);
  await expect(page.locator(".demo-frame .demo-stamp")).toHaveCount(1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("demo-fixture-join", { detail: "late-joiner" }),
    ),
  );
  await expect
    .poll(() =>
      page.evaluate(() => ({
        data: Reflect.get(window, "__demoData"),
        to: Reflect.get(window, "__demoTo"),
      })),
    )
    .toMatchObject({
      data: [{ t: "snapshot", marks: [{ id: "s1", author: friend }] }],
      to: [["late-joiner"]],
    });
});
test("members watch without tools and ignore marks from non-hosts", async ({
  page,
}) => {
  const room = seed();
  room.demo = liveDemo(friend);
  await page.addInitScript(() => Reflect.set(window, "__screenViewer", true));
  await openFixture(page, true, room);
  await expect(page.locator("[data-fake-screen=remote]")).toBeAttached();
  await expect(page.getByText("только просмотр").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Карандаш" })).toHaveCount(0);
  await expect(
    page.getByText("Пометки сейчас делают только ведущие и автор демо."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Пауза" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Завершить демо" }),
  ).toHaveCount(0);
  for (const identity of ["someone-else", friend])
    await page.evaluate((who) => {
      window.dispatchEvent(
        new CustomEvent("demo-fixture-data", {
          detail: {
            identity: who,
            signal: { t: "hint", id: `h-${who}`, x: 0.3, y: 0.3 },
          },
        }),
      );
    }, identity);
  // Only the owner's (friend's) hint is shown.
  await expect(page.locator(".demo-screen .demo-hint")).toHaveCount(1);
});
test("a host shows an embeddable website to the room and closes it", async ({
  page,
}, info) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.site = null;
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "Сайт", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Сайт для всех" }),
  ).toBeVisible();
  await page.getByLabel("Сайт для всей комнаты").fill("https://example.org/");
  await page.getByRole("button", { name: "Показать всем" }).click();
  await expect.poll(() => siteActions).toEqual(["site:https://example.org/"]);
  const frame = page.locator(".room-website iframe");
  await expect(frame).toHaveAttribute("src", "https://example.org/");
  // Sandboxed: scripts and forms work, the site can never navigate the room.
  await expect(frame).toHaveAttribute("sandbox", /allow-scripts/);
  await expect(frame).not.toHaveAttribute("sandbox", /allow-top-navigation/);
  await expect(
    page.frameLocator(".room-website iframe").getByRole("heading", {
      name: "Example site",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Открыть в новой вкладке" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page
    .locator(".room-main")
    .screenshot({ path: `.local/room-website-${info.project.name}.png` });
  await page.getByRole("button", { name: "Закрыть сайт" }).click();
  await expect
    .poll(() => siteActions)
    .toEqual(["site:https://example.org/", "site:"]);
  await expect(page.locator(".room-website iframe")).toHaveCount(0);
});
test("a site that refuses embedding goes to the shared browser instead", async ({
  page,
}) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.site = {
    url: "https://example.org/",
    updated_at: new Date().toISOString(),
  };
  room.browser = null;
  siteCheck = "blocked";
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "Сайт", exact: true }).click();
  await expect(
    page.getByText("Сайт запрещает показывать себя внутри других сайтов."),
  ).toBeVisible();
  await expect(page.locator(".room-website iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Открыть в общем браузере" }).click();
  await expect(
    page.getByRole("heading", { name: "Общий браузер" }),
  ).toBeVisible();
  await expect(page.getByLabel("Адрес сайта")).toHaveValue(
    "https://example.org/",
  );
});
test("members see the room website without host controls", async ({ page }) => {
  const room = seed();
  room.members[0].role = "member";
  room.site = {
    url: "https://example.org/",
    updated_at: new Date().toISOString(),
  };
  siteCheck = "unchecked";
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "Сайт", exact: true }).click();
  // Unconfirmed sites are never embedded; members get a new-tab link only.
  await expect(
    page.getByText("Не удалось подтвердить, что сайт разрешает встраивание"),
  ).toBeVisible();
  await expect(page.locator(".room-website iframe")).toHaveCount(0);
  await expect(page.getByLabel("Сайт для всей комнаты")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Закрыть сайт" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Открыть в общем браузере" }),
  ).toHaveCount(0);
});
test("a host opens, steers and closes the shared browser for the room", async ({
  page,
}, info) => {
  const room = seed();
  room.members[0].role = "moderator";
  room.browser = null;
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "Браузер" }).click();
  await expect(
    page.getByRole("heading", { name: "Общий браузер" }),
  ).toBeVisible();
  await page.getByLabel("Адрес сайта").fill("https://example.org/");
  await page.getByRole("button", { name: "Открыть для всех" }).click();
  // The room follows the new session; the host's connection asks for control.
  await expect(page.locator(".fake-hyperbeam")).toBeVisible();
  await expect
    .poll(() => browserActions)
    .toEqual(["start:https://example.org/", "claim:hb-user-1234-abcd"]);
  expect((await hb(page))!.options[0]).toMatchObject({
    delegateKeyboard: true,
  });
  await page.evaluate(() =>
    (Reflect.get(window, "__hb") as FakeHyperbeam).update(
      "https://example.org/news",
    ),
  );
  await expect(page.getByLabel("Адрес сайта")).toHaveValue(
    "https://example.org/news",
  );
  await expect
    .poll(() => browserActions)
    .toContain("report:https://example.org/news");
  await page.getByRole("button", { name: "Назад" }).click();
  await page.getByRole("button", { name: "Обновить" }).click();
  await page.getByLabel("Адрес сайта").fill("https://example.org/next");
  await page.getByLabel("Адрес сайта").press("Enter");
  // Unsafe addresses never reach the cloud browser.
  await page.getByLabel("Адрес сайта").fill("javascript:alert(1)");
  await page.getByLabel("Адрес сайта").press("Enter");
  expect((await hb(page))!.calls).toEqual([
    "back",
    "reload",
    "update:https://example.org/next",
  ]);
  await page
    .locator(".room-main")
    .screenshot({ path: `.local/shared-browser-${info.project.name}.png` });
  await page.getByRole("button", { name: "Закрыть общий браузер" }).click();
  await expect.poll(() => browserActions).toContain("end");
  await expect(
    page.getByRole("button", { name: "Открыть для всех" }),
  ).toBeVisible();
  expect((await hb(page))!.destroyed).toBe(1);
});
test("members watch the shared browser read-only and never request control", async ({
  page,
}) => {
  const room = seed();
  room.browser = {
    embed_url: "https://abc123.hyperbeam.com/SESSION?token=viewer",
    current_url: "https://example.org/watch",
    started_at: "2026-11-04T12:00:00Z",
  };
  await openFixture(page, true, room);
  await expect(page.locator(".fake-hyperbeam")).toBeVisible();
  await expect(page.locator(".browser-address-readonly")).toContainText(
    "https://example.org/watch",
  );
  await expect(
    page.getByText("браузером управляет ведущий", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Назад" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Закрыть общий браузер" }),
  ).toHaveCount(0);
  expect((await hb(page))!.options[0]).toMatchObject({
    delegateKeyboard: false,
  });
  await page.waitForTimeout(500);
  expect(browserActions).toEqual([]);
  // Switching to the player keeps the cloud browser connected.
  await page.getByRole("button", { name: "Плеер", exact: true }).click();
  await expect(page.locator(".room-player")).toBeVisible();
  await expect(page.locator(".fake-hyperbeam")).toBeHidden();
  expect((await hb(page))!.destroyed).toBe(0);
});
test.describe("before a choice about embedded media", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("the shared browser waits for consent, then attaches on Load once", async ({
    page,
  }) => {
    const room = seed();
    room.browser = {
      embed_url: "https://abc123.hyperbeam.com/SESSION?token=viewer",
      current_url: "https://example.org/watch",
      started_at: "2026-11-04T12:00:00Z",
    };
    await openFixture(page, true, room);
    const gate = page.getByRole("group", { name: "Внешний плеер" });
    await expect(gate).toContainText("Hyperbeam");
    await expect(page.locator(".fake-hyperbeam")).toHaveCount(0);
    expect(await hb(page)).toBeFalsy();
    await gate.getByRole("button", { name: "Загрузить один раз" }).click();
    await expect(page.locator(".fake-hyperbeam")).toBeVisible();
    expect((await hb(page))!.options[0]).toMatchObject({
      delegateKeyboard: false,
    });
  });
});
test("without Hyperbeam the room shows no stage switch", async ({ page }) => {
  await openFixture(page);
  await expect(page.locator(".room-player")).toBeVisible();
  await expect(page.getByRole("button", { name: "Браузер" })).toHaveCount(0);
});
test("an open room sends one presence heartbeat for XP, and none from a closed room", async ({
  page,
}) => {
  await openFixture(page);
  await expect.poll(() => presencePings).toEqual([roomId]);
  await page.close();
  const closed = await page.context().newPage();
  presencePings = [];
  const room = seed();
  room.room.closed_at = "2026-11-04T12:00:00Z";
  await openFixture(closed, true, room);
  await closed.waitForTimeout(800);
  expect(presencePings).toEqual([]);
});
test("the room workspace passes automated WCAG 2.1 AA checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const room = seed();
  room.queue = [];
  await openFixture(page, true, room, undefined, true);
  await page.waitForTimeout(600);
  const scan = async () =>
    (
      await new AxeBuilder({ page })
        .include(".room-workspace")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations.map((v) => ({ id: v.id, target: v.nodes[0]?.target }));
  expect(await scan()).toEqual([]);
  for (const tab of [/Люди/, /Голос/, /Очередь/]) {
    await page.getByRole("tab", { name: tab }).click();
    expect(await scan(), String(tab)).toEqual([]);
  }
});

// Redesign before/after screenshots of the room (Task 1); skipped unless
// CAPTURE_DIR is set.
test("capture shared room with chat and voice", async ({ page }, info) => {
  test.skip(skipCapture(info), "set CAPTURE_DIR to capture");
  test.setTimeout(240000);
  await openFixture(page, true, undefined, undefined, true);
  await expect(
    page.getByText("Чай готов. Можно начинать!", { exact: true }),
  ).toBeVisible();
  await captureAll(page, "room-chat");
  await page.setViewportSize({ width: 1280, height: 900 });
  await openVoiceTab(page);
  await page
    .locator(".voice-lounge")
    .getByRole("button", { name: "Войти в голос", exact: true })
    .click();
  await expect(
    page.locator(".voice-lounge").getByText("На связи", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(new Event("voice-fixture-speaking")),
  );
  await captureAll(page, "room-voice");
});

test("uploaded avatars, inaccessible fallback and full-room fullscreen retain voice/chat state", async ({
  page,
}, info) => {
  const snapshot = seed();
  snapshot.profiles.forEach((profile) => {
    profile.avatar_path = `${profile.id}/avatar.webp`;
    profile.media_updated_at = "2026-11-09T09:00:00Z";
  });
  await page.route("**/api/profile-media/**/avatar*", (route) =>
    route.request().url().includes(friend)
      ? route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#d8f18c"/></svg>',
        })
      : route.fulfill({ status: 404 }),
  );
  await openFixture(page, true, snapshot, undefined, true);
  const friendImage = page
    .locator(`.message-avatar img[src*="${friend}"]`)
    .first();
  await expect(friendImage).toBeVisible();
  await expect(page.locator(`.message-own .message-avatar img`)).toHaveCount(0);
  await expect(page.locator(".message-own .message-avatar").first()).toHaveText(
    "K",
  );
  await page
    .getByRole("button", { name: "На весь экран", exact: true })
    .click();
  await expect(page.locator(".room-fullscreen")).toHaveClass(/is-fullscreen/);
  await expect(page.locator(".chat-composer")).toBeVisible();
  await page
    .getByRole("button", { name: "Выйти из полного экрана", exact: true })
    .click();
  await openVoiceTab(page);
  await expect(
    page.locator(`.voice-avatar img[src*="${friend}"]`),
  ).toBeVisible();
  await page.screenshot({
    path: `.local/ux-audit/shared-voice-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("tab", { name: /Чат/ }).click();
  await page.screenshot({
    path: `.local/ux-audit/shared-chat-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("three participants keep readable identities, separate actions and centered voice cards", async ({
  page,
}, info) => {
  const snapshot = seed();
  const third = "10000000-0000-4000-8000-000000000003";
  snapshot.room.owner_id = mine;
  snapshot.members = [
    { user_id: mine, role: "owner", status: "active" },
    { user_id: friend, role: "moderator", status: "active" },
    { user_id: third, role: "member", status: "active" },
  ];
  snapshot.profiles = [
    { id: mine, display_name: "admin", username: "admin" },
    { id: friend, display_name: "мира", username: "mira" },
    { id: third, display_name: "Katsodi", username: "katsodi" },
  ];
  await openFixture(page, true, snapshot);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  for (const width of [360, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("tab", { name: /People/ }).click();
    await expect(page.locator(".member-row")).toHaveCount(3);
    const rows = await page.locator(".member-row").evaluateAll((rows) =>
      rows.map((row) => {
        const identity = row
          .querySelector(".member-identity")!
          .getBoundingClientRect();
        const name = row
          .querySelector(".member-details strong")!
          .getBoundingClientRect();
        const actions = row
          .querySelector(".member-actions")!
          .getBoundingClientRect();
        return {
          nameWidth: name.width,
          nameHeight: name.height,
          separate:
            !row.querySelector(".member-actions form") ||
            actions.top >= identity.bottom - 1,
          overflow: row.scrollWidth > row.clientWidth,
        };
      }),
    );
    for (const row of rows) {
      expect(row.nameWidth).toBeGreaterThan(100);
      expect(row.nameHeight).toBeLessThan(30);
      expect(row.separate).toBe(true);
      expect(row.overflow).toBe(false);
    }
    await page.locator(".room-side").screenshot({
      path: `.local/ux-audit/people-fixed-${width}-${info.project.name}.png`,
    });
    await page.getByRole("tab", { name: /Voice/ }).click();
    await expect(page.locator(".voice-person")).toHaveCount(3);
    const centered = await page.locator(".voice-people").evaluate((roster) => {
      const bounds = roster.getBoundingClientRect();
      const cards = Array.from(roster.children).map((card) =>
        card.getBoundingClientRect(),
      );
      return cards.every((card) => {
        const row = cards.filter((other) => Math.abs(other.top - card.top) < 2);
        return (
          Math.abs(
            (Math.min(...row.map((r) => r.left)) +
              Math.max(...row.map((r) => r.right))) /
              2 -
              (bounds.left + bounds.right) / 2,
          ) < 2
        );
      });
    });
    expect(centered).toBe(true);
    const controlsAligned = await page
      .locator(".voice-controls")
      .evaluate((controls) => {
        const group = controls
          .querySelector(".voice-control-group")!
          .getBoundingClientRect();
        const join = controls
          .querySelector(".voice-join")!
          .getBoundingClientRect();
        return (
          Math.abs(
            (group.top + group.bottom) / 2 - (join.top + join.bottom) / 2,
          ) < 2
        );
      });
    expect(controlsAligned).toBe(true);
    await page.locator(".room-side").screenshot({
      path: `.local/ux-audit/voice-fixed-${width}-${info.project.name}.png`,
    });
  }
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByRole("button", { name: "RU", exact: true }).click();
  expect(
    await page.locator(".voice-controls").evaluate((controls) => {
      const group = controls
        .querySelector(".voice-control-group")!
        .getBoundingClientRect();
      const join = controls
        .querySelector(".voice-join")!
        .getBoundingClientRect();
      return (
        Math.abs(
          (group.top + group.bottom) / 2 - (join.top + join.bottom) / 2,
        ) < 2
      );
    }),
  ).toBe(true);
});

test("fullscreen shared stages and voice adapt to the available screen", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const room = seed();
  room.members[0].role = "owner";
  room.room.owner_id = mine;
  room.site = null;
  room.demo = null;
  room.browser = null;
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  for (const [width, height] of [
    [1920, 1080],
    [1280, 900],
    [1280, 540],
    [768, 900],
    [360, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page
      .getByRole("button", { name: "Full screen", exact: true })
      .click();
    await expect(page.locator(".room-fullscreen")).toHaveClass(/is-fullscreen/);
    await page.getByRole("tab", { name: /Voice/ }).click();
    for (const [mode, selector] of [
      ["Website", ".room-website"],
      ["Demo", ".room-demo"],
      ["Player", ".room-player:not(.room-website):not(.room-demo)"],
    ] as const) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      const pane = page.locator(".stage-pane:not([hidden])");
      await expect(pane.locator(selector)).toBeVisible();
      const geometry = await page
        .locator(".room-fullscreen")
        .evaluate((root) => {
          const main = root.querySelector(".room-main")!;
          const stage = main.querySelector(".stage-pane:not([hidden])")!;
          const panel = root.querySelector(".room-panel-voice")!;
          const lounge = panel.querySelector(".voice-lounge")!;
          const bounds = main.getBoundingClientRect();
          const content = stage.getBoundingClientRect();
          const side = panel.getBoundingClientRect();
          const voice = lounge.getBoundingClientRect();
          return {
            overflow: root.scrollWidth > root.clientWidth,
            stageGap:
              bounds.bottom -
              parseFloat(getComputedStyle(main).paddingBottom) -
              content.bottom,
            voiceGap: side.bottom - voice.bottom,
          };
        });
      expect(geometry.overflow).toBe(false);
      if (width > 1000 && height >= 720) {
        expect(Math.abs(geometry.stageGap)).toBeLessThan(3);
        expect(Math.abs(geometry.voiceGap)).toBeLessThan(3);
      }
      await page.screenshot({
        path: `.local/ux-audit/fullscreen-adapt-${mode}-${width}-${height}-${info.project.name}.png`,
        animations: "disabled",
      });
    }
    await page
      .getByRole("button", { name: "Exit full screen", exact: true })
      .click();
    await expect(page.locator(".room-fullscreen")).not.toHaveClass(
      /is-fullscreen/,
    );
  }
});

test("fullscreen browser fills its stage and website iframe survives exit", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const room = seed();
  room.members[0].role = "owner";
  room.room.owner_id = mine;
  room.site = null;
  room.browser = null;
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect(page.locator(".room-fullscreen")).toHaveClass(/is-fullscreen/);
  await page.getByRole("button", { name: "Browser", exact: true }).click();
  expect(
    (await page.locator(".shared-browser").boundingBox())!.height,
  ).toBeGreaterThan(700);
  await page.getByRole("button", { name: "Website", exact: true }).click();
  await page.locator("#room-site-url").fill("https://example.org/");
  await page
    .getByRole("button", { name: "Show everyone", exact: true })
    .click();
  const frame = page.locator(".room-website iframe");
  await expect(frame).toBeVisible();
  expect(
    (await page.locator(".room-website").boundingBox())!.height,
  ).toBeGreaterThan(700);
  const iframeFit = await frame.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const available = element
      .closest(".room-player-frame")!
      .getBoundingClientRect();
    return {
      height: bounds.height,
      gap: Math.abs(bounds.height - available.height),
    };
  });
  expect(iframeFit.height).toBeGreaterThan(160);
  expect(iframeFit.gap).toBeLessThan(2);
  await frame.evaluate((element) =>
    element.setAttribute("data-fullscreen-check", "retained"),
  );
  await page.screenshot({
    path: `.local/ux-audit/fullscreen-adapt-loaded-site-${info.project.name}.png`,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Exit full screen", exact: true })
    .click();
  await expect(page.locator(".room-fullscreen")).not.toHaveClass(
    /is-fullscreen/,
  );
  await expect(frame).toHaveAttribute("data-fullscreen-check", "retained");
});

test("demo expands with chat and keeps tools on the opposite edge", async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await page.addInitScript(() => Reflect.set(window, "__chatShell", true));
  await page.setViewportSize({ width: 1366, height: 820 });
  await openFixture(page, true, room);
  await expect(page.locator(".demo-rights-warning")).toContainText(
    "Подписка или доступ к источнику сами по себе не разрешают публичный показ",
  );
  const frame = page.locator(".demo-frame iframe");
  // Native fullscreen remains available to a cross-origin nested player.
  await page.route("https://example.org/nested-fullscreen", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><h1>Nested player</h1><iframe title="Nested video" allowfullscreen srcdoc="<button onclick=&quot;document.documentElement.requestFullscreen().then(() => document.body.dataset.result='entered').catch(() => document.body.dataset.result='blocked')&quot;>Player fullscreen</button>"></iframe>`,
    }),
  );
  await frame.evaluate((element: HTMLIFrameElement) => {
    element.src = "https://example.org/nested-fullscreen";
    element.dataset.retained = "yes";
  });
  const nested = page
    .frameLocator(".demo-frame iframe")
    .frameLocator('iframe[title="Nested video"]');
  await nested.getByRole("button", { name: "Player fullscreen" }).click();
  await expect(nested.locator("body")).toHaveAttribute(
    "data-result",
    "entered",
  );
  await expect
    .poll(() =>
      frame.evaluate((element) => document.fullscreenElement === element),
    )
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  const root = page.locator(".room-fullscreen");
  const side = page.locator(".pane-side");
  const expand = () =>
    page
      .getByRole("button", { name: "Развернуть с чатом", exact: true })
      .click();
  const restore = () =>
    page
      .getByRole("button", { name: "Обычный вид с чатом", exact: true })
      .click();
  await page
    .locator(".pane-player")
    .getByRole("button", { name: "Развернуть панель", exact: true })
    .click();
  await expect(side).toBeHidden();
  await expand();
  await expect(page.locator(".stage-switch")).toBeHidden();
  await expect(root).toHaveAttribute("data-fullscreen-mode", "native");
  expect(
    await page.evaluate(() =>
      document.fullscreenElement?.classList.contains("room-fullscreen"),
    ),
  ).toBe(true);
  await expect(
    side.getByText("Чай готов. Можно начинать!", { exact: true }),
  ).toBeVisible();
  await restore();
  await page
    .getByRole("button", { name: "На весь экран", exact: true })
    .click();
  await expand();
  await expect(page.locator(".stage-switch")).toBeHidden();
  await restore();
  await expect(root).toHaveClass(/is-fullscreen/);
  await page
    .getByRole("button", { name: "Выйти из полного экрана", exact: true })
    .click();
  await page.getByRole("button", { name: "Начать показ", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__published")))
    .toEqual(["screen_share"]);
  await expand();
  await expect(root).toHaveAttribute("data-fullscreen-mode", "page");
  await nested.getByRole("button", { name: "Player fullscreen" }).click();
  await expect
    .poll(() =>
      frame.evaluate((element) => document.fullscreenElement === element),
    )
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await expect(root).toHaveAttribute("data-fullscreen-mode", "page");
  await expect(
    page.getByRole("button", { name: "Обычный вид с чатом", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 580 });
  await expect(
    side.getByText("Чай готов. Можно начинать!", { exact: true }),
  ).toBeVisible();
  for (const chatLeft of [false, true]) {
    if (chatLeft)
      await side
        .getByRole("button", { name: "Панель общения слева", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Открыть инструменты демо", exact: true })
      .click();
    const drawer = page.locator(".demo-tool-drawer");
    await expect(drawer).toHaveAttribute("data-open", "true");
    await expect
      .poll(async () => {
        const tools = (await drawer.boundingBox())!;
        const chat = (await side.boundingBox())!;
        return chatLeft
          ? tools.x >= chat.x + chat.width
          : tools.x + tools.width <= chat.x;
      })
      .toBe(true);
    await page.screenshot({
      path: `.local/ux-audit/demo-chat-edge-${chatLeft ? "right" : "left"}-${info.project.name}.png`,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Карандаш", exact: true }).click();
    await expect(drawer).toHaveAttribute("data-open", "false");
    await expect(
      side.getByText("Чай готов. Можно начинать!", { exact: true }),
    ).toBeVisible();
  }
  const player = page.locator(".pane-player");
  const initialSize = (await player.boundingBox())!;
  const resize = player.getByRole("button", {
    name: "Изменить ширину и высоту окна показа",
    exact: true,
  });
  await resize.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(async () => Math.round((await player.boundingBox())!.width))
    .toBe(Math.round(initialSize.width - 20));
  await expect
    .poll(async () => Math.round((await player.boundingBox())!.height))
    .toBe(Math.round(initialSize.height - 20));
  await restore();
  await expect(root).not.toHaveClass(/is-fullscreen/);
  await expect(frame).toHaveAttribute("data-retained", "yes");
  expect(await page.evaluate(() => Reflect.get(window, "__published"))).toEqual(
    ["screen_share"],
  );
});

test("active presenter demo fits fullscreen without covering annotation tools", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await page.addInitScript(() => {
    Reflect.set(window, "__chatShell", true);
  });
  await openFixture(page, true, room);
  await expect(page.locator(".demo-frame iframe")).toBeVisible();
  await page.getByRole("button", { name: "Начать показ", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__published")))
    .toEqual(["screen_share"]);
  for (const [width, height] of [
    [1920, 1080],
    [1280, 720],
    [1280, 540],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page
      .getByRole("button", { name: "На весь экран", exact: true })
      .click();
    await expect(page.locator(".room-fullscreen")).toHaveClass(/is-fullscreen/);
    await expect(page.locator(".app-shell")).toBeAttached();
    await expect(page.locator(".room-fullscreen")).toHaveAttribute(
      "data-fullscreen-mode",
      "page",
    );
    expect(await page.evaluate(() => document.fullscreenElement === null)).toBe(
      true,
    );
    expect(
      await page.locator(".room-workspace").evaluate((workspace) => {
        const bounds = workspace.getBoundingClientRect();
        const outer = getComputedStyle(workspace.closest(".room-fullscreen")!);
        const inner = getComputedStyle(workspace);
        return {
          leftGap:
            bounds.left -
            parseFloat(outer.paddingLeft) -
            parseFloat(inner.marginLeft),
          rightGap:
            window.innerWidth -
            bounds.right -
            parseFloat(outer.paddingRight) -
            parseFloat(inner.marginRight),
        };
      }),
    ).toEqual({ leftGap: 0, rightGap: 0 });
    const geometry = await page.locator(".room-demo").evaluate((demo) => {
      const canvas = demo
        .querySelector(".demo-canvas")!
        .getBoundingClientRect();
      const picture = demo
        .querySelector(".demo-frame")!
        .getBoundingClientRect();
      const tools = demo.querySelector("footer")!.getBoundingClientRect();
      return {
        inside:
          picture.left >= canvas.left - 1 &&
          picture.right <= canvas.right + 1 &&
          picture.top >= canvas.top - 1 &&
          picture.bottom <= canvas.bottom + 1,
        toolsClear: canvas.bottom <= tools.top + 1,
        overflow: demo.scrollWidth > demo.clientWidth,
      };
    });
    expect(geometry.overflow).toBe(false);
    expect(geometry.toolsClear).toBe(true);
    if (width > 1000) expect(geometry.inside).toBe(true);
    await page.screenshot({
      path: `.local/ux-audit/active-demo-fit-${width}-${info.project.name}.png`,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Выйти из полного экрана", exact: true })
      .click();
    await expect(page.locator(".room-fullscreen")).not.toHaveClass(
      /is-fullscreen/,
    );
  }
  expect(await page.evaluate(() => Reflect.get(window, "__published"))).toEqual(
    ["screen_share"],
  );
});

test("room panels resize, move, minimize and expand without restarting the demo", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await openFixture(page, true, room);
  const frame = page.locator(".demo-frame iframe");
  await expect(frame).toBeVisible();
  await frame.evaluate((element) =>
    element.setAttribute("data-layout-retained", "yes"),
  );
  await page.getByRole("button", { name: "Начать показ", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__published")))
    .toEqual(["screen_share"]);
  expect(
    await page.locator(".stage-switch button").first().innerText(),
  ).toContain("Демо");
  for (const fullscreen of [false, true]) {
    if (fullscreen)
      await page
        .getByRole("button", { name: "На весь экран", exact: true })
        .click();
    const layout = page.locator(".room-adjustable");
    const side = page.locator(".pane-side");
    const player = page.locator(".pane-player");
    const splitter = page.getByRole("separator", {
      name: "Изменить ширину панелей",
    });
    await splitter.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(splitter).toHaveAttribute("aria-valuenow", "404");
    await side
      .getByRole("button", { name: "Панель общения слева", exact: true })
      .click();
    await expect(layout).toHaveAttribute("data-left", "true");
    await side
      .getByRole("button", { name: "Свернуть панель", exact: true })
      .click();
    await expect(side.locator(".pane-content")).toBeHidden();
    await side
      .getByRole("button", { name: "Восстановить панель", exact: true })
      .click();
    await player
      .getByRole("button", { name: "Развернуть панель", exact: true })
      .click();
    await expect(side).toBeHidden();
    await player
      .getByRole("button", { name: "Восстановить панель", exact: true })
      .click();
    const grip = side.locator(".pane-grip");
    const box = (await grip.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 100, { steps: 6 });
    await page.mouse.up();
    await expect(side).toHaveClass(/is-floating/);
    await side
      .getByRole("button", {
        name: "Изменить размер плавающей панели",
        exact: true,
      })
      .focus();
    await page.keyboard.press("ArrowRight");
    await side
      .getByRole("button", { name: "Закрепить панель", exact: true })
      .click();
    await player
      .getByRole("button", { name: "Открепить панель", exact: true })
      .click();
    await expect(player).toHaveClass(/is-floating/);
    await player
      .getByRole("button", { name: "Свернуть панель", exact: true })
      .click();
    await expect(player.locator(".demo-frame iframe")).toBeVisible();
    await player
      .getByRole("button", { name: "Восстановить панель", exact: true })
      .click();
    await player
      .getByRole("button", { name: "Закрепить панель", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Сбросить расположение панелей",
        exact: true,
      })
      .click();
    await expect(splitter).toHaveAttribute("aria-valuenow", "380");
    await expect(frame).toHaveAttribute("data-layout-retained", "yes");
    if (fullscreen) {
      await page
        .getByRole("button", { name: "Открыть инструменты демо", exact: true })
        .click();
      await page.getByRole("button", { name: "Карандаш", exact: true }).click();
      await expect(
        page.getByRole("button", {
          name: "Открыть инструменты демо",
          exact: true,
        }),
      ).toHaveAttribute("aria-expanded", "false");
      await page.screenshot({
        path: `.local/ux-audit/room-studio-panels-${info.project.name}.png`,
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "Выйти из полного экрана", exact: true })
        .click();
    }
  }
  expect(await page.evaluate(() => Reflect.get(window, "__published"))).toEqual(
    ["screen_share"],
  );
});

test.describe("zoomed demo viewport", () => {
  test.use({ deviceScaleFactor: 1.5 });
  test("docked demo has two-axis sizing and fits short fullscreen viewports", async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    const room = seed();
    room.demo = liveDemo(mine);
    await page.addInitScript(fakeCapture);
    await page.addInitScript(() => Reflect.set(window, "__chatShell", true));
    await page.setViewportSize({ width: 1280, height: 900 });
    await openFixture(page, true, room);
    const player = page.locator(".pane-player");
    const frame = player.locator(".demo-frame iframe");
    await expect(frame).toBeVisible();
    await frame.evaluate((element) =>
      element.setAttribute("data-size-retained", "yes"),
    );
    await page
      .getByRole("button", { name: "Начать показ", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => Reflect.get(window, "__published")))
      .toEqual(["screen_share"]);
    await page
      .locator(".pane-side")
      .getByRole("button", { name: "Свернуть панель", exact: true })
      .click();
    await player
      .getByRole("button", { name: "Размер окна показа", exact: true })
      .click();
    const editor = player.locator(".pane-size-controls");
    await editor.getByLabel("Ширина, px", { exact: true }).fill("600");
    await editor.getByLabel("Высота, px", { exact: true }).fill("340");
    await editor
      .getByRole("button", { name: "Применить", exact: true })
      .click();
    await expect(player).toHaveClass(/is-sized/);
    await expect(player).not.toHaveClass(/is-floating/);
    expect((await player.boundingBox())!.width).toBeCloseTo(600, 0);
    expect((await player.boundingBox())!.height).toBeCloseTo(340, 0);
    await expect(frame).toBeVisible();
    expect(
      (await player.locator(".demo-canvas").boundingBox())!.height,
    ).toBeGreaterThan(160);
    const tools = player.locator(".demo-tool-toggle");
    await tools.click();
    await expect(player.locator(".demo-tool-drawer")).toHaveAttribute(
      "data-open",
      "true",
    );
    await tools.click();
    await expect(player.locator(".demo-tool-drawer")).toHaveAttribute(
      "data-open",
      "false",
    );
    await page.screenshot({
      path: `.local/ux-audit/demo-sized-normal-${info.project.name}.png`,
      animations: "disabled",
    });
    const grip = player.getByRole("button", {
      name: "Изменить ширину и высоту окна показа",
      exact: true,
    });
    await grip.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    expect((await player.boundingBox())!.width).toBeCloseTo(620, 0);
    expect((await player.boundingBox())!.height).toBeCloseTo(360, 0);
    await player
      .getByRole("button", { name: "Размер окна показа", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "По размеру окна", exact: true })
      .click();
    await expect(player).not.toHaveClass(/is-sized|is-floating/);
    for (const [width, height] of [
      [1920, 900],
      [1280, 580],
      [1280, 480],
      [960, 540],
    ]) {
      await page.setViewportSize({ width, height });
      await page
        .getByRole("button", { name: "На весь экран", exact: true })
        .click();
      const geometry = await page
        .locator(".room-fullscreen")
        .evaluate((root) => {
          const workspace = root.querySelector<HTMLElement>(".room-workspace")!;
          const main = root.querySelector<HTMLElement>(".room-main")!;
          const pane = root.querySelector<HTMLElement>(
            ".pane-player .pane-content",
          )!;
          const canvas = root
            .querySelector(".demo-canvas")!
            .getBoundingClientRect();
          const picture = root
            .querySelector(".demo-frame")!
            .getBoundingClientRect();
          return {
            fits: [root, workspace, main, pane].every(
              (element) =>
                element.scrollHeight <= element.clientHeight + 2 &&
                element.scrollWidth <= element.clientWidth + 2,
            ),
            fraction: canvas.height / innerHeight,
            widthFraction: canvas.width / innerWidth,
            pictureInside: picture.bottom <= innerHeight && picture.top >= 0,
          };
        });
      expect(geometry.fits).toBe(true);
      expect(geometry.fraction).toBeGreaterThan(0.52);
      expect(geometry.widthFraction).toBeGreaterThan(0.85);
      expect(geometry.pictureInside).toBe(true);
      await player
        .getByRole("button", { name: "Размер окна показа", exact: true })
        .click();
      await editor.getByLabel("Ширина, px", { exact: true }).fill("9999");
      await editor.getByLabel("Высота, px", { exact: true }).fill("9999");
      await editor
        .getByRole("button", { name: "Применить", exact: true })
        .click();
      const bounds = (await player.boundingBox())!;
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
      await expect(frame).toHaveAttribute("data-size-retained", "yes");
      await page.screenshot({
        path: `.local/ux-audit/demo-fit-window-${width}-${height}-${info.project.name}.png`,
        animations: "disabled",
      });
      await player
        .getByRole("button", { name: "Размер окна показа", exact: true })
        .click();
      await editor
        .getByRole("button", { name: "По размеру окна", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Выйти из полного экрана", exact: true })
        .click();
    }
    expect(
      await page.evaluate(() => Reflect.get(window, "__published")),
    ).toEqual(["screen_share"]);
  });
});

test("music rooms keep Demo first, show platform guidance and omit Website", async ({
  page,
}) => {
  const room = seed();
  room.room.format = "music";
  room.room.url = "";
  room.demo = null;
  room.site = null;
  room.browser = null;
  await openFixture(page, true, room);
  const switcher = page.locator(".stage-switch");
  await expect(switcher.locator("button").first()).toHaveText("Демо");
  await expect(
    switcher.getByRole("button", { name: "Сайт", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".music-room-guide")).toContainText("SoundCloud");
  await expect(page.locator(".music-room-guide")).toContainText("Spotify");
});

test("starting tab capture leaves native fullscreen without remounting the stream", async ({
  page,
}) => {
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await page.addInitScript(() => Reflect.set(window, "__chatShell", true));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openFixture(page, true, room);
  const root = page.locator(".room-fullscreen");
  const frame = page.locator(".demo-frame iframe");
  await expect(frame).toBeVisible();
  await frame.evaluate((element) =>
    element.setAttribute("data-capture-retained", "yes"),
  );
  await page
    .getByRole("button", { name: "На весь экран", exact: true })
    .click();
  await expect(root).toHaveAttribute("data-fullscreen-mode", "native");
  await page.getByRole("button", { name: "Начать показ", exact: true }).click();
  await expect(root).toHaveAttribute("data-fullscreen-mode", "page");
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true);
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  await expect(frame).toHaveAttribute("data-capture-retained", "yes");
  await page.setViewportSize({ width: 1600, height: 900 });
  expect(
    await root.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return [bounds.x, bounds.y, bounds.width, bounds.height];
    }),
  ).toEqual([0, 0, 1600, 900]);
  await page.keyboard.press("Escape");
  await expect(root).not.toHaveClass(/is-fullscreen/);
  await expect(page.locator(".sidebar")).not.toHaveAttribute("inert");
  await expect(
    page.getByRole("button", { name: "На весь экран", exact: true }),
  ).toBeFocused();
  await expect(frame).toHaveAttribute("data-capture-retained", "yes");
  expect(await page.evaluate(() => Reflect.get(window, "__published"))).toEqual(
    ["screen_share"],
  );
  await page
    .getByRole("button", { name: "На весь экран", exact: true })
    .click();
  await expect(root).toHaveAttribute("data-fullscreen-mode", "page");
  await page
    .getByRole("button", { name: "Выйти из полного экрана", exact: true })
    .click();
  await expect(root).not.toHaveClass(/is-fullscreen/);
  await expect(page.locator(".sidebar")).not.toHaveAttribute("inert");
});

test("presenter can explicitly share a separate window instead of cropping this tab", async ({
  page,
}) => {
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await openFixture(page, true, room);
  await page
    .getByRole("button", { name: "Показать отдельное окно", exact: true })
    .click();
  await expect(page.locator(".demo-frame iframe")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Показывать сайт внутри Katsodi",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Открыть сайт и показать", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__published")))
    .toEqual(["screen_share"]);
  expect(
    await page.evaluate(() => Reflect.get(window, "__displayOptions")),
  ).toMatchObject({
    video: { displaySurface: "window" },
    audio: true,
    selfBrowserSurface: "exclude",
  });
  expect(
    await page.evaluate(() => Reflect.get(window, "__cropped")),
  ).toBeUndefined();
  await page
    .getByRole("button", { name: "На весь экран", exact: true })
    .click();
  await expect(page.locator(".room-fullscreen")).toHaveAttribute(
    "data-fullscreen-mode",
    "native",
  );
});

test.describe("real browser tab capture", () => {
  // Test-owned Chromium only: the real picker is accepted for this tab.
  // Region Capture and MediaStreamTrack remain the browser implementations.
  test("captured room fills the viewport without captured-tab native fullscreen", async ({
    playwright,
    baseURL,
    storageState,
  }, info) => {
    test.setTimeout(120000);
    test.skip(
      info.project.name !== "desktop",
      "Presenting is a desktop capability",
    );
    const browser = await playwright.chromium.launch({
      headless: true,
      channel: "chromium",
      args: ["--auto-accept-this-tab-capture"],
    });
    try {
      const context = await browser.newContext({ baseURL, storageState });
      const page = await context.newPage();
      const room = seed();
      room.demo = liveDemo(mine);
      await page.addInitScript(() => {
        Reflect.set(window, "__chatShell", true);
        const capture = navigator.mediaDevices.getDisplayMedia.bind(
          navigator.mediaDevices,
        );
        navigator.mediaDevices.getDisplayMedia = async (options) => {
          const stream = await capture(options).catch((error: Error) => {
            console.warn("Real capture failed:", error.name, error.message);
            throw error;
          });
          Reflect.set(window, "__realCapture", stream);
          return stream;
        };
      });
      await page.setViewportSize({ width: 1920, height: 1080 });
      page.on("console", (message) => {
        if (message.text().startsWith("Real capture failed:"))
          console.log(message.text());
      });
      await openFixture(page, true, room);
      await expect(
        page.getByRole("button", { name: "Начать показ", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "На весь экран", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Начать показ", exact: true })
        .click();
      const root = page.locator(".room-fullscreen");
      await expect(root).toHaveAttribute("data-fullscreen-mode", "page");
      await expect
        .poll(() => page.evaluate(() => Reflect.get(window, "__published")))
        .toEqual(["screen_share"]);
      const captureState = () =>
        page.evaluate(() => {
          const track = (
            Reflect.get(window, "__realCapture") as MediaStream
          ).getVideoTracks()[0];
          const root = document
            .querySelector(".room-fullscreen")!
            .getBoundingClientRect();
          return {
            live: track.readyState === "live",
            native: !!document.fullscreenElement,
            fills:
              root.x === 0 &&
              root.y === 0 &&
              root.width === innerWidth &&
              root.height === innerHeight,
            surface: track.getSettings().displaySurface,
          };
        });
      await expect.poll(captureState).toEqual({
        live: true,
        native: false,
        fills: true,
        surface: "browser",
      });
      await page
        .getByRole("button", { name: "Развернуть с чатом", exact: true })
        .click();
      await expect(page.locator(".stage-switch")).toBeHidden();
      await expect(page.locator(".pane-side")).toBeVisible();
      expect((await captureState()).live).toBe(true);
      await page
        .getByRole("button", { name: "Обычный вид с чатом", exact: true })
        .click();
      await expect(root).toHaveAttribute("data-fullscreen-mode", "page");
      await page.setViewportSize({ width: 1600, height: 900 });
      await expect.poll(captureState).toEqual({
        live: true,
        native: false,
        fills: true,
        surface: "browser",
      });
      const player = page.locator(".pane-player");
      const capturedFrame = player.locator(".demo-frame iframe");
      await capturedFrame.evaluate((frame) =>
        frame.setAttribute("data-live-sized", "yes"),
      );
      await player
        .getByRole("button", { name: "Размер окна показа", exact: true })
        .click();
      const editor = player.locator(".pane-size-controls");
      await editor.getByLabel("Ширина, px", { exact: true }).fill("900");
      await editor.getByLabel("Высота, px", { exact: true }).fill("600");
      await editor
        .getByRole("button", { name: "Применить", exact: true })
        .click();
      await expect(capturedFrame).toHaveAttribute("data-live-sized", "yes");
      expect((await captureState()).live).toBe(true);
      await player
        .getByRole("button", { name: "Размер окна показа", exact: true })
        .click();
      await editor
        .getByRole("button", { name: "По размеру окна", exact: true })
        .click();
      await page
        .locator(".pane-player")
        .getByRole("button", { name: "Свернуть панель", exact: true })
        .click();
      await expect(page.locator(".demo-frame iframe")).toBeVisible();
      expect((await captureState()).live).toBe(true);
      await page
        .locator(".pane-player")
        .getByRole("button", { name: "Восстановить панель", exact: true })
        .click();
      await page.screenshot({
        path: ".local/ux-audit/real-tab-capture-fullscreen.png",
        animations: "disabled",
      });
      await page
        .getByRole("button", { name: "Выйти из полного экрана", exact: true })
        .click();
      await expect(root).not.toHaveClass(/is-fullscreen/);
      expect((await captureState()).live).toBe(true);
      await page.evaluate(() =>
        (Reflect.get(window, "__realCapture") as MediaStream)
          .getTracks()
          .forEach((track) => track.stop()),
      );
    } finally {
      await browser.close();
    }
  });
});

test("fullscreen viewer preserves incoming video aspect and annotation bounds", async ({
  page,
}) => {
  const room = seed();
  room.demo = liveDemo(friend);
  await page.addInitScript(() => Reflect.set(window, "__screenViewer", true));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openFixture(page, true, room);
  await expect(page.locator(".demo-screen video")).toBeVisible();
  await page.locator(".demo-screen video").evaluate((video) => {
    Object.defineProperties(video, {
      videoWidth: { value: 800, configurable: true },
      videoHeight: { value: 600, configurable: true },
    });
    video.dispatchEvent(new Event("loadedmetadata"));
  });
  await page
    .getByRole("button", { name: "На весь экран", exact: true })
    .click();
  await expect(page.locator(".room-fullscreen")).toHaveClass(/is-fullscreen/);
  const geometry = await page.locator(".demo-canvas").evaluate((canvas) => {
    const area = canvas.getBoundingClientRect();
    const video = canvas.querySelector(".demo-screen")!.getBoundingClientRect();
    const overlay = canvas
      .querySelector(".demo-overlay")!
      .getBoundingClientRect();
    return {
      ratio: video.width / video.height,
      inside:
        video.left >= area.left - 1 &&
        video.right <= area.right + 1 &&
        video.top >= area.top - 1 &&
        video.bottom <= area.bottom + 1,
      overlayWidth: overlay.width,
      videoWidth: video.width,
      overlayHeight: overlay.height,
      videoHeight: video.height,
    };
  });
  expect(geometry.ratio).toBeCloseTo(4 / 3, 2);
  expect(geometry.inside).toBe(true);
  expect(geometry.overlayWidth).toBeCloseTo(geometry.videoWidth, 1);
  expect(geometry.overlayHeight).toBeCloseTo(geometry.videoHeight, 1);
  await page.locator(".demo-screen video").evaluate((video) => {
    Object.defineProperty(video, "videoHeight", {
      value: 400,
      configurable: true,
    });
    video.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(async () => {
      const picture = await page.locator(".demo-screen").boundingBox();
      return picture!.width / picture!.height;
    })
    .toBeCloseTo(2, 2);
});

test("in-app sharing stops rather than publish an uncropped tab", async ({
  page,
}) => {
  const room = seed();
  room.demo = liveDemo(mine);
  await page.addInitScript(fakeCapture);
  await page.addInitScript(() => {
    const capture = navigator.mediaDevices.getDisplayMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getDisplayMedia = async (options) => {
      const stream = await capture(options);
      Reflect.deleteProperty(stream.getVideoTracks()[0], "cropTo");
      Reflect.set(window, "__uncroppedCapture", stream);
      return stream;
    };
  });
  await openFixture(page, true, room);
  await page.getByRole("button", { name: "Начать показ", exact: true }).click();
  await expect(page.locator(".demo-problem")).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "__published")),
  ).toBeUndefined();
  expect(
    await page.evaluate(
      () =>
        Reflect.get(window, "__uncroppedCapture").getVideoTracks()[0]
          .readyState,
    ),
  ).toBe("ended");
});

test("the player keeps its height when the stage has a switcher and a source form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1468, height: 828 });
  const snapshot = seed();
  snapshot.room.url = "https://youtu.be/U6yqCZ0PQBE";
  snapshot.members[0].role = "moderator";
  // Site and demo enabled: the stage gets its Demo / Player / Site switcher.
  snapshot.site = null;
  snapshot.demo = null;
  await openFixture(page, true, snapshot);
  await expect(page.locator(".stage-switch")).toBeVisible();
  const frame = page.locator(".room-player-frame");
  await expect(frame).toBeVisible();
  // The pane scrolls instead of squeezing the player into a strip.
  const player = await page.locator(".stage-pane:not([hidden]) > .room-player").boundingBox();
  const inner = await frame.boundingBox();
  expect(player!.height).toBeGreaterThanOrEqual(inner!.height);
  expect(inner!.height).toBeGreaterThan(200);
});

test("fullscreen covers the screen on phones without the Fullscreen API", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "mobile", "iPhone-only behaviour.");
  await page.addInitScript(() => {
    // iPhone Safari offers no element fullscreen.
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      value: undefined,
      configurable: true,
    });
  });
  const snapshot = seed();
  snapshot.room.url = "https://youtu.be/U6yqCZ0PQBE";
  await openFixture(page, true, snapshot);
  await page.getByRole("button", { name: "На весь экран", exact: true }).click();
  const root = page.locator(".room-fullscreen");
  await expect(root).toHaveAttribute("data-fullscreen-mode", "page");
  await expect(page.getByText("Полноэкранный режим недоступен")).toHaveCount(0);
  // Turned sideways, the video takes almost the whole height.
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".room-bar")).toBeHidden();
  const frame = await page.locator(".room-player-frame").boundingBox();
  expect(frame!.height).toBeGreaterThan(300);
  const exit = page.getByRole("button", { name: "Выйти из полного экрана", exact: true });
  await exit.click();
  await expect(root).not.toHaveAttribute("data-fullscreen-mode", "page");
});
