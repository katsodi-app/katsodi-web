/**
 * Minimal typing and loader for the official YouTube IFrame Player API:
 * https://developers.google.com/youtube/iframe_api_reference
 * The script is loaded once, only in rooms whose source can be synchronized.
 */
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(value: number): void;
  getPlayerState(): number;
  destroy(): void;
};
type PlayerOptions = {
  events: {
    onError?: (event: { data: number; target: YouTubePlayer }) => void;
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
  };
};
export type YouTubeNamespace = {
  Player: new (
    element: HTMLIFrameElement,
    options: PlayerOptions,
  ) => YouTubePlayer;
};
declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_URL = "https://www.youtube.com/iframe_api";
let loading: Promise<YouTubeNamespace> | null = null;

export function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("youtube_api_unavailable"));
    };
    const script = document.createElement("script");
    script.src = API_URL;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("youtube_api_unavailable"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
