export const MAX_IMAGE_INPUT = 2 * 1024 * 1024;
export const MAX_IMAGE_OUTPUT = 384 * 1024;
export const CHAT_IMAGE_BUCKET = "chat-images";
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const stickerIds = [
  "hey",
  "hype",
  "love",
  "laugh",
  "cozy",
  "wow",
  "cry",
  "gg",
] as const;
export type StickerId = (typeof stickerIds)[number];
export function isStickerId(value: unknown): value is StickerId {
  return typeof value === "string" && stickerIds.includes(value as StickerId);
}
export function validImageInput(file: { size: number; type: string }) {
  return (
    file.size > 0 &&
    file.size <= MAX_IMAGE_INPUT &&
    IMAGE_TYPES.includes(file.type)
  );
}
