"use client";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { profileMediaUrl } from "@/lib/profile-media";

/** Access-checked same-origin media; missing/revoked images keep the existing initial fallback. */
export function UserAvatar({
  userId,
  name,
  version,
  available = true,
  iconFallback = false,
  className = "",
}: {
  userId?: string;
  name: string;
  version?: string | null;
  available?: boolean;
  iconFallback?: boolean;
  className?: string;
}) {
  const src =
    userId && available ? profileMediaUrl(userId, "avatar", version) : "";
  const [failed, setFailed] = useState("");
  return (
    <span className={`user-avatar ${className}`} aria-hidden="true">
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element -- Protected same-origin endpoint.
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
        />
      ) : iconFallback ? (
        <UserRound size={18} />
      ) : (
        <span>{Array.from(name.trim())[0]?.toUpperCase() || "K"}</span>
      )}
    </span>
  );
}
