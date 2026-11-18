import { addToQueue } from "@/lib/server/room-actions";
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
 * Adds `{ "url": "…" }` to the room's queue through the website's own
 * action: the same link validation, limits (queue_full) and membership
 * checks in the database. Not idempotent; the client does not resend.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== "url")
      return nativeError("invalid_request", requestId);
    const result = await addToQueue(
      initialResult,
      formFrom({ room: roomId, url: body.url }),
    );
    return result.status === "success"
      ? nativeOk({ queued: true }, requestId, 201)
      : nativeError(actionErrorCode(result), requestId);
  });
}
