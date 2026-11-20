import { uuid } from "@/lib/server/contracts";
import { roomSource } from "@/lib/server/room-player";
import { resolvePlayer } from "@/lib/server/player-resolver";
import { mediaDetails } from "@/lib/server/media-details";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * How the room's source plays, as for the website's room player: an
 * embeddable iframe (Spotify, VK with its export code or the server's VK
 * lookup, discovered players), a video file, or "external". The desktop app
 * shows Spotify and VK embeds; each person plays them on their own.
 * `details`: title, author, cover and provider of what plays (or null).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    if (!uuid.safeParse(roomId).success)
      return nativeError("not_found", requestId);
    const url = await roomSource(roomId);
    if (url === "auth") return nativeError("auth_required", requestId);
    if (url === null) return nativeError("not_found", requestId);
    // The player and the "now playing" details (oEmbed), as the website shows.
    const [player, details] = await Promise.all([
      resolvePlayer(url),
      mediaDetails(url).catch(() => null),
    ]);
    return nativeOk({ player, details }, requestId);
  });
}
