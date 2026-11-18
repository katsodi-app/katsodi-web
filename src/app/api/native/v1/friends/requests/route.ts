import { sendFriendRequest } from "@/lib/server/friend-actions";
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
 * `{ "username": "@name" }`: a friend request through the website's action.
 * `outcome` is "sent", "friends" (they had asked you), "already" or
 * "unavailable" (no such person, or they cannot be asked): the same
 * answers the website shows, never more.
 */
export async function POST(request: Request) {
  return nativeRoute(request, "required", async (requestId) => {
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== "username")
      return nativeError("invalid_request", requestId);
    const result = await sendFriendRequest(
      initialResult,
      formFrom({ username: body.username }),
    );
    return result.status === "success"
      ? nativeOk({ outcome: result.friend ?? "unavailable" }, requestId, 201)
      : nativeError(actionErrorCode(result), requestId);
  });
}
