import {
  cancelFriendRequest,
  respondFriendRequest,
} from "@/lib/server/friend-actions";
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

type Params = { params: Promise<{ requestId: string }> };

/** `{ "accept": true | false }` for a request someone sent you. */
export async function POST(request: Request, { params }: Params) {
  return nativeRoute(request, "required", async (requestId) => {
    const { requestId: id } = await params;
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    if (
      keys.length !== 1 ||
      keys[0] !== "accept" ||
      typeof body.accept !== "boolean"
    )
      return nativeError("invalid_request", requestId);
    const result = await respondFriendRequest(
      initialResult,
      formFrom({ request: id, accept: body.accept ? "true" : "false" }),
    );
    return result.status === "success"
      ? nativeOk({ ok: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}

/** Withdraws a request you sent. */
export async function DELETE(request: Request, { params }: Params) {
  return nativeRoute(request, "required", async (requestId) => {
    const { requestId: id } = await params;
    const result = await cancelFriendRequest(
      initialResult,
      formFrom({ request: id }),
    );
    return result.status === "success"
      ? nativeOk({ ok: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
