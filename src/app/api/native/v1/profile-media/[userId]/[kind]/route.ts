import { uuid } from "@/lib/server/contracts";
import { isMediaKind } from "@/lib/profile-media";
import { readProfileMedia } from "@/lib/server/profile-store";
import {
  nativeError,
  nativeHeaders,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * Someone's avatar or banner (WebP) for a caller allowed to see the profile
 * (themselves or a roommate). Missing and forbidden look the same.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string; kind: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { userId, kind } = await params;
    if (!uuid.safeParse(userId).success || !isMediaKind(kind))
      return nativeError("not_found", requestId);
    const image = await readProfileMedia(userId, kind);
    if (!image) return nativeError("not_found", requestId);
    return new Response(new Uint8Array(image), {
      headers: {
        ...nativeHeaders(requestId),
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
