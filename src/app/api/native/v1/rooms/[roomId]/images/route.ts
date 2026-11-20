import { uuid } from "@/lib/server/contracts";
import { storeChatImage } from "@/lib/server/chat-image-store";
import { IMAGE_TYPES, MAX_IMAGE_INPUT } from "@/lib/chat-media";
import {
  nativeError,
  nativeOk,
  nativeRoute,
  type NativeErrorCode,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

const CODE: Record<string, NativeErrorCode> = {
  auth: "access_denied",
  invalidImage: "invalid_request",
  mediaUnavailable: "unavailable",
  rateLimit: "rate_limited",
  failed: "server_error",
};

/**
 * Sends an image to the room's chat: the body is the image itself
 * (Content-Type image/jpeg, image/png or image/webp, at most 2 MiB). The
 * server re-encodes it as WebP, as for the website; membership, closure and
 * rate limits are checked by the database.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    if (!uuid.safeParse(roomId).success)
      return nativeError("invalid_request", requestId);
    const type = (request.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!IMAGE_TYPES.includes(type))
      return nativeError("invalid_request", requestId);
    // Bound the actual stream, including a chunked upload or a false Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return nativeError("invalid_request", requestId);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_IMAGE_INPUT) {
        await reader.cancel();
        return nativeError("invalid_request", requestId);
      }
      chunks.push(chunk.value);
    }
    if (!size) return nativeError("invalid_request", requestId);
    const code = await storeChatImage(
      roomId,
      new Uint8Array(Buffer.concat(chunks)),
    );
    return code === "saved"
      ? nativeOk({ sent: true }, requestId, 201)
      : nativeError(CODE[code] ?? "server_error", requestId);
  });
}
