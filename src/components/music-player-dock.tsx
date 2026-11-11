"use client";
/* eslint-disable @next/next/no-img-element -- Verified provider artwork with fixed dimensions. */
import { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { createAdapter, type PlayerAdapter } from "@/lib/player-adapters";
import { spotifyPlayer } from "@/lib/spotify-player";
import { musicRoomSource } from "@/lib/music-discovery";
import { clockTime, playbackProvider } from "@/lib/music-queue";
import { ExternalMedia } from "./external-media";
import { useLocale } from "./workspace-provider";
import type { MusicSession } from "./music-player-provider";

export function MusicPlayerDock({
  session,
  move,
  close,
}: {
  session: MusicSession;
  move: (direction: number) => void;
  close: () => void;
}) {
  const { t } = useLocale();
  const m = t.musicPlayer;
  const track = session.tracks[session.index];
  const [expanded, setExpanded] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = panel.current!;
    const update = () =>
      document.documentElement.style.setProperty(
        "--music-player-height",
        `${element.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--music-player-height");
    };
  }, []);
  return (
    <aside
      className={`music-dock ${expanded ? "music-dock-expanded" : ""}`}
      ref={panel}
      aria-label={m.player}
    >
      {track.cover && (
        <img className="music-dock-backdrop" src={track.cover} alt="" />
      )}
      <button
        className="icon-button music-expand"
        aria-label={expanded ? m.collapse : m.expand}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
      <div className="music-dock-track">
        {track.cover ? (
          <img src={track.cover} alt="" width={56} height={56} />
        ) : (
          <Music2 />
        )}
        <div>
          <small>
            {session.collection} · {session.index + 1}/{session.tracks.length}
          </small>
          <strong>{track.title}</strong>
          <span>{track.artists.join(", ")}</span>
        </div>
        <button
          className="icon-button music-dock-close"
          aria-label={m.close}
          onClick={close}
        >
          <X size={18} />
        </button>
      </div>
      <ExternalMedia provider={playbackProvider(track.url)}>
        <MusicTransport session={session} move={move} />
      </ExternalMedia>
    </aside>
  );
}

function MusicTransport({
  session,
  move,
}: {
  session: MusicSession;
  move: (direction: number) => void;
}) {
  const { t } = useLocale();
  const m = t.musicPlayer;
  const track = session.tracks[session.index],
    provider = playbackProvider(track.url);
  const host = useRef<HTMLDivElement>(null),
    adapter = useRef<PlayerAdapter | null>(null);
  const [ready, setReady] = useState(false),
    [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0),
    [duration, setDuration] = useState(track.duration || 0);
  const [volume, setVolume] = useState(() => {
      try {
        const stored = Number(
          localStorage.getItem("katsodi.music.volume") ?? 70,
        );
        return Number.isFinite(stored)
          ? Math.max(0, Math.min(100, stored))
          : 70;
      } catch {
        return 70;
      }
    }),
    [status, setStatus] = useState<
      "loading" | "ready" | "blocked" | "error" | "ended"
    >("loading");
  const [retry, setRetry] = useState(0);
  const events = useRef({ move, session });
  useEffect(() => {
    events.current = { move, session };
  }, [move, session]);
  const volumeValue = useRef(volume);
  useEffect(() => {
    volumeValue.current = volume;
  }, [volume]);
  useEffect(() => {
    const container = host.current!;
    const iframe = document.createElement("iframe");
    iframe.title = `${m.officialPlayer}: ${track.title}`;
    iframe.allow = "autoplay; encrypted-media; fullscreen";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    const canonical = musicRoomSource(track.url)!;
    iframe.src =
      provider === "soundcloud"
        ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(canonical)}&auto_play=false&visual=false&show_artwork=false`
        : `https://www.youtube.com/embed/${new URL(canonical).searchParams.get("v")}?enablejsapi=1&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`;
    if (provider !== "spotify") container.appendChild(iframe);
    let disposed = false,
      ended = false,
      busy = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      if (!disposed && !adapter.current) setStatus("error");
    }, 15000);
    const emit = (event: "play" | "pause" | "ended" | "seek" | "error") => {
      if (disposed) return;
      if (event === "error") {
        setStatus("error");
        setReady(false);
      }
      if (event === "play") {
        setPlaying(true);
        setStatus("ready");
      }
      if (event === "pause") setPlaying(false);
      if (event === "ended" && !ended) {
        ended = true;
        setPlaying(false);
        setStatus("ended");
        if (
          events.current.session.index <
          events.current.session.tracks.length - 1
        )
          events.current.move(1);
      }
    };
    const cancellation = new AbortController();
    const connection =
      provider === "spotify"
        ? spotifyPlayer(container, track.url, emit, cancellation.signal)
        : createAdapter(provider, iframe, emit);
    connection
      .then(async (player) => {
        clearTimeout(timeout);
        if (disposed) {
          player.destroy();
          return;
        }
        adapter.current = player;
        setReady(true);
        setStatus("ready");
        player.volume?.(volumeValue.current);
        const confirmed = await player.play();
        if (disposed) return;
        setPlaying(confirmed);
        if (!confirmed) setStatus("blocked");
        timer = setInterval(async () => {
          if (busy || disposed) return;
          busy = true;
          try {
            const [time, length] = await Promise.all([
              player.time(),
              player.duration?.() || Promise.resolve(track.duration || 0),
            ]);
            if (!disposed) {
              setPosition(time);
              if (length > 0) setDuration(length);
              setPlaying(player.playing());
            }
          } catch {
            if (!disposed) {
              setStatus("error");
              setReady(false);
            }
          } finally {
            busy = false;
          }
        }, 500);
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });
    return () => {
      disposed = true;
      cancellation.abort();
      clearTimeout(timeout);
      clearInterval(timer);
      // SDKs own this container’s children; React owns only the container.
      try {
        adapter.current?.pause();
      } catch {}
      try {
        adapter.current?.destroy();
      } catch {}
      container.replaceChildren();
      adapter.current = null;
    };
  }, [
    provider,
    track.url,
    track.title,
    track.duration,
    retry,
    m.officialPlayer,
  ]);
  async function toggle() {
    const player = adapter.current;
    if (!player) return;
    if (player.playing()) {
      player.pause();
      setPlaying(false);
    } else {
      const ok = await player.play();
      setPlaying(ok);
      setStatus(ok ? "ready" : "blocked");
    }
  }
  return (
    <div className="music-transport">
      <div className="music-custom-controls">
        <div className="music-transport-buttons">
          <button
            className="icon-button"
            disabled={session.index === 0}
            aria-label={m.previous}
            onClick={() => move(-1)}
          >
            <SkipBack size={21} />
          </button>
          <button
            className="music-play-toggle"
            disabled={!ready}
            aria-label={playing ? m.pause : m.play}
            onClick={() => void toggle()}
          >
            {playing ? <Pause size={25} /> : <Play size={25} />}
          </button>
          <button
            className="icon-button"
            disabled={session.index === session.tracks.length - 1}
            aria-label={m.next}
            onClick={() => move(1)}
          >
            <SkipForward size={21} />
          </button>
        </div>
        <label className="music-progress">
          <span>{clockTime(position)}</span>
          <input
            type="range"
            aria-label={m.seek}
            aria-valuetext={`${clockTime(position)} / ${clockTime(duration)}`}
            min={0}
            max={Math.max(1, duration)}
            step={1}
            value={Math.min(position, duration || 1)}
            disabled={!ready || !duration || provider === "spotify"}
            onChange={(event) => {
              const time = Number(event.target.value);
              adapter.current?.seek(time);
              setPosition(time);
            }}
          />
          <span>{clockTime(duration)}</span>
        </label>
        <label className="music-volume">
          <Volume2 size={17} />
          <input
            type="range"
            aria-label={m.volume}
            min={0}
            max={100}
            value={volume}
            disabled={!ready || provider === "spotify"}
            onChange={(event) => {
              const value = Number(event.target.value);
              setVolume(value);
              try {
                localStorage.setItem("katsodi.music.volume", String(value));
              } catch {
                /* In-memory controls still work. */
              }
              adapter.current?.volume?.(value);
            }}
          />
        </label>
        <p
          className="music-playback-status"
          role="status"
          hidden={provider !== "spotify" && status === "ready"}
        >
          {provider === "spotify" && status === "ready"
            ? m.spotifyLimited
            : status === "loading"
              ? m.loading
              : status === "error"
                ? m.error
                : status === "blocked"
                  ? m.blocked
                  : status === "ended"
                    ? m.finished
                    : m.official}
        </p>
        {status === "error" && (
          <button
            className="text-link"
            onClick={() => {
              setReady(false);
              setStatus("loading");
              setRetry((value) => value + 1);
            }}
          >
            {t.retry}
          </button>
        )}
      </div>
      <div className={`music-provider-player music-provider-${provider}`}>
        <div ref={host} className="music-widget-host" key={retry} />
        <a href={track.url} target="_blank" rel="noopener noreferrer">
          {provider === "soundcloud"
            ? "SoundCloud"
            : provider === "youtube"
              ? "YouTube"
              : "Spotify"}
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
