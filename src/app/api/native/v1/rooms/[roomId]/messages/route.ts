import { sendMessage, sendSticker } from "@/lib/server/room-actions";
import { initialResult, type ActionResult } from "@/lib/server/contracts";
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
 * Posts `{ "body": "…" }` or `{ "sticker": "<id>" }` as the caller. The
 * database checks membership, rate limits and closure. Not idempotent: the
 * client keeps the text and lets the user retry instead of resending.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const body = await readJsonObject(request);
    const keys = Object.keys(body);
    let result: ActionResult;
    if (keys.length === 1 && keys[0] === "body")
      result = await sendMessage(
        initialResult,
        formFrom({ room: roomId, body: body.body }),
      );
    else if (keys.length === 1 && keys[0] === "sticker")
      result = await sendSticker(
        initialResult,
        formFrom({ room: roomId, sticker: body.sticker }),
      );
    else return nativeError("invalid_request", requestId);
    return result.status === "success"
      ? nativeOk({ sent: true }, requestId, 201)
      : nativeError(actionErrorCode(result), requestId);
  });
}
