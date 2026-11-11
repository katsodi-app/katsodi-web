"use client";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { updatePlayback } from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import {
  DRIFT_TOLERANCE,
  drifted,
  expectedPosition,
  type PlaybackState,
} from "@/lib/playback";
import {
  createAdapter,
  type AdapterEvent,
  type PlayerAdapter,
  type SyncKind,
} from "@/lib/player-adapters";
import { useWorkspace } from "./workspace-provider";

/** Programmatic changes are ignored as user actions for this long. */
const SUPPRESS_MS = 1200;

/**
 * An official provider player (YouTube, Vimeo or SoundCloud) bound to the
 * room's server-side timeline.
 * - Hosts (owner/moderators) use the provider's own controls; their play,
 *   pause, end and seeks are published to the room.
 * - Members follow: the player is re-synced on every new state and whenever
 *   it drifts more than DRIFT_TOLERANCE seconds from the shared position.
 * Autoplay that the browser blocks becomes an explicit "join" button rather
 * than a silent stall. Nothing here sends audio or video anywhere.
 */
export function SyncedPlayer({
  kind,
  src,
  roomId,
  roomUrl,
  playback,
  receivedAt,
  canControl,
  onEnded,
}: {
  kind: SyncKind;
  /** The embed URL (for YouTube, built here with the API enabled). */
  src: string;
  roomId: string;
  /** The room's stored source, exactly as the server compares it. */
  roomUrl: string;
  playback: PlaybackState | null;
  /** performance.now() when `playback` arrived from the server. */
  receivedAt: number;
  canControl: boolean;
  /** Called on the host when the media ends (queue auto-advance). */
  onEnded?: () => void;
}) {
  const { t } = useWorkspace();
  const p = t.player;
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<PlayerAdapter | null>(null);
  // YouTube needs this page's origin for its API channel, known only in the
  // browser; other providers use the validated embed URL as-is.
  const [frameSrc, setFrameSrc] = useState(kind === "youtube" ? "" : src);
  useEffect(() => {
    if (kind !== "youtube") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keep in sync with a new source.
      setFrameSrc(src);
      return;
    }
    const url = new URL(src);
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", window.location.origin);
    url.searchParams.set("controls", canControl ? "1" : "0");
    url.searchParams.set("disablekb", canControl ? "0" : "1");
    setFrameSrc(url.href);
  }, [kind, src, canControl]);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  // Latest props for handlers registered once.
  const latest = useRef({
    playback,
    receivedAt,
    canControl,
    roomId,
    roomUrl,
    onEnded,
  });
  useEffect(() => {
    latest.current = {
      playback,
      receivedAt,
      canControl,
      roomId,
      roomUrl,
      onEnded,
    };
  });
  const suppressUntil = useRef(0);
  // updated_at values this client published itself; not re-applied locally.
  const own = useRef(new Set<string>());
  // Host-side reference point for seek detection.
  const published = useRef({ position: 0, at: 0, playing: false });

  const publish = async (state: "playing" | "paused") => {
    const target = player.current;
    if (!target) return;
    const position = Math.max(0, await target.time());
    published.current = {
      position,
      at: performance.now(),
      playing: state === "playing",
    };
    const form = new FormData();
    form.set("room", latest.current.roomId);
    form.set("source", latest.current.roomUrl);
    form.set("state", state);
    form.set("position", String(position));
    try {
      const result = await updatePlayback(initialResult, form);
      if (result.status === "success" && result.playback)
        own.current.add(result.playback.updated_at);
      // A burst inside the server's rate limit is superseded by the next one.
      setFailed(result.status === "error" && result.code !== "rateLimit");
    } catch {
      setFailed(true);
    }
  };

  /** Moves the local player onto the shared timeline. */
  const follow = async (force: boolean) => {
    const target = player.current;
    const { playback: state, receivedAt: at } = latest.current;
    if (!target || !state) return;
    const current = await target.time();
    const expected = expectedPosition(state, performance.now() - at);
    const playing = target.playing();
    const needsSeek = drifted(current, expected);
    const needsState = (state.state === "playing") !== playing;
    if (!force && !needsSeek && !needsState) return;
    suppressUntil.current = Date.now() + SUPPRESS_MS;
    if (needsSeek) target.seek(expected);
    if (state.state === "playing" && !playing) {
      // Browsers may refuse playback without a gesture on this page.
      const started = await target.play();
      if (!started && latest.current.playback?.state === "playing")
        setBlocked(true);
    } else if (state.state === "paused" && playing) target.pause();
  };

  // Create the provider player once the iframe exists.
  useEffect(() => {
    if (!frameSrc || !frame.current) return;
    let alive = true;
    const onEvent = (event: AdapterEvent) => {
      if (event === "play") setBlocked(false);
      if (!latest.current.canControl || Date.now() < suppressUntil.current)
        return;
      if (event === "play") void publish("playing");
      else if (event === "pause") void publish("paused");
      else if (event === "ended") {
        void publish("paused");
        latest.current.onEnded?.();
      } else if (event === "seek")
        void publish(player.current?.playing() ? "playing" : "paused");
    };
    createAdapter(kind, frame.current, onEvent)
      .then((adapter) => {
        if (!alive) return adapter.destroy();
        player.current = adapter;
        setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      player.current?.destroy();
      player.current = null;
    };
    // publish/follow read refs only; the adapter is created once per iframe.
  }, [kind, frameSrc]);

  // Apply each new server state (another host's action, or the host's own
  // state from a previous visit).
  const version = playback?.updated_at;
  useEffect(() => {
    if (!ready || !version || own.current.has(version)) return;
    void follow(true);
  }, [ready, version]);

  // Members: correct drift. Hosts: detect seeks that raised no event.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(async () => {
      const target = player.current;
      if (!target || Date.now() < suppressUntil.current) return;
      if (!latest.current.canControl) {
        await follow(false);
        return;
      }
      const ref = published.current;
      if (!target.playing() || !ref.playing) return;
      const expected = ref.position + (performance.now() - ref.at) / 1000;
      if (Math.abs((await target.time()) - expected) > DRIFT_TOLERANCE)
        void publish("playing");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ready]);

  return (
    <>
      <div className="room-player-frame synced-player">
        {frameSrc && (
          <iframe
            ref={frame}
            src={frameSrc}
            title={p.frameTitle}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        )}
        {blocked && !canControl && (
          // Covers the paused player so the click is a gesture on this page,
          // which is what the browser's autoplay policy requires.
          <div className="sync-join-layer">
            <button
              type="button"
              className="sync-join"
              onClick={() => {
                setBlocked(false);
                void follow(true);
              }}
            >
              <Play size={18} />
              {p.syncJoin}
            </button>
          </div>
        )}
      </div>
      <p className="sync-status" role="status">
        {canControl
          ? p.syncHost
          : playback
            ? blocked
              ? p.syncBlocked
              : p.syncFollower
            : p.syncWaiting}
      </p>
      {failed && (
        <p className="sync-error" role="alert">
          {p.syncFailed}
        </p>
      )}
    </>
  );
}
