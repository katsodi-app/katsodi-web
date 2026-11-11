import { z } from "zod";

export const PROFILE_MEDIA_BUCKET = "profile-media";
export const PROFILE_MEDIA_INPUT = 5 * 1024 * 1024;
export const PROFILE_MEDIA_OUTPUT = 512 * 1024;
export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const mediaKinds = ["avatar", "banner"] as const;
export type MediaKind = (typeof mediaKinds)[number];

/** Output size per kind; the crop box keeps this aspect ratio. */
export const MEDIA_SIZE: Record<MediaKind, { width: number; height: number }> =
  {
    avatar: { width: 256, height: 256 },
    banner: { width: 1500, height: 500 },
  };

/** Crop rectangle as fractions (0–1) of the upright source image. */
export const cropSchema = z
  .object({
    x: z.number().finite().min(0).max(1),
    y: z.number().finite().min(0).max(1),
    width: z.number().finite().gt(0).max(1),
    height: z.number().finite().gt(0).max(1),
  })
  .refine((c) => c.x + c.width <= 1.0001 && c.y + c.height <= 1.0001, {
    message: "crop_outside",
  });
export type Crop = z.infer<typeof cropSchema>;

export const isMediaKind = (value: unknown): value is MediaKind =>
  mediaKinds.includes(value as MediaKind);

/** Same-origin URL that serves a user's avatar or banner, with a cache key. */
export function profileMediaUrl(
  userId: string,
  kind: MediaKind,
  version: string | null | undefined,
) {
  return `/api/profile-media/${userId}/${kind}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
}

/**
 * Crop for an image of natural size (w, h) shown in a viewport of size
 * (vw, vh) at `scale` (screen px per image px) with the image's top-left at
 * (ox, oy) relative to the viewport. Clamped to the image.
 */
export function cropFromView(
  w: number,
  h: number,
  vw: number,
  vh: number,
  scale: number,
  ox: number,
  oy: number,
): Crop {
  const width = Math.min(1, vw / scale / w);
  const height = Math.min(1, vh / scale / h);
  const x = Math.min(Math.max(-ox / scale / w, 0), 1 - width);
  const y = Math.min(Math.max(-oy / scale / h, 0), 1 - height);
  return { x, y, width, height };
}
