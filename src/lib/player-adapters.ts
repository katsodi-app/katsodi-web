/**
 * Thin adapters over providers' OFFICIAL player APIs, so one synced player
 * can drive YouTube, Vimeo and SoundCloud the same way:
 * - YouTube IFrame Player API  https://developers.google.com/youtube/iframe_api_reference
 * - Vimeo Player SDK           https://developer.vimeo.com/player/sdk
 * - SoundCloud Widget API      https://developers.soundcloud.com/docs/api/html5-widget
 * Each SDK script is loaded once, only in rooms whose source can be synced.
 * Playing state is tracked from the providers' own events.
 */
import { loadYouTubeApi, YT_STATE } from "./youtube-api";

export type SyncKind = "youtube" | "vimeo" | "soundcloud";
export type AdapterEvent = "play" | "pause" | "ended" | "seek" | "error";
export type PlayerAdapter = {
  /** Resolves false when the browser refused playback (autoplay policy). */
  play(): Promise<boolean>;
  pause(): void;
  seek(seconds: number): void;
  time(): Promise<number>;
  playing(): boolean;
  duration?(): Promise<number>;
  volume?(value: number): void;
  destroy(): void;
};

function loadScript(src: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-katsodi-sdk="${src}"]`,
  );
  return new Promise((resolve, reject) => {
    const script = existing || document.createElement("script");
    const done = () => (ready() ? resolve() : reject(new Error("sdk")));
    script.addEventListener("load", done, { once: true });
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error("sdk"));
      },
      {
        once: true,
      },
    );
    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.katsodiSdk = src;
      document.head.appendChild(script);
    }
  });
}

type Emit = (event: AdapterEvent) => void;

async function youtube(frame: HTMLIFrameElement, emit: Emit) {
  const YT = await loadYouTubeApi();
  let state: number = YT_STATE.UNSTARTED;
  const player = await new Promise<{
    playVideo(): void;
    pauseVideo(): void;
    seekTo(s: number, a: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    setVolume(value: number): void;
    getPlayerState(): number;
    destroy(): void;
  }>((resolve) => {
    const instance = new YT.Player(frame, {
      events: {
        onReady: () => resolve(instance),
        onError: () => emit("error"),
        onStateChange: ({ data }) => {
          state = data;
          if (data === YT_STATE.PLAYING) emit("play");
          else if (data === YT_STATE.PAUSED) emit("pause");
          else if (data === YT_STATE.ENDED) emit("ended");
        },
      },
    });
  });
  return {
    async play() {
      player.playVideo();
      await new Promise((r) => setTimeout(r, 1500));
      return [YT_STATE.PLAYING, YT_STATE.BUFFERING].includes(
        player.getPlayerState() as 1 | 3,
      );
    },
    pause: () => player.pauseVideo(),
    seek: (s) => player.seekTo(s, true),
    time: async () => player.getCurrentTime() || 0,
    duration: async () => player.getDuration() || 0,
    volume: (value: number) =>
      player.setVolume(Math.max(0, Math.min(100, value))),
    playing: () => state === YT_STATE.PLAYING,
    destroy: () => player.destroy(),
  } satisfies PlayerAdapter;
}

type VimeoPlayer = {
  ready(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  setCurrentTime(s: number): Promise<number>;
  getCurrentTime(): Promise<number>;
  on(event: string, handler: () => void): void;
  destroy(): Promise<void>;
};
async function vimeo(frame: HTMLIFrameElement, emit: Emit) {
  const w = window as unknown as {
    Vimeo?: { Player: new (el: HTMLIFrameElement) => VimeoPlayer };
  };
  await loadScript("https://player.vimeo.com/api/player.js", () => !!w.Vimeo);
  const player = new w.Vimeo!.Player(frame);
  await player.ready();
  let playing = false;
  player.on("play", () => {
    playing = true;
    emit("play");
  });
  player.on("pause", () => {
    playing = false;
    emit("pause");
  });
  player.on("ended", () => {
    playing = false;
    emit("ended");
  });
  player.on("seeked", () => emit("seek"));
  return {
    async play() {
      try {
        await player.play();
        return true;
      } catch {
        return false; // NotAllowedError: autoplay refused by the browser.
      }
    },
    pause: () => void player.pause().catch(() => {}),
    seek: (s) => void player.setCurrentTime(s).catch(() => {}),
    time: () => player.getCurrentTime().catch(() => 0),
    playing: () => playing,
    destroy: () => void player.destroy().catch(() => {}),
  } satisfies PlayerAdapter;
}

type SoundCloudWidget = {
  bind(event: string, handler: () => void): void;
  unbind(event: string): void;
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
  getPosition(callback: (ms: number) => void): void;
  getDuration(callback: (ms: number) => void): void;
  setVolume(value: number): void;
};
async function soundcloud(frame: HTMLIFrameElement, emit: Emit) {
  const w = window as unknown as {
    SC?: {
      Widget: ((el: HTMLIFrameElement) => SoundCloudWidget) & {
        Events: Record<"READY" | "PLAY" | "PAUSE" | "FINISH" | "SEEK", string>;
      };
    };
  };
  await loadScript("https://w.soundcloud.com/player/api.js", () => !!w.SC);
  const SC = w.SC!;
  const widget = SC.Widget(frame);
  // READY can fire before this binding if the widget loaded first; the
  // widget accepts commands anyway, so stop waiting after 5 seconds.
  await Promise.race([
    new Promise<void>((resolve) =>
      widget.bind(SC.Widget.Events.READY, () => resolve()),
    ),
    new Promise<void>((resolve) => setTimeout(resolve, 5000)),
  ]);
  let playing = false;
  widget.bind(SC.Widget.Events.PLAY, () => {
    playing = true;
    emit("play");
  });
  widget.bind(SC.Widget.Events.PAUSE, () => {
    playing = false;
    emit("pause");
  });
  widget.bind(SC.Widget.Events.FINISH, () => {
    playing = false;
    emit("ended");
  });
  widget.bind(SC.Widget.Events.SEEK, () => emit("seek"));
  return {
    async play() {
      widget.play();
      await new Promise((r) => setTimeout(r, 1500));
      return playing;
    },
    pause: () => widget.pause(),
    seek: (s) => widget.seekTo(Math.round(s * 1000)),
    time: () =>
      new Promise<number>((resolve) =>
        widget.getPosition((ms) => resolve((ms || 0) / 1000)),
      ),
    duration: () =>
      new Promise<number>((resolve) =>
        widget.getDuration((ms) => resolve((ms || 0) / 1000)),
      ),
    volume: (value: number) =>
      widget.setVolume(Math.max(0, Math.min(100, value))),
    playing: () => playing,
    destroy: () => {
      for (const event of Object.values(SC.Widget.Events)) widget.unbind(event);
    },
  } satisfies PlayerAdapter;
}

export function createAdapter(
  kind: SyncKind,
  frame: HTMLIFrameElement,
  emit: Emit,
): Promise<PlayerAdapter> {
  return kind === "youtube"
    ? youtube(frame, emit)
    : kind === "vimeo"
      ? vimeo(frame, emit)
      : soundcloud(frame, emit);
}

/** The adapter for an embed URL, by its exact official player host. */
export function adapterKind(src: string): SyncKind | null {
  try {
    const { hostname, protocol } = new URL(src);
    if (protocol !== "https:") return null;
    if (["www.youtube.com", "www.youtube-nocookie.com"].includes(hostname))
      return "youtube";
    if (hostname === "player.vimeo.com") return "vimeo";
    if (hostname === "w.soundcloud.com") return "soundcloud";
  } catch {
    /* Not a URL. */
  }
  return null;
}
