"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Music,
  Film,
  Sparkles,
  ArrowUpRight,
  Compass,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { fandoms } from "@/lib/fandoms";
import { assets, fandomAssets } from "@/data/editorial";
import { ModalSurface } from "./modal-surface";
import { RoomVinyl } from "./room-vinyl";
import { matchesSearch, type SearchResult } from "@/lib/search";

type Filter = "all" | "rooms" | "fandoms" | "music";
export function QuickSearch() {
  const { t, state, setSearchOpen, setActiveCompanion } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [attempt, setAttempt] = useState(0);
  const [remote, setRemote] = useState<{
    key: string;
    results: SearchResult[];
    failed: boolean;
  } | null>(null);
  const key = `${filter}:${query.trim()}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&filter=${filter}`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(10000),
            ]),
          },
        );
        if (!response.ok) throw new Error("search");
        const data = await response.json();
        if (!controller.signal.aborted)
          setRemote({ key, results: data.results, failed: data.partial });
      } catch {
        if (!controller.signal.aborted)
          setRemote({ key, results: [], failed: true });
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filter, key]);
  const pending = remote?.key !== key;
  const results = useMemo(() => {
    const local: SearchResult[] = [];
    if (filter === "all" || filter === "rooms")
      for (const room of state.rooms) {
        if (matchesSearch(query, room.name, room.description))
          local.push({
            id: room.id,
            type: "room",
            title: room.name,
            subtitle: t.local,
            href: `/room/${room.id}`,
            fandomId: room.fandomId,
          });
      }
    if (filter === "all" || filter === "fandoms")
      for (const fandom of fandoms) {
        if (
          matchesSearch(query, fandom.name, fandom.category, t[fandom.category])
        )
          local.push({
            id: fandom.id,
            type: "fandom",
            title: fandom.name,
            subtitle: t[fandom.category],
            href: `/fandoms/${fandom.id}`,
            art: fandomAssets[fandom.id]?.src,
          });
      }
    const items = [...local, ...(remote?.key === key ? remote.results : [])];
    return (["room", "music", "fandom"] as const).flatMap((type) =>
      items
        .filter((item) => item.type === type)
        .slice(0, filter === "all" ? 8 : 30),
    );
  }, [filter, state.rooms, query, t, remote, key]);
  const close = () => setSearchOpen(false);
  return (
    <ModalSurface
      className="quick-search-backdrop"
      label={t.quickSearch}
      onClose={close}
    >
      <div className="quick-search-modal">
        <div className="quick-search-header">
          <Search size={18} className="search-icon" />
          <input
            autoFocus
            type="search"
            maxLength={200}
            aria-label={t.quickSearch}
            className="quick-search-input"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="quick-search-clear"
              onClick={() => setQuery("")}
              aria-label={t.clearSearch}
            >
              <X size={16} />
            </button>
          )}
          <button
            className="quick-search-clear"
            onClick={close}
            aria-label={t.closeSearch}
          >
            <X size={16} />
          </button>
        </div>
        <div className="quick-search-filters">
          {(
            [
              ["all", t.searchFilterAll, Compass],
              ["music", t.searchFilterMusic, Music],
              ["rooms", t.searchFilterRooms, Film],
              ["fandoms", t.searchFilterFandoms, Sparkles],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              className={`filter-pill ${filter === value ? "active" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <div className="quick-search-results" aria-busy={pending}>
          {pending && (
            <p className="search-status" role="status">
              {t.loading}
            </p>
          )}
          {!pending && remote?.failed && (
            <p className="search-status" role="status">
              {t.platformUX.searchError}{" "}
              <button
                className="text-link"
                onClick={() => setAttempt((value) => value + 1)}
              >
                {t.retry}
              </button>
            </p>
          )}
          {!pending && !remote?.failed && !results.length && (
            <div className="quick-search-empty">
              <p>{t.noSearchResults}</p>
            </div>
          )}
          {results.map((item) => (
            <Link
              href={item.href}
              key={`${item.type}:${item.id}`}
              className="search-result-row"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                  const room = state.rooms.find((room) => room.id === item.id);
                  if (item.type === "room" && room)
                    setActiveCompanion({
                      id: room.id,
                      title: room.name,
                      artist: t.local,
                      fandomId: room.fandomId,
                      sourceUrl: room.url,
                      art: assets.vinyl.src,
                    });
                  close();
                }
              }}
            >
              <div className="row-art">
                {item.type === "room" ? (
                  <RoomVinyl fandomId={item.fandomId} />
                ) : item.art ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Provider thumbnail, fixed-size search row.
                  <img src={item.art} alt="" loading="lazy" decoding="async" />
                ) : (
                  <Sparkles size={18} />
                )}
              </div>
              <div className="row-info">
                <div className="row-title">{item.title}</div>
                <div className="row-subtitle">{item.subtitle}</div>
              </div>
              <span className="row-action" aria-hidden="true">
                <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </ModalSurface>
  );
}
