import { removeFromQueue } from "@/lib/server/room-actions";
import { initialResult, uuid } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * Removes a queued link. The database lets the person who queued it and
 * the room's hosts remove it; anyone else gets the same denial as a
 * missing item.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string; itemId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId, itemId } = await params;
    if (!uuid.safeParse(roomId).success)
      return nativeError("invalid_request", requestId);
    const result = await removeFromQueue(
      initialResult,
      formFrom({ item: itemId }),
    );
    return result.status === "success"
      ? nativeOk({ removed: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
