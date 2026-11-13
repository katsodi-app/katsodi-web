/* eslint-disable @next/next/no-img-element -- Local pre-sized WebP posters; no runtime re-encoding. */
import type { CSSProperties } from "react";
import { fandomAssets, type EditorialAsset } from "@/data/editorial";
import type { Category } from "@/lib/fandoms";

type Poster = EditorialAsset & { fandomId: string; work: string };

const available = (poster: Poster | undefined): poster is Poster =>
  !!poster && !poster.src.includes("unavailable") && !poster.background;

/**
 * The sharpest real fandom artwork of a category: posters (taller than
 * wide) or wide photos, largest first, so a slot never shows an upscaled
 * thumbnail.
 */
export function sharpPosters(
  category: Category,
  shape: "tall" | "wide",
  count: number,
): Poster[] {
  return Object.values(fandomAssets)
    .filter(
      (poster) =>
        available(poster) &&
        poster.fandomId.startsWith(`${category}-`) &&
        (shape === "tall"
          ? poster.height > poster.width * 1.2
          : poster.width > poster.height * 1.3) &&
        poster.width >= 600,
    )
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, count);
}

/** Fixed picks by fandom id (missing ones are skipped). */
export const postersById = (ids: string[]): Poster[] =>
  ids.map((id) => fandomAssets[id]).filter(available);

function PosterImage({
  poster,
  sizes,
  eager,
}: {
  poster: Poster;
  sizes: string;
  eager?: boolean;
}) {
  return (
    <img
      src={poster.src}
      srcSet={
        poster.thumbnail
          ? `${poster.thumbnail} 480w, ${poster.src} ${poster.width}w`
          : undefined
      }
      sizes={poster.thumbnail ? sizes : undefined}
      width={poster.width}
      height={poster.height}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      style={{ objectPosition: poster.focalPoint }}
    />
  );
}

/**
 * Real fandom artwork arranged to fill a slot of any shape:
 * - "row": tall posters side by side (landscape panels);
 * - "grid": wide photos two by two;
 * - "sky": a tilted wall that covers a full-bleed background;
 * - "player": one poster over a blurred copy of itself (16:9 frames).
 * Decorative: the surrounding section carries the meaning.
 */
export function PosterWall({
  posters,
  variant,
  className = "",
  sizes = "25vw",
  eager = false,
}: {
  posters: Poster[];
  variant: "row" | "grid" | "sky" | "player";
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  if (!posters.length) return null;
  if (variant === "player") {
    const poster = posters[0];
    return (
      <div
        className={`poster-wall poster-wall-player ${className}`}
        aria-hidden="true"
      >
        <div
          className="poster-wall-blur"
          style={
            {
              backgroundImage: `url(${poster.thumbnail || poster.src})`,
            } as CSSProperties
          }
        />
        <PosterImage poster={poster} sizes={sizes} eager={eager} />
      </div>
    );
  }
  // The sky wall repeats its posters until the grid is covered.
  const cells =
    variant === "sky"
      ? Array.from(
          { length: 40 },
          (_, index) => posters[index % posters.length],
        )
      : posters;
  return (
    <div
      className={`poster-wall poster-wall-${variant} ${className}`}
      aria-hidden="true"
    >
      {cells.map((poster, index) => (
        <PosterImage
          key={`${poster.fandomId}-${index}`}
          poster={poster}
          sizes={sizes}
          eager={eager && index < 12}
        />
      ))}
    </div>
  );
}
