import { moderateRoom } from "@/lib/server/room-actions";
import { initialResult, uuid } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
  readJsonObject,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

const operations = ["kick", "promote", "demote", "leave", "close"];

/**
 * Room moderation, as on the website: `{ operation }` is kick, promote,
 * demote, leave (yourself) or close (the owner, on themself). The database
 * decides who may do what; a refusal is the action's error.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string; userId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId, userId } = await params;
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    if (
      !uuid.safeParse(roomId).success ||
      !uuid.safeParse(userId).success ||
      keys.length !== 1 ||
      typeof body.operation !== "string" ||
      !operations.includes(body.operation)
    )
      return nativeError("invalid_request", requestId);
    const result = await moderateRoom(
      initialResult,
      formFrom({ room: roomId, user: userId, operation: body.operation }),
    );
    return result.status === "success"
      ? nativeOk({ ok: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
