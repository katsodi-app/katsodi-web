import { changeFriendship } from "@/lib/server/friend-actions";
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

/** `{ "operation": "remove" | "block" | "unblock" }` towards another person. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { userId } = await params;
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    if (
      keys.length !== 1 ||
      keys[0] !== "operation" ||
      !["remove", "block", "unblock"].includes(String(body.operation))
    )
      return nativeError("invalid_request", requestId);
    const result = await changeFriendship(
      initialResult,
      formFrom({ user: userId, operation: body.operation }),
    );
    return result.status === "success"
      ? nativeOk({ ok: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
