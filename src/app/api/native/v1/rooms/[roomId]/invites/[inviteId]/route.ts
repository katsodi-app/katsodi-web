import { revokeInvite } from "@/lib/server/room-actions";
import { initialResult, uuid } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/** Owner: revokes an invitation. The database checks ownership. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string; inviteId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId, inviteId } = await params;
    if (!uuid.safeParse(roomId).success)
      return nativeError("invalid_request", requestId);
    const result = await revokeInvite(
      initialResult,
      formFrom({ invite: inviteId }),
    );
    return result.status === "success"
      ? nativeOk({ revoked: true }, requestId)
      : nativeError(actionErrorCode(result), requestId);
  });
}
