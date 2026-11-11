import sharp from "sharp";
import { MAX_IMAGE_INPUT, MAX_IMAGE_OUTPUT } from "@/lib/chat-media";

export async function prepareChatImage(input: Uint8Array) {
  if (!input.byteLength || input.byteLength > MAX_IMAGE_INPUT)
    throw new Error("invalid_image");
  const image = sharp(input, {
    limitInputPixels: 16_000_000,
    animated: false,
    failOn: "warning",
  });
  const meta = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    (meta.pages || 1) > 1
  )
    throw new Error("invalid_image");
  // Re-encoding strips metadata and never serves the original upload.
  for (const [edge, quality] of [
    [1280, 78],
    [1280, 58],
    [960, 58],
    [640, 58],
  ]) {
    const output = await image
      .clone()
      .rotate()
      .resize({
        width: edge,
        height: edge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (output.data.byteLength <= MAX_IMAGE_OUTPUT) return output;
  }
  throw new Error("invalid_image");
}
