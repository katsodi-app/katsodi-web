"use client";
import Link from "next/link";
import { useWorkspace } from "./workspace-provider";

/**
 * Shown in video rooms when someone adds a playlist or a music track:
 * suggests a separate music room (shared queue, anyone switches tracks,
 * 10-day lifetime) and still allows adding it here.
 */
export function MusicSuggestion({
  url,
  onAddHere,
}: {
  url: string;
  onAddHere: () => void;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  return (
    <div
      className="queue-suggest"
      role="alertdialog"
      aria-labelledby="music-suggest-title"
      aria-describedby="music-suggest-text"
    >
      <strong id="music-suggest-title">{n.playlistPromptTitle}</strong>
      <p id="music-suggest-text">{n.playlistPromptText}</p>
      <div>
        <Link
          className="button button-primary button-small"
          href={`/network/create?format=music&import=${encodeURIComponent(url)}`}
        >
          {n.createMusicRoom}
        </Link>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={onAddHere}
        >
          {n.addHereAnyway}
        </button>
      </div>
    </div>
  );
}
