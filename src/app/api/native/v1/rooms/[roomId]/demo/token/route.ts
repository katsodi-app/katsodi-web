import { demoAccess, demoGrant } from "@/lib/server/demo-access";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * `{ url, token, publish, host }` for the room's demo SFU room, by the same
 * rules as the website (demoGrant): only the presenter of the current
 * accepted demo may publish a screen; every active member may watch. The
 * token lives 60 s; the client asks again for every connection attempt.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const allowed = await demoAccess(roomId);
    if (allowed.status === 401) return nativeError("auth_required", requestId);
    if (allowed.status !== 200) return nativeError("access_denied", requestId);
    if (!allowed.demo || allowed.demo.status === "pending")
      return nativeError("conflict", requestId);
    const grant = await demoGrant(roomId, allowed);
    if (grant.status !== "ok") return nativeError("not_configured", requestId);
    return nativeOk(
      {
        url: grant.url,
        token: grant.token,
        publish: grant.publish,
        host: grant.host,
      },
      requestId,
    );
  });
}
