import type { AdapterEvent, PlayerAdapter } from "./player-adapters";

type Controller = {
  play(): void;
  pause(): void;
  destroy(): void;
  addListener(
    name: string,
    callback: (event: {
      data: { position: number; duration: number; isPaused: boolean };
    }) => void,
  ): void;
};
type API = {
  createController(
    element: HTMLElement,
    options: { url: string; width: string; height: number },
    callback: (controller: Controller) => void,
  ): void;
};
let loading: Promise<API> | null = null;
function load(): Promise<API> {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const w = window as unknown as {
      onSpotifyIframeApiReady?: (api: API) => void;
    };
    w.onSpotifyIframeApiReady = resolve;
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("spotify_sdk"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
/** Official embed controls; music seeking/volume are left to Spotify's native UI. */
export async function spotifyPlayer(
  host: HTMLElement,
  url: string,
  emit: (event: AdapterEvent) => void,
  signal?: AbortSignal,
): Promise<PlayerAdapter> {
  const api = await load();
  if (!host.isConnected || signal?.aborted) throw new Error("disposed");
  const mount = document.createElement("div");
  host.appendChild(mount);
  return new Promise((resolve, reject) => {
    api.createController(
      mount,
      { url, width: "100%", height: 152 },
      (controller) => {
        if (!host.isConnected || signal?.aborted) {
          controller.destroy();
          reject(new Error("disposed"));
          return;
        }
        let ready = false,
          destroyed = false;
        const destroy = () => {
          if (destroyed) return;
          destroyed = true;
          ready = false;
          signal?.removeEventListener("abort", cancel);
          controller.destroy();
        };
        const cancel = () => {
          destroy();
          reject(new Error("disposed"));
        };
        signal?.addEventListener("abort", cancel, { once: true });
        let position = 0,
          duration = 0,
          playing = false;
        controller.addListener("playback_update", ({ data }) => {
          if (destroyed) return;
          position = data.position / 1000;
          duration = data.duration / 1000;
          playing = !data.isPaused;
          emit(playing ? "play" : "pause");
        });
        // createController's callback precedes the embed's ready event.
        // No playback command is safe until the latter has fired.
        controller.addListener("ready", () => {
          if (destroyed) return;
          ready = true;
          resolve({
            async play() {
              if (!ready || destroyed || !host.isConnected) return false;
              controller.play();
              await new Promise((r) => setTimeout(r, 1500));
              return !destroyed && playing;
            },
            pause: () => {
              if (ready && !destroyed && host.isConnected && playing)
                controller.pause();
            },
            seek: () => {},
            time: async () => position,
            duration: async () => duration,
            playing: () => playing,
            destroy,
          });
        });
      },
    );
  });
}
