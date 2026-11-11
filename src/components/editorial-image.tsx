"use client";
/* eslint-disable @next/next/no-img-element -- Local pre-sized WebP srcset avoids runtime re-encoding and external image requests. */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ImageOff } from "lucide-react";
import type { EditorialAsset } from "@/data/editorial";
import { useLocale } from "./workspace-provider";
export function EditorialImage({
  asset,
  priority = false,
  sizes = "(max-width: 600px) 90vw, (max-width: 1100px) 40vw, 25vw",
  className = "",
}: {
  asset: EditorialAsset;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // A cached error can arrive before React attaches onError during hydration.
    if (image.current?.complete && image.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, [asset.src]);
  const { locale, t } = useLocale();
  const srcSet =
    asset.kind === "thematic-photograph"
      ? [480, 960, 1600]
          .map((w) => `/images/editorial/${asset.id}-${w}.webp ${w}w`)
          .join(", ")
      : asset.thumbnail
        ? `${asset.thumbnail} 480w, ${asset.src} ${asset.width}w`
        : undefined;
  return (
    <div
      className={`editorial-image ${className} ${failed ? "image-failed" : ""}`}
      style={{ "--image-glow": asset.glow } as CSSProperties}
    >
      {failed ? (
        <div
          className="image-fallback"
          role="img"
          aria-label={`${asset.alt[locale]}. ${t.imageUnavailable}`}
        >
          <ImageOff size={26} />
          <span>{t.imageUnavailable}</span>
        </div>
      ) : (
        <img
          ref={image}
          src={asset.src}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          width={asset.width}
          height={asset.height}
          alt={asset.alt[locale]}
          style={{
            objectPosition: asset.focalPoint,
            backgroundColor: asset.background,
          }}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
