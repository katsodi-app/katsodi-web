import { voiceToken } from "@/lib/server/voice";
import { voiceAccess } from "@/lib/server/voice-access";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * A 60-second LiveKit token for the room's voice call, issued under exactly
 * the website's rules (verified active member, open room, worker healthy).
 * The identity is the caller's user id; the client cannot choose it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const allowed = await voiceAccess(roomId);
    if (allowed.status !== 200)
      return nativeError(
        allowed.code === "auth"
          ? "auth_required"
          : allowed.code === "unconfigured"
            ? "not_configured"
            : allowed.status === 404
              ? "not_found"
              : "access_denied",
        requestId,
      );
    return nativeOk(await voiceToken(roomId, allowed.user.id), requestId);
  });
}
