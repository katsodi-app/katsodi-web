import { mixQueue } from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * Music rooms, owner or moderator: mixes everyone's queued tracks into one
 * playlist, a track from each person in turn (each keeps their own order),
 * through the website's own action (mix_room_queue). No body.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const result = await mixQueue(initialResult, formFrom({ room: roomId }));
    return result.status === "success"
      ? nativeOk({ mixed: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
