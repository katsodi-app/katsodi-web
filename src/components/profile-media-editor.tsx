"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, ZoomIn } from "lucide-react";
import {
  MEDIA_SIZE,
  PROFILE_IMAGE_TYPES,
  PROFILE_MEDIA_INPUT,
  cropFromView,
  profileMediaUrl,
  type MediaKind,
} from "@/lib/profile-media";
import { ModalSurface } from "./modal-surface";
import { useWorkspace } from "./workspace-provider";

export type ProfileMediaState = {
  userId: string;
  avatar: boolean;
  banner: boolean;
  version: string | null;
};

/** Banner with an overlapping avatar: used on the account and profile pages. */
export function ProfileHeader({
  media,
  name,
  children,
}: {
  media: ProfileMediaState;
  name: string;
  children?: React.ReactNode;
}) {
  const { t } = useWorkspace();
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const imageUrl = (kind: MediaKind) => {
    const url = profileMediaUrl(media.userId, kind, media.version);
    return retry ? `${url}${url.includes("?") ? "&" : "?"}retry=${retry}` : url;
  };
  const avatar = imageUrl("avatar"),
    banner = imageUrl("banner");
  const hasError =
    (media.avatar && failed.includes(avatar)) ||
    (media.banner && failed.includes(banner));
  return (
    <div className="profile-hero">
      <div className="profile-banner">
        {media.banner && !failed.includes(banner) && (
          // eslint-disable-next-line @next/next/no-img-element -- access-checked, re-encoded API image.
          <img
            src={banner}
            alt=""
            onError={() => setFailed((urls) => [...urls, banner])}
          />
        )}
      </div>
      <div className="profile-hero-row">
        <div className="profile-avatar" aria-hidden="true">
          {media.avatar && !failed.includes(avatar) ? (
            // eslint-disable-next-line @next/next/no-img-element -- access-checked, re-encoded API image.
            <img
              src={avatar}
              alt=""
              onError={() => setFailed((urls) => [...urls, avatar])}
            />
          ) : (
            <span>{name.slice(0, 1).toUpperCase() || "K"}</span>
          )}
        </div>
        {children}
      </div>
      {hasError && (
        <p role="alert" className="profile-image-error">
          {t.profileSettings.imageLoadFailed}{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => setRetry((value) => value + 1)}
          >
            {t.retry}
          </button>
        </p>
      )}
    </div>
  );
}

/** Drag-and-zoom crop with a fixed aspect frame; keyboard: arrows, +/-. */
function CropDialog({
  file,
  kind,
  onClose,
  onSaved,
}: {
  file: File;
  kind: MediaKind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useWorkspace();
  const p = t.profileMedia;
  const viewport = useRef<HTMLDivElement>(null);
  // Revoked once the image has loaded (or failed), not on unmount: React
  // mounts twice in development, and an unmount-time revoke killed the URL
  // before the preview could load, leaving a black frame and no upload.
  const [src] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () =>
      setBox({ w: element.clientWidth, h: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Scale so the image always covers the frame; zoom enlarges from there.
  const scale =
    natural && box.w
      ? Math.max(box.w / natural.w, box.h / natural.h) * zoom
      : 1;
  const clamp = (x: number, y: number) =>
    natural
      ? {
          x: Math.min(0, Math.max(box.w - natural.w * scale, x)),
          y: Math.min(0, Math.max(box.h - natural.h * scale, y)),
        }
      : { x, y };
  const shown = clamp(offset.x, offset.y);
  async function save() {
    if (!natural) return;
    setSaving(true);
    setError("");
    const crop = cropFromView(
      natural.w,
      natural.h,
      box.w,
      box.h,
      scale,
      shown.x,
      shown.y,
    );
    const form = new FormData();
    form.set("kind", kind);
    form.set("crop", JSON.stringify(crop));
    form.set("image", file);
    try {
      const response = await fetch("/api/profile/media", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          data.code === "rateLimit"
            ? t.network.rateLimit
            : data.code === "imageTooLarge"
              ? p.tooLarge
              : p.failed,
        );
        return;
      }
      onSaved();
    } catch {
      setError(p.failed);
    } finally {
      setSaving(false);
    }
  }
  const aspect = MEDIA_SIZE[kind].width / MEDIA_SIZE[kind].height;
  return (
    <ModalSurface
      label={kind === "avatar" ? p.editAvatar : p.editBanner}
      className="crop-dialog"
      onClose={onClose}
    >
      <h2>{kind === "avatar" ? p.editAvatar : p.editBanner}</h2>
      <p className="crop-hint">{p.cropHint}</p>
      <div
        ref={viewport}
        className={`crop-viewport crop-${kind}`}
        style={{ aspectRatio: String(aspect) }}
        tabIndex={0}
        role="group"
        aria-label={p.cropArea}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            ox: shown.x,
            oy: shown.y,
          };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          setOffset(
            clamp(
              start.ox + event.clientX - start.x,
              start.oy + event.clientY - start.y,
            ),
          );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 40 : 10;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [step, 0],
            ArrowRight: [-step, 0],
            ArrowUp: [0, step],
            ArrowDown: [0, -step],
          };
          if (moves[event.key]) {
            event.preventDefault();
            const [dx, dy] = moves[event.key];
            setOffset(clamp(shown.x + dx, shown.y + dy));
          } else if (event.key === "+" || event.key === "=")
            setZoom((z) => Math.min(3, z + 0.1));
          else if (event.key === "-") setZoom((z) => Math.max(1, z - 0.1));
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file. */}
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(event) => {
            setNatural({
              w: event.currentTarget.naturalWidth,
              h: event.currentTarget.naturalHeight,
            });
            URL.revokeObjectURL(src);
          }}
          onError={() => {
            URL.revokeObjectURL(src);
            setError(p.type);
          }}
          style={
            natural
              ? {
                  width: natural.w * scale,
                  height: natural.h * scale,
                  transform: `translate(${shown.x}px, ${shown.y}px)`,
                }
              : { opacity: 0 }
          }
        />
      </div>
      <label className="crop-zoom">
        <ZoomIn size={16} />
        <span className="sr-only">{p.zoom}</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          aria-label={p.zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="crop-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          {p.cancel}
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={!natural || saving}
          onClick={() => void save()}
        >
          {saving ? p.saving : p.save}
        </button>
      </div>
    </ModalSurface>
  );
}

