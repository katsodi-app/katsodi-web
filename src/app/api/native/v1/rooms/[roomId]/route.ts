import { roomSnapshot } from "@/lib/server/network-data";
import { uuid } from "@/lib/server/contracts";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * The room as the caller may see it: the same authorized snapshot the
 * website polls. `?after=<message id>` returns only newer messages when that
 * message is still in the window, otherwise the full recent window.
 * Missing and hidden rooms are both 404.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "optional", async (requestId) => {
    const { roomId } = await params;
    if (!uuid.safeParse(roomId).success)
      return nativeError("not_found", requestId);
    const raw = new URL(request.url).searchParams.get("after");
    const after = raw === null ? undefined : uuid.safeParse(raw);
    if (after && !after.success)
      return nativeError("invalid_request", requestId);
    const snapshot = await roomSnapshot(roomId, after?.data);
    if (!snapshot) return nativeError("not_found", requestId);
    return nativeOk(
      { serverTime: new Date().toISOString(), ...snapshot },
      requestId,
    );
  });
}
