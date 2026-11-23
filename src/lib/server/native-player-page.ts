/**
 * The provider-only page the desktop client's player helper opens. It holds
 * one official embed (YouTube IFrame API, Vimeo Player SDK, SoundCloud
 * Widget API, Spotify iFrame API or Twitch Embed API, or a player without an
 * API: Kick, Google Drive, Rutube, OK, Dailymotion, whose <video> the helper's
 * frame script reports and drives) and a tiny control surface the helper drives with
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
  "https://player.twitch.tv",
];
/** Players without an API, kept in step through the helper's frame script. */
export const FRAME_ORIGINS = [
  "https://clips.twitch.tv",
  "https://player.kick.com",
  "https://drive.google.com",
  "https://rutube.ru",
  "https://ok.ru",
  "https://geo.dailymotion.com",
];

const SCRIPT = String.raw`
(() => {
  "use strict";
  const stage = document.getElementById("stage");
  const message = document.getElementById("message");
  let generation = 0, adapter = null, ready = false, playing = false, error = "";
  let duration = 0, position = 0, events = [];
  // What plays, as the provider describes it (SoundCloud: the performer,
  // cover and length of the current sound), or null.
  let meta = null;
  // A frame player's "click to play" cover: the helper presses the middle
  // of the player with a real click (pages ignore scripted ones).
  let press = false;
  // The previous player when the next source is of the same kind: it loads
  // the next track in place instead of a new frame (much faster switches).
  let reuse = null;
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
  async function youtube(url, controls, mine, previous) {
    const id = youtubeId(url);
    if (!id) return fail("unsupported", mine);
    if (previous && previous.player && previous.controls === controls) {
      const holder = previous.holder;
      holder.gen = mine;
      await new Promise((resolve) => {
        holder.cued = resolve;
        previous.player.cueVideoById(id);
        setTimeout(resolve, 2500);
      });
      holder.cued = null;
      return Object.assign({}, previous);
    }
    const holder = { gen: mine, cued: null };
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
        onError: (e) => fail(e && (e.data === 101 || e.data === 150) ? "embed_blocked" : "provider", holder.gen),
        onStateChange: ({ data }) => {
          if (holder.gen !== generation) return;
          if (data === 5 && holder.cued) holder.cued();
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
      kind: "youtube", reusable: true, player, holder, controls,
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
  async function soundcloud(url, controls, mine, previous) {
    // A track page, or a track known by id (api.soundcloud.com/tracks/<id>).
    const byId = url.hostname === "api.soundcloud.com" && /^\/tracks\/\d{1,15}$/.test(url.pathname);
    if (!byId && (!["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(url.hostname) ||
        !/^\/[^/]+\/[^/]+\/?$/.test(url.pathname))) return fail("unsupported", mine);
    const canonical = (byId ? "https://api.soundcloud.com" : "https://soundcloud.com") + url.pathname;
    const describe = (widget) => widget.getCurrentSound((sound) => {
      if (mine !== generation || !sound) return;
      const art = String(sound.artwork_url || (sound.user && sound.user.avatar_url) || "");
      const artist = (sound.publisher_metadata && sound.publisher_metadata.artist) || (sound.user && sound.user.username) || "";
      meta = {
        title: String(sound.title || "").slice(0, 200),
        artist: String(artist).slice(0, 120),
        cover: /^https:\/\/i\d?\.sndcdn\.com\//.test(art) ? art.replace(/-large\.(jpg|png)$/, "-t500x500.$1") : "",
        duration: Number(sound.duration) > 0 ? Number(sound.duration) / 1000 : 0,
      };
    });
    if (previous && previous.widget) {
      const widget = previous.widget;
      previous.holder.gen = mine;
      await Promise.race([
        new Promise((resolve) => widget.load(canonical, { auto_play: false, visual: true, show_comments: false,
          show_reposts: false, hide_related: true, show_teaser: false, callback: resolve })),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
      if (mine !== generation) return;
      describe(widget);
      return Object.assign({}, previous);
    }
    const holder = { gen: mine };
    const el = frame("https://w.soundcloud.com/player/?url=" + encodeURIComponent(canonical) +
      "&auto_play=false&visual=true&show_comments=false&show_reposts=false&hide_related=true&show_teaser=false");
    await script("https://w.soundcloud.com/player/api.js", () => !!window.SC);
    if (mine !== generation) return;
    const widget = SC.Widget(el);
    await Promise.race([
      new Promise((resolve) => widget.bind(SC.Widget.Events.READY, resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    // Bound once; a reused widget reports for the generation it now plays.
    const current = () => holder.gen === generation;
    widget.bind(SC.Widget.Events.PLAY, () => { if (current()) { playing = true; emit("play"); } });
    widget.bind(SC.Widget.Events.PAUSE, () => { if (current()) { playing = false; emit("pause"); } });
    widget.bind(SC.Widget.Events.FINISH, () => { if (current()) { playing = false; emit("ended"); } });
    widget.bind(SC.Widget.Events.SEEK, () => { if (current()) emit("seek"); });
    widget.bind(SC.Widget.Events.ERROR, () => fail("provider", holder.gen));
    describe(widget);
    const ask = (method) => new Promise((resolve) => widget[method]((ms) => resolve((ms || 0) / 1000)));
    return {
      play: () => widget.play(), pause: () => widget.pause(),
      seek: (s) => widget.seekTo(Math.round(s * 1000)), volume: (v) => widget.setVolume(v),
      time: () => ask("getPosition"), length: () => ask("getDuration"),
      destroy: () => {},
      kind: "soundcloud", reusable: true, widget, holder,
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
  // Spotify and VK players that only embed (no shared timeline, as on the
  // website): their own iframe, which each person plays themselves.
  async function embed(url, controls, mine) {
    const spotifyEmbed = url.hostname === "open.spotify.com" &&
      /^\/embed\/(?:track|album|playlist|episode|show|artist)\/[A-Za-z0-9]{22}\/?$/.test(url.pathname);
    const vkEmbed = ["vk.com", "vk.ru", "vkvideo.ru"].includes(url.hostname) && url.pathname === "/video_ext.php";
    // Playlists: SoundCloud's widget (sets) and YouTube's playlist player.
    const playlist = (url.hostname === "w.soundcloud.com" && url.pathname === "/player/") ||
      (url.hostname === "www.youtube.com" && url.pathname === "/embed/videoseries");
    // Twitch: channels, past broadcasts and clips in Twitch's own player.
    const twitch = (url.hostname === "player.twitch.tv" && url.pathname === "/") ||
      (url.hostname === "clips.twitch.tv" && url.pathname === "/embed");
    if (!spotifyEmbed && !vkEmbed && !playlist && !twitch && !framePlayer(url)) return fail("unsupported", mine);
    const el = frame(url.href);
    return {
      play: () => {}, pause: () => {}, seek: () => {}, volume: () => {},
      time: async () => 0, length: async () => 0,
      destroy: () => el.remove(),
    };
  }
  // VK Video: VK's own player answers postMessage commands (init, play,
  // pause, seek) and reports its state, time and duration, as VK's
  // videoplayer.js does; the frame carries js_api=1.
  async function vk(url, controls, mine) {
    if (!["vk.com", "vk.ru", "vkvideo.ru"].includes(url.hostname) || url.pathname !== "/video_ext.php")
      return fail("unsupported", mine);
    url.searchParams.set("js_api", "1");
    const el = frame(url.href);
    const target = url.origin;
    let state = "uninited", time = 0, length = 0;
    const send = (m) => { if (el.contentWindow) el.contentWindow.postMessage(m, target); };
    const listener = (event) => {
      if (event.source !== el.contentWindow || event.origin !== target) return;
      const data = event.data || {};
      if (typeof data.time === "number") time = data.time;
      if (typeof data.duration === "number") length = data.duration;
      if (typeof data.state === "string") state = data.state;
      if (mine !== generation) return;
      if (data.event === "started" || data.event === "resumed") { state = "playing"; playing = true; emit("play"); }
      else if (data.event === "paused") { state = "paused"; playing = false; emit("pause"); }
      else if (data.event === "ended") { state = "ended"; playing = false; emit("ended"); }
      else if (data.event === "seeked") emit("seek");
    };
    window.addEventListener("message", listener);
    await new Promise((resolve, reject) => {
      const poke = setInterval(() => send({ method: "init" }), 500);
      const timer = setTimeout(() => { clearInterval(poke); reject(new Error("sdk")); }, 20000);
      const ready = (event) => {
        if (event.source !== el.contentWindow || !event.data || event.data.event !== "inited") return;
        clearInterval(poke); clearTimeout(timer); window.removeEventListener("message", ready); resolve();
      };
      window.addEventListener("message", ready);
    });
    return {
      play: () => send({ method: "play" }), pause: () => send({ method: "pause" }),
      seek: (s) => send({ method: "seek", time: s }), volume: (v) => send({ method: "set_volume", volume: v / 100 }),
      time: async () => time, length: async () => length,
      destroy: () => { window.removeEventListener("message", listener); el.remove(); },
    };
  }
  // Twitch: the official Embed API (play, pause, seek, time) for a channel
  // or a past broadcast; a live channel follows play and pause only. Clips
  // have no API: their player is driven like the frame players below.
  async function twitch(url, controls, mine) {
    if (url.hostname === "clips.twitch.tv") return framed(url, controls, mine);
    if (url.hostname !== "player.twitch.tv" || url.pathname !== "/") return fail("unsupported", mine);
    const channel = url.searchParams.get("channel"), video = url.searchParams.get("video");
    const live = !!channel && /^[A-Za-z0-9_]{3,25}$/.test(channel);
    if (!live && !(video && /^v?\d{1,12}$/.test(video))) return fail("unsupported", mine);
    await script("https://player.twitch.tv/js/embed/v1.js", () => !!(window.Twitch && window.Twitch.Player));
    if (mine !== generation) return;
    const mount = document.createElement("div");
    mount.id = "twitch-" + mine;
    stage.replaceChildren(mount);
    const options = { width: "100%", height: "100%", parent: [location.hostname], autoplay: false, controls: !!controls };
    if (live) options.channel = channel.toLowerCase(); else options.video = video.startsWith("v") ? video : "v" + video;
    const player = new Twitch.Player(mount.id, options);
    await new Promise((resolve) => { player.addEventListener(Twitch.Player.READY, resolve); setTimeout(resolve, 15000); });
    if (mine !== generation) return;
    const on = (name, handler) => player.addEventListener(name, () => { if (mine === generation) handler(); });
    on(Twitch.Player.PLAY, () => { playing = true; emit("play"); });
    on(Twitch.Player.PAUSE, () => { playing = false; emit("pause"); });
    on(Twitch.Player.ENDED, () => { playing = false; emit("ended"); });
    on(Twitch.Player.SEEK, () => emit("seek"));
    return {
      play: () => player.play(), pause: () => player.pause(),
      seek: (s) => { if (!live) player.seek(s); },
      volume: (v) => { player.setMuted(v === 0); player.setVolume(v / 100); },
      time: async () => (live ? 0 : player.getCurrentTime() || 0), length: async () => (live ? 0 : player.getDuration() || 0),
      destroy: () => stage.replaceChildren(),
    };
  }
  // Players without a public API, as their own embed: the helper's frame
  // script finds the <video> inside and reports it here (katsodiFrame); the
  // commands go back the same way (katsodiCommand). Until a video exists
  // (a "click to play" cover), the helper presses the player's middle.
  function framePlayer(url) {
    const path = url.pathname;
    return (url.hostname === "player.kick.com" && /^\/(?:video\/[0-9a-f-]{36}|[A-Za-z0-9_-]{2,40})\/?$/i.test(path)) ||
      (url.hostname === "drive.google.com" && /^\/file\/d\/[A-Za-z0-9_-]{20,80}\/preview$/.test(path)) ||
      (url.hostname === "rutube.ru" && /^\/play\/embed\/[0-9a-f]{32}\/?$/.test(path)) ||
      (url.hostname === "ok.ru" && /^\/videoembed\/\d{3,20}\/?$/.test(path)) ||
      (url.hostname === "geo.dailymotion.com" && path === "/player.html" && /^[A-Za-z0-9]{5,12}$/.test(url.searchParams.get("video") || "")) ||
      (url.hostname === "clips.twitch.tv" && path === "/embed");
  }
  async function framed(url, controls, mine) {
    if (!framePlayer(url)) return fail("unsupported", mine);
    frame(url.href);
    // Every frame that reports, by window; the one with the video leads.
    const frames = new Map();
    let lead = null, wanted = "", wantedSeek = -1, wantedVolume = -1;
    const fresh = (entry) => entry && Date.now() - entry.at < 3000;
    const post = (target, op, value) => { try { target.postMessage({ katsodiCommand: { op, value } }, "*"); } catch {} };
    function send(op, value) {
      if (fresh(lead)) return post(lead.source, op, value);
      // No video yet: a play reaches every frame (one of them has the cover).
      if (op === "play") for (const entry of frames.values()) if (fresh(entry)) post(entry.source, op, value);
    }
    function apply() {
      if (wanted) send(wanted, 0);
      if (wantedSeek >= 0 && lead && lead.duration > 0) { send("seek", wantedSeek); wantedSeek = -1; }
      if (wantedVolume >= 0) send("volume", wantedVolume);
    }
    const listener = (event) => {
      const s = event.data && event.data.katsodiFrame;
      if (!s || typeof s !== "object" || !event.source || mine !== generation) return;
      const entry = { source: event.source, at: Date.now(), video: !!s.video, playing: !!s.playing,
                      position: Math.max(0, Number(s.position) || 0), duration: Math.max(0, Number(s.duration) || 0) };
      if (frames.size < 16 || frames.has(event.source)) frames.set(event.source, entry);
      if (!entry.video) return;
      const changed = !lead || lead.source !== event.source;
      if (changed && fresh(lead) && lead.duration >= entry.duration) return;
      lead = entry;
      if (changed) apply();
      position = entry.position;
      duration = entry.duration;
      playing = entry.playing;
      if (Array.isArray(s.events))
        for (const ev of s.events.slice(0, 8)) if (["play", "pause", "ended", "seek"].includes(ev)) emit(ev);
    };
    window.addEventListener("message", listener);
    // No video yet while play is wanted: a cover waits for its click. The
    // helper presses the player's middle, at most twice per source, 4 s apart.
    let presses = 0, pressedAt = 0;
    const nudge = setInterval(() => {
      if (mine !== generation || fresh(lead) || wanted !== "play") return;
      if (presses < 2 && Date.now() - pressedAt > 4000) { presses += 1; pressedAt = Date.now(); press = true; }
    }, 1000);
    return {
      play: () => { wanted = "play"; send("play", 0); },
      pause: () => { wanted = "pause"; send("pause", 0); },
      // A live stream (no length) is never seeked.
      seek: (s) => { if (fresh(lead)) { if (lead.duration > 0) send("seek", s); } else wantedSeek = s; },
      volume: (v) => { wantedVolume = v; send("volume", v); },
      time: async () => position, length: async () => duration,
      destroy: () => { clearInterval(nudge); window.removeEventListener("message", listener); stage.replaceChildren(); },
    };
  }
  const kinds = { youtube, vimeo, soundcloud, spotify, embed, vk, twitch, frame: framed };
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
  // keep: the next source is of the same kind and reuses this player.
  function unload(keep) {
    generation += 1;
    reuse = keep && adapter && adapter.reusable ? adapter : null;
    if (adapter && !reuse) { try { adapter.destroy(); } catch {} }
    if (!reuse) stage.replaceChildren();
    adapter = null; ready = false; playing = false; error = ""; duration = 0; position = 0; events = []; meta = null; press = false;
  }
  window.katsodi = Object.freeze({
    load(next, kind, source, controls) {
      unload(!!(adapter && adapter.kind === kind && adapter.reusable));
      generation = Number(next) || 0;
      const mine = generation;
      const url = parse(String(source));
      if (!url || !kinds[kind]) return fail("unsupported", mine);
      const previous = reuse;
      reuse = null;
      kinds[kind](url, !!controls, mine, previous).then((made) => {
        if (mine !== generation || !made) return;
        adapter = made; ready = true; emit("ready");
      }, () => fail("sdk", mine));
    },
    play() { if (adapter) adapter.play(); },
    pause() { if (adapter) adapter.pause(); },
    seek(s) { s = Number(s); if (adapter && isFinite(s) && s >= 0 && s <= 172800) adapter.seek(s); },
    volume(v) { v = Number(v); if (adapter && isFinite(v)) adapter.volume(Math.max(0, Math.min(100, v))); },
    unload: () => unload(false),
    // Synchronous: the helper's runJavaScript does not await promises, so
    // the position is sampled by the timer below and read here.
    poll() {
      const out = { generation, ready, playing, position, duration, error, events, codecs, meta };
      if (press) { out.press = { x: Math.round(innerWidth / 2), y: Math.round(innerHeight / 2) }; press = false; }
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
      // VK's own player (video_ext.php), Twitch clips and the players without an API.
      `frame-src ${sdks} https://vk.com https://vk.ru https://vkvideo.ru ${FRAME_ORIGINS.join(" ")}`,
      "img-src data:",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
  };
}
