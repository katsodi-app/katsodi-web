"use client";
import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useLocale } from "./workspace-provider";

export function OverviewFilm() {
  const { t } = useLocale();
  const c = t.overviewLanding;
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function toggle() {
    if (!video.current) return;
    setError(false);
    if (!video.current.paused) {
      video.current.pause();
      return;
    }
    setPending(true);
    try {
      await video.current.play();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div
        className={`overview-video-frame ${playing ? "is-playing" : "is-paused"}`}
      >
        <video
          ref={video}
          controls
          playsInline
          preload="none"
          poster="/media/katsodi-launch.jpg"
          width={1920}
          height={1080}
          aria-label={c.filmLabel}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setError(true);
          }}
        >
          <source src="/media/katsodi-launch.mp4" type="video/mp4" />
          <a href="/media/katsodi-launch.mp4">{c.filmDownload}</a>
        </video>
        <button
          type="button"
          className="overview-film-toggle"
          onClick={toggle}
          disabled={pending}
          aria-label={playing ? c.filmPause : c.filmPlay}
          aria-busy={pending}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <p role="status" className="overview-film-caption">
          {c.filmError} <a href="/media/katsodi-launch.mp4">{c.filmDownload}</a>
        </p>
      )}
    </>
  );
}
