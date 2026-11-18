import { pingRoomOccupancy } from "@/lib/server/room-actions";
import { initialResult } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/** Keeps the room counted as occupied while the client shows it. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const result = await pingRoomOccupancy(
      initialResult,
      formFrom({ room: roomId }),
    );
    return result.status === "success"
      ? nativeOk({ ok: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
