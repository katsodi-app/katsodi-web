"use client";
import { useState, useEffect, useRef } from "react";
import { fandomAssets } from "@/data/editorial";

export function RoomVinyl({
  fandomId,
  className = "",
}: {
  fandomId?: string | null;
  className?: string;
}) {
  const asset = fandomId ? fandomAssets[fandomId] : undefined;
  const src = asset?.thumbnail || asset?.src || "/icon.svg";
  const [failed, setFailed] = useState("");
  const element = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return (
    <span
      ref={element}
      className={`room-vinyl ${visible ? "is-visible" : ""} ${className}`}
      aria-hidden="true"
    >
      <span className="vinyl-disc" />
      <span className="vinyl-label">
        {/* eslint-disable-next-line @next/next/no-img-element -- Small decorative fandom artwork with fixed dimensions. */}
        <img
          src={failed === src ? "/icon.svg" : src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
        />
      </span>
    </span>
  );
}
