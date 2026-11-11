"use client";
import { RoomVinyl } from "./room-vinyl";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Film, Headphones } from "lucide-react";
import type { Room } from "@/lib/rooms";
import { assets, fandomAssets, type AssetId } from "@/data/editorial";
import palettes from "@/data/room-palettes.json";
import type { CSSProperties } from "react";
import { EditorialImage } from "./editorial-image";
import { useWorkspace } from "./workspace-provider";
const roomArt: Record<Room["art"], AssetId> = {
  orbit: "space",
  wave: "vinyl",
  moon: "coast",
  sun: "concert",
};
export function roomPaletteStyle(fandomId?: string | null): CSSProperties {
  const colors = (palettes as Record<string, string[]>)[fandomId || ""] || [
    "#755eac",
    "#397d84",
    "#a76853",
  ];
  return {
    "--room-hue-a": colors[0],
    "--room-hue-b": colors[1],
    "--room-hue-c": colors[2],
  } as CSSProperties;
}
export function Cover({
  art,
  large = false,
  fandomId,
}: {
  art: Room["art"];
  large?: boolean;
  fandomId?: string | null;
}) {
  return (
    <div
      className={`cover ${large ? "cover-large" : ""} ${fandomId ? "cover-fandom-palette" : ""}`}
      style={roomPaletteStyle(fandomId)}
    >
      <EditorialImage
        asset={(fandomId && fandomAssets[fandomId]) || assets[roomArt[art]]}
        sizes={
          large
            ? "(max-width: 900px) 100vw, 65vw"
            : "(max-width: 600px) 90vw, 30vw"
        }
      />
      <RoomVinyl fandomId={fandomId} />
    </div>
  );
}
export function RoomCard({ room }: { room: Room }) {
  const { t, state, toggleSaved, ready, setActiveCompanion } = useWorkspace();
  const saved = state.saved.includes(room.id);

  function activateCompanion() {
    setActiveCompanion({
      id: room.id,
      title: room.name,
      artist: t.local,
      art: assets[roomArt[room.art]].src,
      glow: room.format === "music" ? "#407065" : "#633b21",
      sourceUrl: room.url,
      fandomId: room.fandomId,
    });
  }

  return (
    <article
      className="room-card palette-room-card"
      style={roomPaletteStyle(room.fandomId)}
    >
      <div className="card-image">
        <Link
          href={`/room/${room.id}`}
          onClick={activateCompanion}
          aria-label={`${t.enter}: ${room.name}`}
        >
          <Cover art={room.art} fandomId={room.fandomId} />
        </Link>
        <span className="cover-tag">{t.local}</span>
        <button
          disabled={!ready}
          className={`bookmark ${saved ? "is-saved" : ""}`}
          onClick={() => toggleSaved(room.id)}
          aria-label={`${saved ? t.unsave : t.save}: ${room.name}`}
          aria-pressed={saved}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="format-tag">
          {room.format === "video" ? (
            <Film size={13} />
          ) : (
            <Headphones size={13} />
          )}{" "}
          {t[room.format]}
        </span>
      </div>
      <div className="card-heading">
        <h3>
          <Link href={`/room/${room.id}`}>{room.name}</Link>
        </h3>
      </div>
      <p>{room.description || t.companion}</p>
      <div className="card-meta">
        <span>{t.noConnection}</span>
        <Link
          href={`/room/${room.id}`}
          aria-label={`${t.exploreRoom}: ${room.name}`}
        >
          {t.exploreRoom}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  );
}
