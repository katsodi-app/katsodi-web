import { createInvite } from "@/lib/server/room-actions";
import { appOrigin } from "@/lib/server/app-origin";
import { initialResult, uuid } from "@/lib/server/contracts";
import {
  actionErrorCode,
  formFrom,
  nativeError,
  nativeOk,
  nativeRoute,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * Owner: issues an invitation (ten uses, the database's expiry). The token
 * is returned once and only its hash is stored. `link` is the website's
 * join page when the public origin is configured, otherwise null.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    if (!uuid.safeParse(roomId).success)
      return nativeError("invalid_request", requestId);
    const result = await createInvite(
      initialResult,
      formFrom({ room: roomId }),
    );
    if (result.status !== "success" || !result.invite)
      return nativeError(actionErrorCode(result), requestId);
    const origin = appOrigin();
    return nativeOk(
      {
        invite: {
          id: result.invite.id,
          token: result.invite.token,
          link: origin ? `${origin}/join#${result.invite.token}` : null,
        },
      },
      requestId,
      201,
    );
  });
}
