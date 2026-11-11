"use client";
import { ArrowUpRight, AudioLines, Film, Link2, Play } from "lucide-react";
import { Cover } from "./room-card";
import { useWorkspace } from "./workspace-provider";
import { inspectSource } from "@/lib/providers";
import { RoomPlayer, type PlayerSync } from "./room-player";
export function RoomStage({
  art,
  format,
  url,
  roomId,
  enabled = true,
  sync,
  fandomId,
}: {
  art: "orbit" | "wave" | "moon" | "sun";
  format: "video" | "music";
  url: string;
  roomId?: string;
  enabled?: boolean;
  sync?: PlayerSync;
  fandomId?: string | null;
}) {
  const { t } = useWorkspace();
  const n = t.network;
  const source = inspectSource(url);
  if (source && enabled)
    return (
      <RoomPlayer
        key={source.url}
        url={source.url}
        roomId={roomId}
        sync={sync}
      />
    );
  return (
    <section className="room-stage cinema-stage">
      <Cover art={art} fandomId={fandomId} large />
      <div className="cinema-stage-top">
        <span>
          <span className="status-dot" />
          {n.roomSpace}
        </span>
        <span>
          {format === "music" ? <AudioLines size={15} /> : <Film size={15} />}
          {t[format]}
        </span>
      </div>
      <div className="stage-content cinema-content">
        <div className="cinema-symbol" aria-hidden="true">
          {format === "music" ? (
            <AudioLines size={36} strokeWidth={1.4} />
          ) : (
            <Play size={34} strokeWidth={1.4} />
          )}
        </div>
        <p className="cinema-eyebrow">{n.settleIn}</p>
        <h2>{format === "music" ? t.roomStudio.musicTitle : n.stageTitle}</h2>
        <p>
          {format === "music"
            ? roomId
              ? t.roomStudio.queueTip
              : t.roomStudio.localMusicTip
            : n.stageHint}
        </p>
        {source ? (
          <a
            className="button cinema-source"
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {n.source}
            <ArrowUpRight size={17} />
          </a>
        ) : (
          <span className="cinema-no-source">
            <Link2 size={16} />
            {t.noSource}
          </span>
        )}
      </div>
      <div className="cinema-stage-footer">
        <span>{n.sourceSeparate}</span>
        <span>{source?.provider.name || "KATSODI"}</span>
      </div>
    </section>
  );
}