/** Account-page editor: preview, choose, crop, save or remove. */
export function ProfileMediaEditor({
  media,
  name,
}: {
  media: ProfileMediaState;
  name: string;
}) {
  const { t } = useWorkspace();
  const p = t.profileMedia;
  const router = useRouter();
  const [override, setOverride] = useState<{
    baseVersion: string | null;
    media: ProfileMediaState;
  } | null>(null);
  const currentMedia =
    override?.baseVersion === media.version ? override.media : media;
  const [editing, setEditing] = useState<{
    kind: MediaKind;
    file: File;
  } | null>(null);
  const [error, setError] = useState("");
  const inputs = {
    avatar: useRef<HTMLInputElement>(null),
    banner: useRef<HTMLInputElement>(null),
  };
  const choose = (kind: MediaKind, file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!PROFILE_IMAGE_TYPES.includes(file.type)) return setError(p.type);
    if (file.size > PROFILE_MEDIA_INPUT) return setError(p.tooLarge);
    setEditing({ kind, file });
  };
  const remove = async (kind: MediaKind) => {
    setError("");
    const response = await fetch(`/api/profile/media?kind=${kind}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!response?.ok) return setError(p.failed);
    setOverride({
      baseVersion: media.version,
      media: {
        ...currentMedia,
        [kind]: false,
        version: new Date().toISOString(),
      },
    });
    window.dispatchEvent(new Event("katsodi:profile-media"));
    router.refresh();
  };
  return (
    <section className="profile-media-editor" aria-label={p.title}>
      <ProfileHeader media={currentMedia} name={name}>
        <div className="profile-media-actions">
          {(["avatar", "banner"] as const).map((kind) => (
            <span key={kind}>
              <input
                ref={inputs[kind]}
                type="file"
                accept={PROFILE_IMAGE_TYPES.join(",")}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  choose(kind, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => inputs[kind].current?.click()}
              >
                <ImagePlus size={15} />
                {kind === "avatar" ? p.changeAvatar : p.changeBanner}
              </button>
              {currentMedia[kind] && (
                <button
                  type="button"
                  className="profile-media-remove"
                  aria-label={
                    kind === "avatar" ? p.removeAvatar : p.removeBanner
                  }
                  title={kind === "avatar" ? p.removeAvatar : p.removeBanner}
                  onClick={() => void remove(kind)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </span>
          ))}
        </div>
      </ProfileHeader>
      <p className="profile-media-hint">{p.hint}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <CropDialog
          file={editing.file}
          kind={editing.kind}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setOverride({
              baseVersion: media.version,
              media: {
                ...currentMedia,
                [editing.kind]: true,
                version: new Date().toISOString(),
              },
            });
            setEditing(null);
            window.dispatchEvent(new Event("katsodi:profile-media"));
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
