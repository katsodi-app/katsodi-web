"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  Download,
  ListMusic,
  Play,
  Plus,
  Shuffle,
  SkipForward,
  X,
} from "lucide-react";
import {
  addToQueue,
  importToQueue,
  mixQueue,
  playFromQueue,
  removeFromQueue,
} from "@/lib/server/room-actions";
import { isMusicOrPlaylist } from "@/lib/music-links";
import { initialResult } from "@/lib/server/contracts";
import type { QueueItem } from "@/lib/server/network-data";
import { inspectSource } from "@/lib/providers";
import { ActionStatus } from "./account-forms";
import { MusicSuggestion } from "./music-suggestion";
import { useWorkspace } from "./workspace-provider";

/** "youtube.com/watch?v=…" style label for a queued link. */
function shortLink(url: string) {
  try {
    const parsed = new URL(url);
    const rest = `${parsed.pathname}${parsed.search}`.replace(/\/$/, "");
    return `${parsed.hostname.replace(/^www\./, "")}${rest.length > 40 ? `${rest.slice(0, 40)}…` : rest}`;
  } catch {
    return url;
  }
}

function QueueRow({
  item,
  roomId,
  canHost,
  canRemove,
  onChanged,
}: {
  item: QueueItem;
  roomId: string;
  canHost: boolean;
  canRemove: boolean;
  onChanged: () => void;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const [played, play, playing] = useActionState(playFromQueue, initialResult);
  const [removed, remove, removing] = useActionState(
    removeFromQueue,
    initialResult,
  );
  useEffect(() => {
    if (played.status === "success" || removed.status === "success")
      onChanged();
  }, [played, removed, onChanged]);
  const source = inspectSource(item.url);
  return (
    <li className="queue-row">
      <span className="queue-icon" aria-hidden="true">
        <ListMusic size={16} />
      </span>
      <span className="queue-text">
        <strong>{source?.provider.name || n.member}</strong>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {shortLink(item.url)}
        </a>
      </span>
      {canHost && (
        <form action={play}>
          <input type="hidden" name="room" value={roomId} />
          <input type="hidden" name="item" value={item.id} />
          <button
            className="queue-action"
            disabled={playing}
            aria-label={n.queuePlay}
            title={n.queuePlay}
          >
            <Play size={15} />
          </button>
        </form>
      )}
      {canRemove && (
        <form action={remove}>
          <input type="hidden" name="item" value={item.id} />
          <button
            className="queue-action"
            disabled={removing}
            aria-label={n.queueRemove}
            title={n.queueRemove}
          >
            <X size={15} />
          </button>
        </form>
      )}
      {(played.status === "error" || removed.status === "error") && (
        <ActionStatus result={played.status === "error" ? played : removed} />
      )}
    </li>
  );
}

export function RoomQueue({
  roomId,
  queue,
  canHost,
  userId,
  onChanged,
  format = "video",
}: {
  roomId: string;
  queue: QueueItem[];
  canHost: boolean;
  userId: string | null;
  onChanged: () => void;
  /** Music rooms: any member switches tracks; playlists can be imported. */
  format?: "video" | "music";
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const music = format === "music";
  // In music rooms every member may switch tracks (migration 2200).
  const canSwitch = canHost || music;
  const [added, add, adding] = useActionState(addToQueue, initialResult);
  const [imported, importLink, importing] = useActionState(
    importToQueue,
    initialResult,
  );
  const [mixed, mix, mixing] = useActionState(mixQueue, initialResult);
  // Video rooms: a playlist or music link first suggests a music room.
  const addForm = useRef<HTMLFormElement>(null);
  const [suggest, setSuggest] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (imported.status === "success" || mixed.status === "success")
      onChanged();
  }, [imported, mixed, onChanged]);
  const [next, playNext, starting] = useActionState(
    playFromQueue,
    initialResult,
  );
  useEffect(() => {
    if (added.status === "success" || next.status === "success") onChanged();
  }, [added, next, onChanged]);
  return (
    <div className="room-queue">
      {music && (
        <>
          <form action={importLink} className="queue-add queue-import">
            <input type="hidden" name="room" value={roomId} />
            <label className="sr-only" htmlFor="queue-import-url">
              {n.musicImportLabel}
            </label>
            <input
              id="queue-import-url"
              name="url"
              type="url"
              inputMode="url"
              required
              maxLength={2048}
              placeholder={n.musicImportLabel}
            />
            <button
              className="button button-primary button-small"
              disabled={importing}
              aria-busy={importing}
            >
              <Download size={15} />
              {n.musicImportButton}
            </button>
          </form>
          {imported.status !== "idle" && <ActionStatus result={imported} />}
        </>
      )}
      <form
        ref={addForm}
        action={add}
        className="queue-add"
        onSubmit={(event) => {
          const url = String(
            new FormData(event.currentTarget).get("url") || "",
          );
          if (!music && !confirmed && isMusicOrPlaylist(url)) {
            event.preventDefault();
            setSuggest(url);
            return;
          }
          setConfirmed(false);
          setSuggest("");
        }}
      >
        <input type="hidden" name="room" value={roomId} />
        <label className="sr-only" htmlFor="queue-url">
          {n.queueUrl}
        </label>
        <input
          id="queue-url"
          name="url"
          type="url"
          inputMode="url"
          required
          maxLength={2048}
          placeholder={n.queueUrl}
        />
        <button
          className="button button-primary button-small"
          disabled={adding}
        >
          <Plus size={15} />
          {n.queueAdd}
        </button>
      </form>
      {added.status === "error" && <ActionStatus result={added} />}
      {suggest && (
        <MusicSuggestion
          url={suggest}
          onAddHere={() => {
            setConfirmed(true);
            setSuggest("");
            // Submit again, now confirmed.
            queueMicrotask(() => addForm.current?.requestSubmit());
          }}
        />
      )}
      <div className="queue-head">
        <h2 className="room-panel-title">
          {n.queueTitle} · {queue.length}
        </h2>
        {music && canHost && queue.length > 1 && (
          <form action={mix}>
            <input type="hidden" name="room" value={roomId} />
            <button
              className="button button-secondary button-small"
              disabled={mixing}
              title={n.mixQueueHint}
            >
              <Shuffle size={15} />
              {n.mixQueue}
            </button>
          </form>
        )}
        {canSwitch && queue.length > 0 && (
          <form action={playNext}>
            <input type="hidden" name="room" value={roomId} />
            <button
              className="button button-secondary button-small"
              disabled={starting}
            >
              <SkipForward size={15} />
              {n.queuePlayNext}
            </button>
          </form>
        )}
      </div>
      {next.status === "error" && <ActionStatus result={next} />}
      {mixed.status === "error" && <ActionStatus result={mixed} />}
      {queue.length ? (
        <ol className="queue-list">
          {queue.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              roomId={roomId}
              canHost={canSwitch}
              canRemove={canHost || item.added_by === userId}
              onChanged={onChanged}
            />
          ))}
        </ol>
      ) : (
        <p className="queue-empty">{n.queueEmpty}</p>
      )}
      <p className="queue-hint">
        {music ? n.musicRoomHint : canHost ? n.queueAuto : n.queueMemberHint}
      </p>
    </div>
  );
}
