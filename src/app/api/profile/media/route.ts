import { sameOrigin } from "@/lib/server/same-origin";
import { currentAccount } from "@/lib/supabase/server";
import {
  PROFILE_IMAGE_TYPES,
  PROFILE_MEDIA_INPUT,
  cropSchema,
  isMediaKind,
} from "@/lib/profile-media";
import {
  clearProfileMedia,
  storeProfileMedia,
  type ProfileCode,
} from "@/lib/server/profile-store";

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
    const code = await storeProfileMedia(
      kind,
      new Uint8Array(await file.arrayBuffer()),
      crop,
    );
    const status: Record<ProfileCode, number> = {
      saved: 200,
      auth: 401,
      invalid: 400,
      invalidImage: 400,
      mediaUnavailable: 503,
      rateLimit: 400,
      failed: 400,
    };
    return reply(code, status[code]);
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
  const { user } = await currentAccount();
  if (!user) return reply("auth", 401);
  const code = await clearProfileMedia(kind);
  return reply(code, code === "saved" ? 200 : code === "auth" ? 401 : 400);
}
