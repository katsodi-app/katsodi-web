import { updatePlayback } from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
  readJsonObject,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * Publishes the room's shared play/pause/position:
 * `{ "source": "<current url>", "state": "playing" | "paused", "position": s }`.
 * The website's own action validates it; the database checks the caller's
 * owner/moderator role, that `source` is still the room's source and the
 * rate limit. Returns the stored playback state.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const body = await readJsonObject(request);
    const keys = Object.keys(body).sort().join(",");
    if (
      keys !== "position,source,state" ||
      typeof body.position !== "number"
    )
      return nativeError("invalid_request", requestId);
    const result = await updatePlayback(
      initialResult,
      formFrom({
        room: roomId,
        source: body.source,
        state: body.state,
        position: String(body.position),
      }),
    );
    return result.status === "success"
      ? nativeOk({ playback: result.playback ?? null }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
