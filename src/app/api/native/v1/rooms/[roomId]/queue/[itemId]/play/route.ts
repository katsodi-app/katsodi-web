import { playFromQueue } from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/** Owner/moderator: make a queued link the room's source now. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string; itemId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId, itemId } = await params;
    const result = await playFromQueue(
      initialResult,
      formFrom({ room: roomId, item: itemId }),
    );
    return result.status === "success"
      ? nativeOk({ playing: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
