/**
 * The provider-only page the desktop client's player helper opens. It holds
 * one official embed (YouTube IFrame API, Vimeo Player SDK, SoundCloud
 * Widget API or Spotify iFrame API) and a tiny control surface the helper drives with
 * runJavaScript: no Katsodi navigation, account, chat or data. It is served
 * from the API origin itself, so providers see a real origin instead of a
 * spoofed one.
 *
 * window.katsodi:
 *   load(generation, kind, sourceUrl, controls)  validates and embeds
 *   play() pause() seek(seconds) volume(0..100) unload()
 *   poll() -> { generation, ready, playing, position, duration, error, events[] }
 */

export const PLAYER_ORIGINS = [
  "https://www.youtube.com",
  "https://player.vimeo.com",
  "https://w.soundcloud.com",
  "https://open.spotify.com",
];

const SCRIPT = String.raw`
(() => {
  "use strict";
  const stage = document.getElementById("stage");
  const message = document.getElementById("message");
  let generation = 0, adapter = null, ready = false, playing = false, error = "";
  let duration = 0, position = 0, events = [];
  const emit = (type) => { events.push(type); if (events.length > 20) events.shift(); };
  const loaded = {};
  function script(src, test) {
    if (test()) return Promise.resolve();
    if (!loaded[src]) loaded[src] = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src; tag.async = true;
      tag.onload = () => (test() ? resolve() : reject(new Error("sdk")));
      tag.onerror = () => { delete loaded[src]; reject(new Error("sdk")); };
      document.head.appendChild(tag);
    });
    return loaded[src];
  }
  function parse(input) {
    try {
      const url = new URL(input);
      if (url.protocol !== "https:" || url.username || url.password || input.length > 2048) return null;
      return url;
    } catch { return null; }
  }
  function youtubeId(url) {
    const host = url.hostname;
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(host)) return null;
    const id = host === "youtu.be" ? url.pathname.slice(1)
      : url.pathname === "/watch" ? url.searchParams.get("v")
      : (url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)$/) || [])[1];
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  function frame(src) {
    const el = document.createElement("iframe");
    el.src = src;
    el.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    el.referrerPolicy = "strict-origin-when-cross-origin";
    el.setAttribute("allowfullscreen", "");
    stage.replaceChildren(el);
    return el;
  }
  function fail(code, mine) {
    if (mine !== generation) return;
    error = code; ready = false; playing = false;
    message.textContent = "";
    emit("error");
  }
  async function youtube(url, controls, mine) {
    const id = youtubeId(url);
    if (!id) return fail("unsupported", mine);
    const el = frame("https://www.youtube.com/embed/" + id + "?enablejsapi=1&playsinline=1&rel=0" +
      "&controls=" + (controls ? 1 : 0) + "&disablekb=" + (controls ? 0 : 1) +
      "&origin=" + encodeURIComponent(location.origin));
    await new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) return resolve();
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (previous) previous(); resolve(); };
      // iframe_api defines YT at once and YT.Player only after its widget
      // script arrives, announced by onYouTubeIframeAPIReady.
      script("https://www.youtube.com/iframe_api", () => !!window.YT).catch(reject);
    });
    if (mine !== generation) return;
    const player = await new Promise((resolve) => {
      const instance = new YT.Player(el, { events: {
        onReady: () => resolve(instance),
        onError: (e) => fail(e && (e.data === 101 || e.data === 150) ? "embed_blocked" : "provider", mine),
        onStateChange: ({ data }) => {
          if (mine !== generation) return;
          if (data === 1) { playing = true; emit("play"); }
          else if (data === 2) { playing = false; emit("pause"); }
          else if (data === 0) { playing = false; emit("ended"); }
        },
      } });
    });
    return {
      play: () => player.playVideo(), pause: () => player.pauseVideo(),
      seek: (s) => player.seekTo(s, true), volume: (v) => player.setVolume(v),
      time: async () => player.getCurrentTime() || 0, length: async () => player.getDuration() || 0,
      destroy: () => player.destroy(),
    };
  }
  async function vimeo(url, controls, mine) {
    if (!["vimeo.com", "www.vimeo.com"].includes(url.hostname)) return fail("unsupported", mine);
    const id = (url.pathname.match(/^\/(?:video\/)?(\d{1,12})(?:\/|$)/) || [])[1];
    if (!id) return fail("unsupported", mine);
    const el = frame("https://player.vimeo.com/video/" + id + "?dnt=1&playsinline=1");
    await script("https://player.vimeo.com/api/player.js", () => !!window.Vimeo);
    if (mine !== generation) return;
    const player = new Vimeo.Player(el);
    await player.ready();
    player.on("play", () => { playing = true; emit("play"); });
    player.on("pause", () => { playing = false; emit("pause"); });
    player.on("ended", () => { playing = false; emit("ended"); });
    player.on("seeked", () => emit("seek"));
    player.on("error", () => fail("provider", mine));
    return {
      play: () => player.play().catch(() => fail("blocked", mine)), pause: () => player.pause().catch(() => {}),
      seek: (s) => player.setCurrentTime(s).catch(() => {}), volume: (v) => player.setVolume(v / 100).catch(() => {}),
      time: () => player.getCurrentTime().catch(() => 0), length: () => player.getDuration().catch(() => 0),
      destroy: () => player.destroy().catch(() => {}),
    };
  }
  async function soundcloud(url, controls, mine) {
    if (!["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(url.hostname) ||
        !/^\/[^/]+\/[^/]+\/?$/.test(url.pathname)) return fail("unsupported", mine);
    const canonical = "https://soundcloud.com" + url.pathname;
    const el = frame("https://w.soundcloud.com/player/?url=" + encodeURIComponent(canonical) +
      "&auto_play=false&visual=true&show_comments=false&show_reposts=false&hide_related=true&show_teaser=false");
    await script("https://w.soundcloud.com/player/api.js", () => !!window.SC);
    if (mine !== generation) return;
    const widget = SC.Widget(el);
    await Promise.race([
      new Promise((resolve) => widget.bind(SC.Widget.Events.READY, resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    widget.bind(SC.Widget.Events.PLAY, () => { playing = true; emit("play"); });
    widget.bind(SC.Widget.Events.PAUSE, () => { playing = false; emit("pause"); });
    widget.bind(SC.Widget.Events.FINISH, () => { playing = false; emit("ended"); });
    widget.bind(SC.Widget.Events.SEEK, () => emit("seek"));
    widget.bind(SC.Widget.Events.ERROR, () => fail("provider", mine));
    const ask = (method) => new Promise((resolve) => widget[method]((ms) => resolve((ms || 0) / 1000)));
    return {
      play: () => widget.play(), pause: () => widget.pause(),
      seek: (s) => widget.seekTo(Math.round(s * 1000)), volume: (v) => widget.setVolume(v),
      time: () => ask("getPosition"), length: () => ask("getDuration"),
      destroy: () => {},
    };
  }
  // Spotify: the official embed; without a Spotify login in this private
  // profile it plays the track preview. No volume control in its API.
  async function spotify(url, controls, mine) {
    const id = url.hostname === "open.spotify.com" &&
      (url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})\/?$/) || [])[1];
    if (!id) return fail("unsupported", mine);
    const api = await new Promise((resolve, reject) => {
      if (window.katsodiSpotify) return resolve(window.katsodiSpotify);
      window.onSpotifyIframeApiReady = (made) => { window.katsodiSpotify = made; resolve(made); };
      // The loader announces itself through onSpotifyIframeApiReady after
      // fetching its real script, so the tag is added here, not via script().
      if (document.querySelector("script[data-spotify]")) return;
      const tag = document.createElement("script");
      tag.src = "https://open.spotify.com/embed/iframe-api/v1";
      tag.async = true;
      tag.dataset.spotify = "1";
      tag.onerror = () => { tag.remove(); reject(new Error("sdk")); };
      document.head.appendChild(tag);
      setTimeout(() => reject(new Error("sdk")), 20000);
    });
    if (mine !== generation) return;
    const mount = document.createElement("div");
    stage.replaceChildren(mount);
    const controller = await new Promise((resolve) =>
      api.createController(mount, { uri: "spotify:track:" + id, width: "100%", height: "100%" }, resolve));
    let paused = true;
    controller.addListener("playback_update", (e) => {
      if (mine !== generation || !e || !e.data) return;
      position = (e.data.position || 0) / 1000;
      if (e.data.duration) duration = e.data.duration / 1000;
      if (e.data.isPaused !== paused) {
        paused = e.data.isPaused;
        playing = !paused;
        emit(paused ? (duration && position >= duration - 0.6 ? "ended" : "pause") : "play");
      }
    });
    return {
      play: () => controller.resume ? controller.resume() : controller.play(), pause: () => controller.pause(),
      seek: (s) => controller.seek(s), volume: () => {},
      time: async () => position, length: async () => duration,
      destroy: () => controller.destroy(),
    };
  }
  const kinds = { youtube, vimeo, soundcloud, spotify };
  // What this engine can decode: providers differ (YouTube uses VP9/Opus;
  // others may need H.264, AAC or MP3, which some builds lack).
  const codecs = (() => {
    const ms = (type) => { try { return !!(window.MediaSource && MediaSource.isTypeSupported(type)); } catch { return false; } };
    const audio = document.createElement("audio");
    return {
      vp9: ms('video/webm; codecs="vp9"'), opus: ms('audio/webm; codecs="opus"'),
      h264: ms('video/mp4; codecs="avc1.42E01E"'), aac: ms('audio/mp4; codecs="mp4a.40.2"'),
      mp3: audio.canPlayType("audio/mpeg") !== "",
    };
  })();
  // Samples time and length twice a second while a player exists.
  setInterval(async () => {
    const current = adapter, mine = generation;
    if (!current) return;
    try { const t = await current.time(); if (mine === generation) position = t; } catch {}
    if (!duration) { try { const d = await current.length(); if (mine === generation) duration = d; } catch {} }
  }, 500);
  function unload() {
    generation += 1;
    if (adapter) { try { adapter.destroy(); } catch {} }
    adapter = null; ready = false; playing = false; error = ""; duration = 0; position = 0; events = [];
    stage.replaceChildren();
  }
  window.katsodi = Object.freeze({
    load(next, kind, source, controls) {
      unload();
      generation = Number(next) || 0;
      const mine = generation;
      const url = parse(String(source));
      if (!url || !kinds[kind]) return fail("unsupported", mine);
      kinds[kind](url, !!controls, mine).then((made) => {
        if (mine !== generation || !made) return;
        adapter = made; ready = true; emit("ready");
      }, () => fail("sdk", mine));
    },
    play() { if (adapter) adapter.play(); },
    pause() { if (adapter) adapter.pause(); },
    seek(s) { s = Number(s); if (adapter && isFinite(s) && s >= 0 && s <= 172800) adapter.seek(s); },
    volume(v) { v = Number(v); if (adapter && isFinite(v)) adapter.volume(Math.max(0, Math.min(100, v))); },
    unload,
    // Synchronous: the helper's runJavaScript does not await promises, so
    // the position is sampled by the timer below and read here.
    poll() {
      const out = { generation, ready, playing, position, duration, error, events, codecs };
      events = [];
      return JSON.stringify(out);
    },
  });
})();
`;

export function nativePlayerPage(nonce: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Katsodi player</title>
<style nonce="${nonce}">
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
  #stage, #stage iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  #message { display: none; }
</style>
</head>
<body>
<div id="stage"></div>
<div id="message"></div>
<script nonce="${nonce}">${SCRIPT}</script>
</body>
</html>`;
}

export function nativePlayerHeaders(nonce: string): Record<string, string> {
  const sdks = PLAYER_ORIGINS.join(" ");
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": [
      "default-src 'none'",
      // YouTube's iframe_api pulls its widget script from s.ytimg.com.
      // Spotify's iframe-api loader takes its real script from embed-cdn and
      // evaluates code strings. Allowed here only: this page holds no
      // Katsodi data, account or token, and scripts still need the nonce or
      // one of the provider hosts.
      `script-src 'nonce-${nonce}' 'unsafe-eval' ${sdks} https://s.ytimg.com https://embed-cdn.spotifycdn.com`,
      `style-src 'nonce-${nonce}'`,
      `frame-src ${sdks}`,
      "img-src data:",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  };
}
