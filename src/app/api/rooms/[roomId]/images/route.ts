import { sameOrigin } from "@/lib/server/same-origin";
import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import {
  storeChatImage,
  type ImageUploadCode,
} from "@/lib/server/chat-image-store";
import { MAX_IMAGE_INPUT, validImageInput } from "@/lib/chat-media";

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
    // Anonymous requests stop before anything is read.
    const { user } = await currentAccount();
    if (!user) return reply("auth", 401);
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
    const code = await storeChatImage(
      roomId,
      new Uint8Array(await file.arrayBuffer()),
    );
    const status: Record<ImageUploadCode, number> = {
      saved: 200,
      auth: 403,
      invalidImage: 400,
      mediaUnavailable: 503,
      rateLimit: 400,
      failed: 400,
    };
    return reply(code, status[code]);
  } catch {
    return reply("failed", 400);
  }
}
