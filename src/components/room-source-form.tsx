"use client";
import { useActionState, useRef, useState } from "react";
import { isMusicOrPlaylist } from "@/lib/music-links";
import { updateRoomSource } from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import { ActionStatus } from "./account-forms";
import { MusicSuggestion } from "./music-suggestion";
import { useWorkspace } from "./workspace-provider";
export function RoomSourceForm({
  id,
  url,
  available,
  music = false,
}: {
  id: string;
  url: string;
  available: boolean;
  /** Music rooms skip the "create a music room" suggestion. */
  music?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [suggest, setSuggest] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const { t } = useWorkspace();
  const p = t.player;
  const [result, submit, pending] = useActionState(
    updateRoomSource,
    initialResult,
  );
  return (
    <form
      ref={form}
      action={submit}
      className="form-card room-source-form"
      onSubmit={(event) => {
        const next = String(new FormData(event.currentTarget).get("url") || "");
        if (!music && !confirmed && isMusicOrPlaylist(next)) {
          event.preventDefault();
          setSuggest(next);
          return;
        }
        setConfirmed(false);
        setSuggest("");
      }}
    >
      <input type="hidden" name="room" value={id} />
      <label htmlFor="shared-source">
        {music ? t.roomStudio.musicSource : p.changeSource}
      </label>
      <div>
        <input
          key={url}
          id="shared-source"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          defaultValue={url}
          maxLength={2048}
          placeholder="https://…"
          disabled={!available || pending}
        />
        <button
          className="button button-primary"
          disabled={!available || pending}
        >
          {pending ? t.network.pending : p.apply}
        </button>
      </div>
      {suggest && (
        <MusicSuggestion
          url={suggest}
          onAddHere={() => {
            setConfirmed(true);
            setSuggest("");
            queueMicrotask(() => form.current?.requestSubmit());
          }}
        />
      )}
      <p className="form-hint">{available ? p.changeHint : p.migration}</p>
      <ActionStatus result={result} />
    </form>
  );
}
