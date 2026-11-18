import { redeemInviteToken } from "@/lib/server/invite-operations";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
  readJsonObject,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/** Redeems `{ token }` (the part after /join#) and returns `{ roomId }`. */
export async function POST(request: Request) {
  return nativeRoute(request, "required", async (requestId) => {
    const body = await readJsonObject(request);
    if (Object.keys(body).length !== 1 || typeof body.token !== "string")
      return nativeError("invalid_request", requestId);
    const result = await redeemInviteToken(formFrom({ token: body.token }));
    return result.status === "redeemed"
      ? nativeOk({ roomId: result.roomId }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
