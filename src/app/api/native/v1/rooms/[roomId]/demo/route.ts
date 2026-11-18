import { requestDemo, stopDemo } from "@/lib/server/room-actions";
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
 * `{ "url": "…" }`: posts the link to the chat and asks to demo it, through
 * the website's action. A host's own request starts at once; a member's
 * waits for an owner or moderator. Another demo in progress is `demo_busy`.
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
    const result = await requestDemo(
      initialResult,
      formFrom({ room: roomId, url: body.url }),
    );
    return result.status === "success"
      ? nativeOk({ requested: true }, requestId, 201)
      : nativeError(actionErrorCode(result), requestId);
  });
}

/** The sharer or a host ends the demo, or the author withdraws a request. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const result = await stopDemo(initialResult, formFrom({ room: roomId }));
    return result.status === "success"
      ? nativeOk({ stopped: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
