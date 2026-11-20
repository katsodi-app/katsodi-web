import {
  PROFILE_IMAGE_TYPES,
  PROFILE_MEDIA_INPUT,
  cropSchema,
  isMediaKind,
} from "@/lib/profile-media";
import {
  clearProfileMedia,
  storeProfileMedia,
} from "@/lib/server/profile-store";
import {
  nativeError,
  nativeOk,
  nativeRoute,
  type NativeErrorCode,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

const CODE: Record<string, NativeErrorCode> = {
  auth: "auth_required",
  invalid: "invalid_request",
  invalidImage: "invalid_request",
  mediaUnavailable: "unavailable",
  rateLimit: "rate_limited",
  failed: "server_error",
};

/**
 * A new avatar or banner: the body is the image (JPEG, PNG or WebP within
 * the website's limit), the crop is `?x=&y=&width=&height=` in fractions of
 * the upright image, as the website's cropper sends it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { kind } = await params;
    if (!isMediaKind(kind)) return nativeError("not_found", requestId);
    const query = new URL(request.url).searchParams;
    const crop = cropSchema.safeParse({
      x: Number(query.get("x")),
      y: Number(query.get("y")),
      width: Number(query.get("width")),
      height: Number(query.get("height")),
    });
    const type = (request.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!crop.success || !PROFILE_IMAGE_TYPES.includes(type))
      return nativeError("invalid_request", requestId);
    // Bound the bytes actually read, whatever Content-Length claims.
    const reader = request.body?.getReader();
    if (!reader) return nativeError("invalid_request", requestId);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > PROFILE_MEDIA_INPUT) {
        await reader.cancel();
        return nativeError("invalid_request", requestId);
      }
      chunks.push(chunk.value);
    }
    if (!size) return nativeError("invalid_request", requestId);
    const code = await storeProfileMedia(
      kind,
      new Uint8Array(Buffer.concat(chunks)),
      crop.data,
    );
    return code === "saved"
      ? nativeOk({ saved: true }, requestId)
      : nativeError(CODE[code] ?? "server_error", requestId);
  });
}

/** Removes the caller's avatar or banner. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { kind } = await params;
    if (!isMediaKind(kind)) return nativeError("not_found", requestId);
    const code = await clearProfileMedia(kind);
    return code === "saved"
      ? nativeOk({ saved: true }, requestId)
      : nativeError(CODE[code] ?? "server_error", requestId);
  });
}
