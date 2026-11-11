import { sameOrigin } from "@/lib/server/same-origin";
import { randomUUID } from "node:crypto";
import { currentAccount } from "@/lib/supabase/server";
import {
  PROFILE_IMAGE_TYPES,
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_INPUT,
  cropSchema,
  isMediaKind,
} from "@/lib/profile-media";
import { prepareProfileImage } from "@/lib/server/profile-media";

export const runtime = "nodejs";
const reply = (code: string, status: number) =>
  Response.json(
    { status: status === 200 ? "success" : "error", code },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );

/** Upload a cropped avatar or banner for the signed-in user. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply("auth", 403);
  try {
    const { client, user } = await currentAccount();
    if (!client || !user) return reply("auth", 401);
    // Bound the bytes actually read, whatever Content-Length claims.
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
      if (size > PROFILE_MEDIA_INPUT + 65536) {
        await reader.cancel();
        return reply("imageTooLarge", 413);
      }
      chunks.push(chunk.value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    const kind = form.get("kind"),
      file = form.get("image");
    let crop;
    try {
      crop = cropSchema.parse(JSON.parse(String(form.get("crop"))));
    } catch {
      return reply("invalid", 400);
    }
    if (!isMediaKind(kind) || !(file instanceof Blob))
      return reply("invalid", 400);
    if (file.size > PROFILE_MEDIA_INPUT) return reply("imageTooLarge", 413);
    if (!PROFILE_IMAGE_TYPES.includes(file.type))
      return reply("invalidImage", 400);
    let image;
    try {
      image = await prepareProfileImage(
        new Uint8Array(await file.arrayBuffer()),
        kind,
        crop,
      );
    } catch (error) {
      console.error(
        "[profile-media] image rejected:",
        (error as Error).message,
      );
      return reply("invalidImage", 400);
    }
    const path = `${user.id}/${kind}-${randomUUID()}.webp`;
    const storage = client.storage.from(PROFILE_MEDIA_BUCKET);
    let attached = false;
    try {
      const upload = await storage.upload(path, image.data, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "0",
      });
      if (upload.error) {
        console.error("[profile-media] upload failed:", upload.error.message);
        return reply("mediaUnavailable", 503);
      }
      const saved = await client.rpc("set_profile_media", {
        p_kind: kind,
        p_path: path,
      });
      if (saved.error)
        console.error(
          "[profile-media] set_profile_media failed:",
          saved.error.message,
        );
      if (saved.error)
        return reply(
          saved.error.message.includes("slow_down") ? "rateLimit" : "failed",
          400,
        );
      attached = true;
      if (typeof saved.data === "string")
        await storage.remove([saved.data]).catch(() => {});
      return reply("saved", 200);
    } finally {
      if (!attached) await storage.remove([path]).catch(() => {});
    }
  } catch (error) {
    console.error("[profile-media] upload error:", (error as Error).message);
    return reply("failed", 400);
  }
}

/** Remove the signed-in user's avatar or banner. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return reply("auth", 403);
  const kind = new URL(request.url).searchParams.get("kind");
  if (!isMediaKind(kind)) return reply("invalid", 400);
  try {
    const { client, user } = await currentAccount();
    if (!client || !user) return reply("auth", 401);
    const cleared = await client.rpc("clear_profile_media", { p_kind: kind });
    if (cleared.error) return reply("failed", 400);
    if (typeof cleared.data === "string")
      await client.storage
        .from(PROFILE_MEDIA_BUCKET)
        .remove([cleared.data])
        .catch(() => {});
    return reply("saved", 200);
  } catch {
    return reply("failed", 400);
  }
}
