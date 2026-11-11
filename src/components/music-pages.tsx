"use client";
import { matchesSearch } from "@/lib/search";
/* eslint-disable @next/next/no-img-element -- Spotify's CDN serves pre-sized covers (300/640 px); routing them through the optimizer would only re-encode them. */
import { IntentLink as Link } from "./intent-link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Music2,
  Search,
  Play,
} from "lucide-react";
import {
  formatDate,
  formatStreams,
  musicDescription,
  soundcloudSearchUrl,
  soundcloudWidgetUrl,
  spotifyEmbedUrl,
  spotifyUrl,
  type MusicTrack,
  type MusicTrackLink,
} from "@/lib/music-format";
import { PageIntro } from "./page-design";
import { ExternalMedia } from "./external-media";
import { useLocale } from "./workspace-provider";
import { ListenInRoom } from "./listen-in-room";
import { useMusicPlayer } from "./music-player-provider";
import { chartQueue } from "@/lib/music-queue";

function Explicit() {
  const { t } = useLocale();
  return (
    <span
      className="chart-explicit"
      title={t.musicChart.explicitLabel}
      aria-label={t.musicChart.explicitLabel}
    >
      {t.musicChart.explicit}
    </span>
  );
}

/** The chart data comes from the server page, so the JSON is not bundled. */
export function MusicChart({
  chart,
}: {
  chart: { source: string; checked: string; tracks: MusicTrack[] };
}) {
  const musicTracks = chart.tracks;
  const { start, currentId } = useMusicPlayer();
  const queue = useMemo(() => chartQueue(musicTracks), [musicTracks]);
  const { t, locale } = useLocale();
  const m = t.musicChart;
  const [query, setQuery] = useState("");
  const tracks = useMemo(() => {
    const q = query.trim();
    if (!q) return musicTracks;
    return musicTracks.filter((track) =>
      matchesSearch(q, track.title, ...track.artists),
    );
  }, [query, musicTracks]);
  return (
    <>
      <PageIntro
        eyebrow={m.eyebrow}
        title={m.title}
        description={m.intro}
        motif="saved"
      />
      <div className="chart-toolbar">
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">{m.filter}</span>
          <input
            type="search"
            placeholder={m.filter}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="form-hint">
          <a
            href={chart.source}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            {m.source}
          </a>{" "}
          · {m.checked} {formatDate(chart.checked, locale)}
        </p>
      </div>
      <p className="sr-only" role="status">
        {m.results}: {tracks.length}
      </p>
      {tracks.length ? (
        <ol className="chart-list">
          {tracks.map((track) => (
            <li
              key={track.slug}
              data-playing={
                currentId === `spotify:${track.spotifyId}` ? "true" : undefined
              }
            >
              <Link href={`/music/${track.slug}`} className="chart-row">
                <span className="chart-rank">{track.rank}</span>
                <img
                  src={track.thumb}
                  alt=""
                  width={56}
                  height={56}
                  loading={track.rank <= 8 ? "eager" : "lazy"}
                  decoding="async"
                />
                <span className="chart-row-text">
                  <strong>
                    {track.title}
                    {track.explicit && <Explicit />}
                  </strong>
                  <span>{track.artists.join(", ")}</span>
                </span>
                <span className="chart-streams">
                  {formatStreams(track.streams, locale)}
                  <small>{m.streams}</small>
                </span>
              </Link>
              <button
                className="icon-button music-chart-play"
                aria-label={`${t.musicPlayer.play}: ${track.title}`}
                onClick={() =>
                  start(
                    queue,
                    musicTracks.findIndex((t) => t.slug === track.slug),
                    m.title,
                  )
                }
              >
                <Play size={21} />
              </button>
              <ListenInRoom
                url={spotifyUrl(track.spotifyId)}
                title={track.title}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="brand-surface chart-empty">{m.empty}</p>
      )}
    </>
  );
}

export function MusicTrackPage({
  track,
  previous,
  next,
}: {
  track: MusicTrack;
  previous: MusicTrackLink | null;
  next: MusicTrackLink | null;
}) {
  const { t, locale } = useLocale();
  const m = t.musicChart;
  const { start } = useMusicPlayer();
  return (
    <>
      <Link href="/music" className="text-link room-back-link">
        <ArrowLeft size={16} />
        {m.back}
      </Link>
      <header className="music-hero">
        <img
          className="music-cover"
          src={track.cover}
          alt={`${m.cover}: ${track.title} — ${track.artists.join(", ")}`}
          width={640}
          height={640}
          fetchPriority="high"
        />
        <div>
          <p className="eyebrow">
            #{track.rank} · {m.eyebrow}
          </p>
          <h1>
            {track.title}
            {track.explicit && <Explicit />}
          </h1>
          <p className="music-artists">{track.artists.join(", ")}</p>
          <button
            className="button button-primary music-detail-play"
            onClick={() => start(chartQueue([track]), 0, track.title)}
          >
            <Play size={18} />
            {t.musicPlayer.play}
          </button>
          <ListenInRoom url={spotifyUrl(track.spotifyId)} title={track.title} />
          <dl className="music-facts">
            <div>
              <dt>{m.streams}</dt>
              <dd>{formatStreams(track.streams, locale)}</dd>
            </div>
            {track.released && (
              <div>
                <dt>{m.released}</dt>
                <dd>{formatDate(track.released, locale)}</dd>
              </div>
            )}
            <div>
              <dt>{m.checked}</dt>
              <dd>{formatDate(track.checked, locale)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="music-detail-grid">
        <section className="brand-surface music-about">
          <h2>{m.about}</h2>
          <p>{musicDescription(track, locale)}</p>
          <ul className="music-links">
            <li>
              <a
                className="watch-source"
                href={spotifyUrl(track.spotifyId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="watch-source-icon">
                  <Music2 size={22} />
                </span>
                <span>
                  <strong>{m.listenSpotify}</strong>
                  <small>Spotify</small>
                </span>
                <ArrowUpRight size={20} />
              </a>
            </li>
            <li>
              <a
                className="watch-source"
                href={
                  track.soundcloud
                    ? track.soundcloud.url
                    : soundcloudSearchUrl(track)
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="watch-source-icon">
                  {track.soundcloud ? (
                    <Music2 size={22} />
                  ) : (
                    <Search size={22} />
                  )}
                </span>
                <span>
                  <strong>
                    {track.soundcloud ? m.listenSoundcloud : m.searchSoundcloud}
                  </strong>
                  <small>
                    {track.soundcloud
                      ? `SoundCloud · ${track.soundcloud.author}`
                      : "SoundCloud"}
                  </small>
                </span>
                <ArrowUpRight size={20} />
              </a>
            </li>
          </ul>
          {!track.soundcloud && (
            <p className="form-hint">{m.soundcloudMissing}</p>
          )}
        </section>

        <section className="brand-surface music-player">
          <h2>{m.listen}</h2>
          <ExternalMedia provider="Spotify">
            <iframe
              key={`spotify-${track.spotifyId}`}
              title={`${m.spotifyPlayer}: ${track.title}`}
              src={spotifyEmbedUrl(track.spotifyId)}
              height={152}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          </ExternalMedia>
          <p className="form-hint">{m.spotifyNote}</p>
          {track.soundcloud && (
            <>
              <ExternalMedia provider="SoundCloud">
                <iframe
                  key={`soundcloud-${track.soundcloud.url}`}
                  title={`${m.soundcloudPlayer}: ${track.title}`}
                  src={soundcloudWidgetUrl(track.soundcloud.url)}
                  height={166}
                  loading="lazy"
                  allow="autoplay; encrypted-media"
                />
              </ExternalMedia>
              <p className="form-hint">{m.soundcloudNote}</p>
            </>
          )}
        </section>
      </div>

      <nav className="music-pager" aria-label={m.title}>
        {previous ? (
          <Link href={`/music/${previous.slug}`} className="text-link">
            <ArrowLeft size={16} />
            {m.previous}: #{previous.rank} {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/music/${next.slug}`} className="text-link">
            {m.next}: #{next.rank} {next.title}
            <ArrowRight size={16} />
          </Link>
        )}
      </nav>
    </>
  );
}
