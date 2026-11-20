import { uuid } from "@/lib/server/contracts";
import { readChatImage } from "@/lib/server/chat-image-store";
import {
  nativeError,
  nativeHeaders,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * The image of a chat message (WebP), for a member of its room. Missing and
 * forbidden look the same.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { messageId } = await params;
    if (!uuid.safeParse(messageId).success)
      return nativeError("not_found", requestId);
    const image = await readChatImage(messageId);
    if (!image) return nativeError("not_found", requestId);
    return new Response(new Uint8Array(image), {
      headers: {
        ...nativeHeaders(requestId),
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
