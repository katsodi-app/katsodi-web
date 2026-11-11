"use client";
import { matchesSearch } from "@/lib/search";
/* eslint-disable @next/next/no-img-element -- Pre-sized provider CDN artwork; audio/video remain in consent-gated players. */
import { useState } from "react";
import { ExternalLink, Music2, Search, Play } from "lucide-react";
import { formatDate, formatStreams } from "@/lib/music-format";
import { IntentLink as Link } from "./intent-link";
import { ListenInRoom } from "./listen-in-room";
import { PageIntro } from "./page-design";
import { useLocale } from "./workspace-provider";
import { useMusicPlayer } from "./music-player-provider";
import type { MusicLibraryView } from "@/lib/music-library-view";

export function MusicLibrary({
  chart,
  charts,
  collections,
  initialQuery = "",
  initialCollection = "all-time",
}: MusicLibraryView & { initialQuery?: string; initialCollection?: string }) {
  const { t, locale } = useLocale();
  const m = t.musicLibrary;
  const { start, currentId } = useMusicPlayer();
  const [selected, setSelected] = useState<
    "spotify" | "youtube" | "soundcloud" | "trending" | "all-time"
  >(
    ["spotify", "youtube", "soundcloud", "trending"].includes(initialCollection)
      ? (initialCollection as "spotify" | "youtube" | "soundcloud" | "trending")
      : "all-time",
  );
  const [query, setQuery] = useState(initialQuery);
  const curated =
    selected === "soundcloud"
      ? collections.popular
      : selected === "trending"
        ? collections.trending
        : null;
  const current = curated
    ? {
        ...curated,
        source: "https://soundcloud.com/discover",
        scope: "curated",
        period: t.musicPlayer.researched,
        status: "ready",
        attempted: curated.checked,
      }
    : selected === "all-time"
      ? {
          source: chart.source,
          scope: "global",
          period: m.mostPlayedHint,
          status: "ready",
          checked: chart.checked,
          tracks: chart.tracks.map((track) => ({
            ...track,
            id: `spotify:${track.spotifyId}`,
            url: `https://open.spotify.com/track/${track.spotifyId}`,
            cover: track.thumb,
            plays: track.streams,
          })),
        }
      : charts.find((entry) => entry.provider === selected);
  const collectionName =
    selected === "all-time"
      ? m.mostPlayed
      : selected === "trending"
        ? t.musicPlayer.trending
        : selected === "soundcloud"
          ? t.musicPlayer.popular
          : selected === "youtube"
            ? "YouTube"
            : "Spotify";
  const queue = (current?.tracks || []).map((track) => ({
    ...track,
    artists: track.artists.length ? track.artists : [m.publishedVideo],
  }));
  const filtered =
    current?.tracks.filter((track) =>
      matchesSearch(query, track.title, ...track.artists),
    ) || [];
  return (
    <div className="music-library">
      <nav className="music-chart-tabs" aria-label={m.navigation}>
        <button
          className="chip"
          aria-pressed={selected === "all-time"}
          onClick={() => {
            setSelected("all-time");
            setQuery("");
          }}
        >
          {m.mostPlayed}
        </button>
        {(["spotify", "youtube", "soundcloud", "trending"] as const).map(
          (provider) => (
            <button
              key={provider}
              className="chip"
              aria-pressed={selected === provider}
              onClick={() => {
                setSelected(provider);
                setQuery("");
              }}
            >
              {provider === "youtube"
                ? "YouTube"
                : provider === "soundcloud"
                  ? "SoundCloud"
                  : provider === "trending"
                    ? t.musicPlayer.trending
                    : "Spotify"}
              <span>
                {provider === "soundcloud"
                  ? collections.popular.tracks.length
                  : provider === "trending"
                    ? collections.trending.tracks.length
                    : charts.find((entry) => entry.provider === provider)
                        ?.tracks.length || "—"}
              </span>
            </button>
          ),
        )}
      </nav>
      {
        <>
          <PageIntro
            eyebrow={m.eyebrow}
            title={
              curated || selected === "all-time"
                ? collectionName
                : `${collectionName} · ${current?.tracks.length === 150 ? m.top150 : m.availableChart}`
            }
            description={
              selected === "all-time"
                ? t.musicChart.intro
                : curated
                  ? selected === "trending"
                    ? t.musicPlayer.curatedHint
                    : t.musicPlayer.soundcloudHint
                  : m.intro
            }
            motif="rooms"
          />
          {current && (
            <div className="chart-source-panel">
              <div>
                <strong>
                  {curated
                    ? t.musicPlayer.researched
                    : current.scope === "global"
                      ? m.global
                      : m.us}
                </strong>
                <p>
                  {current.period || m.publicRanking}
                  {current.checked && (
                    <>
                      {" "}
                      · {m.checked}{" "}
                      <time dateTime={current.checked}>
                        {formatDate(current.checked.slice(0, 10), locale)}
                      </time>
                    </>
                  )}
                </p>
              </div>
              <a
                href={current.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                {m.openSource}
                <ExternalLink size={15} />
              </a>
            </div>
          )}
          {(current?.status === "partial" || current?.status === "stale") && (
            <p className="notice" role="status">
              {current.status === "stale"
                ? m.stale
                : m.partial.replace("{count}", String(current.tracks.length))}
            </p>
          )}
          {current?.tracks.length ? (
            <>
              <label className="search-box music-discovery-search">
                <Search size={18} />
                <span className="sr-only">{t.musicChart.filter}</span>
                <input
                  type="search"
                  placeholder={t.musicChart.filter}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <p className="sr-only" role="status">
                {t.musicChart.results}: {filtered.length}
              </p>
              <ol
                className={`discovery-track-list ${selected === "all-time" ? "chart-list" : ""}`}
              >
                {filtered.map((track) => (
                  <li
                    key={track.id}
                    data-playing={currentId === track.id ? "true" : undefined}
                  >
                    <span className="chart-rank">{track.rank}</span>
                    <button
                      className="music-track-play"
                      aria-label={`${t.musicPlayer.play}: ${track.title}`}
                      onClick={() =>
                        start(
                          queue,
                          queue.findIndex((t) => t.id === track.id),
                          collectionName,
                        )
                      }
                    >
                      {track.cover ? (
                        <img
                          src={track.cover}
                          alt=""
                          width={48}
                          height={48}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span
                          className="discovery-track-art"
                          aria-hidden="true"
                        >
                          <Music2 size={21} />
                        </span>
                      )}
                      <Play size={18} className="music-track-play-icon" />
                    </button>
                    <Link
                      className="discovery-track-title"
                      href={
                        selected === "all-time" && "slug" in track
                          ? `/music/${track.slug}`
                          : track.url
                      }
                    >
                      <strong>{track.title}</strong>
                      <span>
                        {track.artists.join(", ") || m.publishedVideo}
                      </span>
                    </Link>
                    <span className="chart-streams">
                      {track.plays === null
                        ? "—"
                        : formatStreams(track.plays, locale)}
                      <small>
                        {selected === "youtube" ? m.views : m.streams}
                      </small>
                    </span>
                    <ListenInRoom url={track.url} title={track.title} />
                  </li>
                ))}
              </ol>
              {!filtered.length && (
                <p className="chart-empty">{t.musicChart.empty}</p>
              )}
            </>
          ) : (
            <section className="brand-surface music-source-unavailable">
              <Music2 size={30} aria-hidden="true" />
              <h2>{m.unavailableTitle}</h2>
              <p>{m.unavailable}</p>
              <p>{m.sourceFallback}</p>
            </section>
          )}
        </>
      }
    </div>
  );
}
