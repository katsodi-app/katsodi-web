"use client";
import { useEffect, useState } from "react";
import { ExternalLink, RotateCw, Film } from "lucide-react";
import {
  knownPlayer,
  readPlayerResolution,
  type PlayerResolution,
} from "@/lib/player";
import { useWorkspace } from "./workspace-provider";
import {
  formatDuration,
  mediaDetailsSchema,
  type MediaDetails,
} from "@/lib/media";
import { SyncedPlayer } from "./synced-player";
import { syncSource, type PlaybackState } from "@/lib/playback";
import { ExternalMedia, hostLabel } from "./external-media";
import { adapterKind } from "@/lib/player-adapters";
/** Shared-timeline inputs from a server room; absent in local drafts. */
export type PlayerSync = {
  /** The room's stored source string, compared exactly by the server. */
  roomUrl: string;
  /** undefined: sync unavailable; null: nobody has started playback yet. */
  playback: PlaybackState | null | undefined;
  receivedAt: number;
  canControl: boolean;
  /** Host only: the synced player reached the end of the media. */
  onEnded?: () => void;
};
export function RoomPlayer({
  url,
  roomId,
  sync,
}: {
  url: string;
  roomId?: string;
  sync?: PlayerSync;
}) {
  const { t } = useWorkspace();
  const p = t.player;
  const [resolution, setResolution] = useState<PlayerResolution>(() =>
    knownPlayer(url),
  );
  const [retry, setRetry] = useState(0);
  // "Now playing" details from the provider's official oEmbed (shared rooms).
  const [details, setDetails] = useState<MediaDetails | null>(null);
  useEffect(() => {
    if (!roomId) return;
    const controller = new AbortController();
    fetch(`/api/rooms/${roomId}/media`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const parsed = mediaDetailsSchema.nullable().safeParse(data?.details);
        setDetails(parsed.success ? parsed.data : null);
      })
      .catch(() => setDetails(null));
    return () => controller.abort();
  }, [url, roomId]);
  useEffect(() => {
    if (knownPlayer(url).kind !== "discover" || !roomId) return;
    const controller = new AbortController();
    let active = true;
    fetch(`/api/rooms/${roomId}/player`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw Error("unavailable");
        const data = readPlayerResolution(await response.json());
        if (!data) throw Error("invalid_player");
        if (active) setResolution(data);
      })
      .catch(() => {
        if (active)
          setResolution({
            kind: "external",
            reason: "unavailable",
            sync: false,
          });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, roomId, retry]);
  // Sync only when the room's source and the resolved official player agree
  // on the same provider (YouTube, Vimeo or SoundCloud).
  const kind =
    resolution.kind === "iframe" ? adapterKind(resolution.src) : null;
  const synced =
    !!sync &&
    !!roomId &&
    !!kind &&
    resolution.kind === "iframe" &&
    sync.playback !== undefined &&
    syncSource(sync.roomUrl) === kind;
  return (
    <section className="room-player" aria-label={p.title}>
      <header>
        <span>
          <Film size={17} />
          {p.title}
        </span>
        <span className="pill">
          {resolution.kind === "iframe" &&
          resolution.presentation === "source-page"
            ? p.originalPage
            : resolution.kind === "iframe" || resolution.kind === "video"
              ? p.embedded
              : resolution.kind === "discover"
                ? p.discovery
                : p.notAvailable}
        </span>
      </header>
      {details && (
        <div className="now-playing" aria-label={p.nowPlaying}>
          {details.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element -- remote provider cover, not optimized by Next.
            <img
              src={details.thumbnail}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          )}
          <div>
            <strong title={details.title}>{details.title}</strong>
            <span>
              {[
                details.author,
                details.provider,
                details.duration !== null
                  ? formatDuration(details.duration)
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
      )}
      {synced ? (
        <ExternalMedia provider={hostLabel(resolution.src)}>
          <SyncedPlayer
            key={`${resolution.src}:${sync.canControl}`}
            kind={kind}
            src={resolution.src}
            roomId={roomId}
            roomUrl={sync.roomUrl}
            playback={sync.playback ?? null}
            receivedAt={sync.receivedAt}
            canControl={sync.canControl}
            onEnded={sync.onEnded}
          />
        </ExternalMedia>
      ) : resolution.kind === "iframe" ? (
        <ExternalMedia provider={hostLabel(resolution.src)}>
          <div className="room-player-frame">
            <iframe
              key={`${resolution.src}:${retry}`}
              src={resolution.src}
              title={p.frameTitle}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onError={() =>
                setResolution({
                  kind: "external",
                  reason: "unavailable",
                  sync: false,
                })
              }
            />
          </div>
        </ExternalMedia>
      ) : resolution.kind === "video" ? (
        <div className="room-player-frame">
          <video
            key={retry}
            controls
            playsInline
            preload="metadata"
            src={resolution.src}
            aria-label={p.frameTitle}
            onError={() =>
              setResolution({
                kind: "external",
                reason: "unavailable",
                sync: false,
              })
            }
          />
        </div>
      ) : (
        <div className="player-state" role="status">
          <Film size={38} />
          <h2>
            {resolution.kind === "discover" && roomId
              ? p.finding
              : p.notAvailable}
          </h2>
          <p>
            {resolution.kind === "discover"
              ? roomId
                ? p.findingHint
                : p.sharedOnly
              : p[resolution.reason]}
          </p>
        </div>
      )}
      <footer>
        {resolution.kind === "iframe" &&
          resolution.presentation === "source-page" && (
            <p>{p.sourcePageHint}</p>
          )}
        {!synced && <p>{p.independent}</p>}
        <div>
          <a
            className="text-link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {p.openSource}
            <ExternalLink size={15} />
          </a>
          {roomId && (
            <button
              className="text-link"
              onClick={() => {
                setResolution(knownPlayer(url));
                setRetry((value) => value + 1);
              }}
            >
              <RotateCw size={15} />
              {p.retry}
            </button>
          )}
        </div>
        <small>{p.providerNotice}</small>
      </footer>
    </section>
  );
}
