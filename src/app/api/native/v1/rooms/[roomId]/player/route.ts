import { uuid } from "@/lib/server/contracts";
import { roomPlayer } from "@/lib/server/room-player";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * How the room's source plays, as for the website's room player: an
 * embeddable iframe (Spotify, VK with its export code or the server's VK
 * lookup, discovered players), a video file, or "external". The desktop app
 * shows Spotify and VK embeds; each person plays them on their own.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    if (!uuid.safeParse(roomId).success)
      return nativeError("not_found", requestId);
    const player = await roomPlayer(roomId);
    if (player === "auth") return nativeError("auth_required", requestId);
    if (!player) return nativeError("not_found", requestId);
    return nativeOk({ player }, requestId);
  });
}
