import { randomUUID } from "node:crypto";
import { currentAccount } from "@/lib/supabase/server";
import { prepareChatImage } from "@/lib/server/chat-images";
import { CHAT_IMAGE_BUCKET, MAX_IMAGE_OUTPUT } from "@/lib/chat-media";

/**
 * Chat images for the website (cookies) and the desktop app (bearer): the
 * caller's account decides, row-level security checks membership on every
 * read and write. Inputs are already size- and type-checked by the route.
 */
export type ImageUploadCode =
  | "saved"
  | "auth"
  | "invalidImage"
  | "mediaUnavailable"
  | "rateLimit"
  | "failed";

export async function storeChatImage(
  roomId: string,
  input: Uint8Array,
): Promise<ImageUploadCode> {
  const { client, user } = await currentAccount();
  if (!client || !user) return "auth";
  const [membership, room] = await Promise.all([
    client
      .from("room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    client.from("rooms").select("closed_at").eq("id", roomId).maybeSingle(),
  ]);
  if (
    membership.error ||
    !membership.data ||
    room.error ||
    !room.data ||
    room.data.closed_at
  )
    return "auth";
  const caps = await client.rpc("chat_media_capabilities");
  if (caps.error || caps.data !== true) return "mediaUnavailable";
  let image;
  try {
    image = await prepareChatImage(input);
  } catch {
    return "invalidImage";
  }
  const path = `${roomId}/${user.id}/${randomUUID()}.webp`;
  const storage = client.storage.from(CHAT_IMAGE_BUCKET);
  let attached = false;
  try {
    const upload = await storage.upload(path, image.data, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "0",
    });
    if (upload.error) return "mediaUnavailable";
    const sent = await client.rpc("send_room_image", {
      p_room: roomId,
      p_path: path,
      p_width: image.info.width,
      p_height: image.info.height,
      p_bytes: image.data.byteLength,
    });
    if (sent.error)
      return sent.error.message.includes("slow_down") ? "rateLimit" : "failed";
    attached = true;
    return "saved";
  } finally {
    if (!attached) {
      try {
        await storage.remove([path]);
      } catch {
        /* Bounded orphan; clean up through Storage API maintenance. */
      }
    }
  }
}

/** The image of a message the caller may see, re-encoded, or null. */
export async function readChatImage(
  messageId: string,
): Promise<Uint8Array | null> {
  const { client, user } = await currentAccount();
  if (!client || !user) return null;
  // RLS checks current membership on every request, including after a kick.
  const message = await client
    .from("room_messages")
    .select("image_path")
    .eq("id", messageId)
    .eq("kind", "image")
    .maybeSingle();
  if (message.error || !message.data?.image_path) return null;
  const file = await client.storage
    .from(CHAT_IMAGE_BUCKET)
    .download(message.data.image_path);
  if (file.error || !file.data || file.data.size > MAX_IMAGE_OUTPUT)
    return null;
  // Even files uploaded outside our form must decode as a safe raster image.
  const image = await prepareChatImage(
    new Uint8Array(await file.data.arrayBuffer()),
  );
  return new Uint8Array(image.data);
}
