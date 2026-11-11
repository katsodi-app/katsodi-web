import { sameOrigin } from "@/lib/server/same-origin";
import { randomUUID } from "node:crypto";
import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { prepareChatImage } from "@/lib/server/chat-images";
import {
  CHAT_IMAGE_BUCKET,
  MAX_IMAGE_INPUT,
  validImageInput,
} from "@/lib/chat-media";

export const runtime = "nodejs";
const reply = (code: string, status: number) =>
  Response.json(
    { status: status === 200 ? "success" : "error", code },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  if (!uuid.safeParse(roomId).success) return reply("invalid", 400);
  if (!sameOrigin(request)) return reply("auth", 403);
  try {
    const { client, user } = await currentAccount();
    if (!client || !user) return reply("auth", 401);
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
      return reply("auth", 403);
    const caps = await client.rpc("chat_media_capabilities");
    if (caps.error || caps.data !== true) return reply("mediaUnavailable", 503);
    // Bound the actual request stream, including a chunked upload or a false Content-Length.
    const reader = request.body?.getReader();
    if (
      !reader ||
      !request.headers.get("content-type")?.startsWith("multipart/form-data;")
    )
      return reply("invalidImage", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_IMAGE_INPUT + 65536) {
        await reader.cancel();
        return reply("imageTooLarge", 413);
      }
      chunks.push(chunk.value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) return reply("invalidImage", 400);
    if (file.size > MAX_IMAGE_INPUT) return reply("imageTooLarge", 413);
    if (!validImageInput(file)) return reply("invalidImage", 400);
    let image;
    try {
      image = await prepareChatImage(new Uint8Array(await file.arrayBuffer()));
    } catch {
      return reply("invalidImage", 400);
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
      if (upload.error) return reply("mediaUnavailable", 503);
      const sent = await client.rpc("send_room_image", {
        p_room: roomId,
        p_path: path,
        p_width: image.info.width,
        p_height: image.info.height,
        p_bytes: image.data.byteLength,
      });
      if (sent.error) {
        return reply(
          sent.error.message.includes("slow_down") ? "rateLimit" : "failed",
          400,
        );
      }
      attached = true;
      return reply("saved", 200);
    } finally {
      if (!attached) {
        try {
          await storage.remove([path]);
        } catch {
          /* Bounded orphan; clean up through Storage API maintenance. */
        }
      }
    }
  } catch {
    return reply("failed", 400);
  }
}
