import "server-only";
import sharp from "sharp";
import {
  MEDIA_SIZE,
  PROFILE_MEDIA_INPUT,
  PROFILE_MEDIA_OUTPUT,
  type Crop,
  type MediaKind,
} from "../profile-media";

/**
 * Crops, resizes and re-encodes an uploaded avatar or banner as WebP.
 * EXIF orientation is applied first and all metadata (GPS, camera) is
 * dropped; only JPEG/PNG/WebP still images are accepted.
 */
export async function prepareProfileImage(
  input: Uint8Array,
  kind: MediaKind,
  crop: Crop,
) {
  if (!input.byteLength || input.byteLength > PROFILE_MEDIA_INPUT)
    throw new Error("invalid_image");
  const source = sharp(input, {
    limitInputPixels: 40_000_000,
    animated: false,
    failOn: "warning",
  });
  const meta = await source.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    (meta.pages || 1) > 1
  )
    throw new Error("invalid_image");
  // Upright copy first, so the crop fractions match what the user saw.
  const upright = await source.rotate().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = upright.info;
  const left = Math.min(Math.round(crop.x * w), w - 1);
  const top = Math.min(Math.round(crop.y * h), h - 1);
  const area = {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(crop.width * w), w - left)),
    height: Math.max(1, Math.min(Math.round(crop.height * h), h - top)),
  };
  const size = MEDIA_SIZE[kind];
  for (const quality of [82, 70, 58]) {
    const output = await sharp(upright.data)
      .extract(area)
      .resize({ ...size, fit: "cover" })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (output.data.byteLength <= PROFILE_MEDIA_OUTPUT) return output;
  }
  throw new Error("invalid_image");
}

/** Re-encodes a stored image before serving it (it may not be ours). */
export async function sanitizeStoredImage(input: Uint8Array, kind: MediaKind) {
  if (!input.byteLength || input.byteLength > PROFILE_MEDIA_OUTPUT)
    throw new Error("invalid_image");
  const image = sharp(input, {
    limitInputPixels: 4_000_000,
    animated: false,
    failOn: "warning",
  });
  const meta = await image.metadata();
  if (meta.format !== "webp") throw new Error("invalid_image");
  return image
    .resize({ ...MEDIA_SIZE[kind], fit: "cover" })
    .webp({ quality: 82, effort: 2 })
    .toBuffer();
}
