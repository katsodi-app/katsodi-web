"use client";
/* eslint-disable @next/next/no-img-element -- Local fandom thumbnails and pre-sized catalogue album artwork. */
import {
  Film,
  Headphones,
  Globe2,
  LockKeyhole,
  Check,
  AudioLines,
} from "lucide-react";
import { fandomAssets } from "@/data/editorial";
import music from "@/data/music-top150.json";
import { fandoms } from "@/lib/fandoms";
import { useWorkspace } from "./workspace-provider";
import { Cover, roomPaletteStyle } from "./room-card";

const videoArt = ["anime-0", "cinema-6", "anime-1"].map(
  (id) => fandomAssets[id],
);
const musicArt = music.tracks.slice(0, 3);

export function RoomCreationHeading({ title }: { title: string }) {
  const { t } = useWorkspace();
  return (
    <header className="room-studio-heading">
      <p className="eyebrow">{t.roomStudio.eyebrow}</p>
      <h1>{title}</h1>
      <p>{t.roomStudio.hint}</p>
    </header>
  );
}

export function RoomFormatPicker({
  value,
  onChange,
  local = false,
}: {
  value: string;
  onChange: (value: "video" | "music") => void;
  local?: boolean;
}) {
  const { t } = useWorkspace();
  return (
    <fieldset className="studio-format-picker">
      <legend>{t.roomStudio.format}</legend>
      <div>
        {(["video", "music"] as const).map((format) => (
          <label
            key={format}
            className={`studio-format-card ${value === format ? "is-selected" : ""}`}
          >
            <input
              type="radio"
              name="format"
              value={format}
              checked={value === format}
              onChange={() => onChange(format)}
            />
            <span className="studio-art-stack" aria-hidden="true">
              {(format === "video"
                ? videoArt.map((asset) => asset?.thumbnail || asset?.src)
                : musicArt.map((track) => track.thumb)
              ).map((src, index) => (
                <img
                  key={index}
                  src={src || "/icon.svg"}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = "/icon.svg";
                  }}
                />
              ))}
            </span>
            <span className="studio-format-copy">
              <strong>
                {format === "video" ? (
                  <Film size={20} />
                ) : (
                  <Headphones size={20} />
                )}
                {t[format]}
              </strong>
              <span>
                {local
                  ? t.roomStudio.localFormatHint
                  : format === "video"
                    ? t.roomStudio.videoHint
                    : t.roomStudio.musicHint}
              </span>
            </span>
            <Check
              className="studio-format-check"
              size={20}
              aria-hidden="true"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function RoomVisibilityPicker({
  value,
  onChange,
  local = false,
}: {
  value: string;
  onChange: (value: "public" | "private") => void;
  local?: boolean;
}) {
  const { t } = useWorkspace();
  return (
    <fieldset className="studio-visibility">
      <legend>{local ? t.roomStudio.localAccess : t.roomStudio.access}</legend>
      <div>
        {(["public", "private"] as const).map((visibility) => (
          <label
            key={visibility}
            className={value === visibility ? "is-selected" : ""}
          >
            <input
              name="visibility"
              type="radio"
              value={visibility}
              checked={value === visibility}
              onChange={() => onChange(visibility)}
            />
            {visibility === "public" ? (
              <Globe2 size={20} />
            ) : (
              <LockKeyhole size={20} />
            )}
            <span>
              <strong>{t[visibility]}</strong>
              <small>
                {local
                  ? visibility === "public"
                    ? t.roomStudio.localPublicHint
                    : t.roomStudio.localPrivateHint
                  : visibility === "public"
                    ? t.roomStudio.publicHint
                    : t.roomStudio.privateHint}
              </small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MusicRoomGuide({ local = false }: { local?: boolean }) {
  const { t } = useWorkspace();
  return (
    <section className="music-room-guide">
      <AudioLines size={25} />
      <div>
        <h3>{t.roomStudio.musicTitle}</h3>
        <p>{local ? t.roomStudio.localMusicTip : t.roomStudio.musicTip}</p>
        <div className="music-platform-chips">
          <a
            href="https://soundcloud.com/discover"
            target="_blank"
            rel="noopener noreferrer"
          >
            SoundCloud
          </a>
          <a
            href="https://www.youtube.com/feed/music"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube
          </a>
          <a
            href="https://open.spotify.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Spotify
          </a>
        </div>
        <p>{t.roomStudio.platformHint}</p>
        {!local && <p>{t.roomStudio.queueTip}</p>}
      </div>
    </section>
  );
}

export function RoomCreationPreview({
  name,
  description,
  format,
  visibility,
  fandomId,
  local = false,
}: {
  name: string;
  description: string;
  format: string;
  visibility: "public" | "private";
  fandomId?: string;
  local?: boolean;
}) {
  const { t } = useWorkspace();
  const fandom = fandoms.find((item) => item.id === fandomId);
  return (
    <aside
      className="create-aside create-live-preview studio-preview"
      style={roomPaletteStyle(fandomId)}
    >
      <p className="eyebrow">{t.roomStudio.preview}</p>
      {format === "music" ? (
        <div className="studio-album-preview" aria-hidden="true">
          {musicArt.map((track) => (
            <img
              key={track.slug}
              src={track.thumb}
              alt=""
              onError={(event) => {
                event.currentTarget.src = "/icon.svg";
              }}
            />
          ))}
          <Headphones size={30} />
        </div>
      ) : (
        <Cover art="orbit" fandomId={fandomId} />
      )}
      <h2 className="preview-room-name">{name || t.roomStudio.untitled}</h2>
      <p>{description || t.roomStudio.hint}</p>
      <div className="studio-preview-tags">
        <span>{format === "music" ? t.music : t.video}</span>
        <span>{t[visibility]}</span>
        <span>{fandom?.name || t.roomStudio.other}</span>
      </div>
      <hr />
      <p>{local ? t.localHint : t.network.serverIntro}</p>
      {local && <small>{t.inviteUnavailable}</small>}
    </aside>
  );
}
