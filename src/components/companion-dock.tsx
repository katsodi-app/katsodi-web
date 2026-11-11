"use client";
import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  AudioLines,
  Bookmark,
  Maximize2,
  Music,
  Play,
  X,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { ModalSurface } from "./modal-surface";
import { RoomVinyl } from "./room-vinyl";
import { inspectSource } from "@/lib/providers";

export function CompanionDock() {
  const {
    t,
    activeCompanion,
    setActiveCompanion,
    companionExpanded,
    setCompanionExpanded,
    state,
    toggleSaved,
    currentRoom,
    setCurrentRoom,
  } = useWorkspace();
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const expand = (event: MouseEvent<HTMLButtonElement>) => {
    trigger.current = event.currentTarget;
    setCompanionExpanded(true);
  };
  // The room the user is in takes the dock on every page.
  if (
    currentRoom &&
    (!activeCompanion || currentRoom.id !== activeCompanion.id)
  ) {
    const here = pathname === `/room/${currentRoom.id}`;
    return (
      <aside
        className="companion-dock room-dock"
        aria-label={t.roomDock}
        data-room={currentRoom.kind}
      >
        <div className="dock-track-info">
          <span className="dock-thumb">
            <RoomVinyl fandomId={currentRoom.fandomId} />
          </span>
          <span className="dock-meta">
            <span className="dock-title">{currentRoom.title}</span>
            <span className="dock-artist">
              {currentRoom.kind === "shared" ? t.roomDockShared : t.local}
            </span>
          </span>
        </div>
        <span className="dock-status dock-live">
          <AudioLines size={15} aria-hidden="true" />
          {here ? t.roomDockHere : t.roomDockElsewhere}
        </span>
        <div className="dock-actions">
          {!here && (
            <Link
              className="dock-btn dock-return"
              href={`/room/${currentRoom.id}`}
              aria-label={`${t.roomDockReturn}: ${currentRoom.title}`}
            >
              <ArrowUpRight size={18} />
              <span>{t.roomDockReturn}</span>
            </Link>
          )}
          <button
            className="dock-btn"
            aria-label={t.roomDockHide}
            onClick={() => {
              setCurrentRoom(null);
              setActiveCompanion(null);
            }}
          >
            <X size={18} />
          </button>
        </div>
      </aside>
    );
  }
  if (!activeCompanion) return null;
  const source = activeCompanion.sourceUrl
    ? inspectSource(activeCompanion.sourceUrl)
    : null;
  const saved = state.saved.includes(activeCompanion.id);
  const bookmark = (
    <button
      className={`dock-btn ${saved ? "active" : ""}`}
      onClick={() => toggleSaved(activeCompanion.id)}
      aria-label={`${saved ? t.unsave : t.save}: ${activeCompanion.title}`}
      aria-pressed={saved}
    >
      <Bookmark size={18} />
    </button>
  );
  return (
    <>
      <aside
        className={`companion-dock ${companionExpanded ? "dock-hidden" : ""}`}
        aria-label={t.nowPlaying}
        inert={companionExpanded}
      >
        <button
          className="dock-track-info dock-track-button"
          onClick={expand}
          aria-label={`${t.openPlayer}: ${activeCompanion.title}`}
        >
          <span className="dock-thumb">
            <RoomVinyl fandomId={activeCompanion.fandomId} />
          </span>
          <span className="dock-meta">
            <span className="dock-title">{activeCompanion.title}</span>
            <span className="dock-artist">{t.companion}</span>
          </span>
        </button>
        <span className="dock-status">{t.noConnection}</span>
        <div className="dock-actions">
          {bookmark}
          <button
            className="dock-btn"
            onClick={expand}
            aria-label={t.openPlayer}
          >
            <Maximize2 size={18} />
          </button>
          <button
            className="dock-btn"
            aria-label={t.closeCompanion}
            onClick={() => setActiveCompanion(null)}
          >
            <X size={18} />
          </button>
        </div>
      </aside>
      {companionExpanded && (
        <ModalSurface
          returnFocus={trigger}
          label={t.openPlayer}
          className="companion-modal-backdrop"
          onClose={() => setCompanionExpanded(false)}
        >
          <div className="companion-modal-content">
            <button
              className="modal-close-btn"
              onClick={() => setCompanionExpanded(false)}
              aria-label={t.closePlayer}
            >
              <X size={20} />
            </button>
            <div className="modal-left-column">
              <div className="modal-art-wrapper">
                <RoomVinyl fandomId={activeCompanion.fandomId} />
              </div>
              <div className="modal-track-header">
                <div>
                  <h2 className="modal-title">{activeCompanion.title}</h2>
                  <p className="modal-artist">{activeCompanion.artist}</p>
                </div>
                {bookmark}
              </div>
              <p className="notice">
                <Music size={18} />
                {t.noConnection}
              </p>
            </div>
            <div className="modal-right-column">
              <p className="eyebrow">{t.companion}</p>
              <h2>{t.companionDetails}</h2>
              <p>{t.playbackUnavailable}</p>
              <button
                className="button button-secondary"
                disabled
                title={t.playbackUnavailable}
              >
                <Play size={18} />
                {t.play}
              </button>
              {source && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-primary"
                >
                  {t.external}
                  <ArrowUpRight size={18} />
                </a>
              )}
              <Link
                href={`/room/${activeCompanion.id}`}
                className="text-link"
                onClick={() => setCompanionExpanded(false)}
              >
                {t.exploreRoom}
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </ModalSurface>
      )}
    </>
  );
}
