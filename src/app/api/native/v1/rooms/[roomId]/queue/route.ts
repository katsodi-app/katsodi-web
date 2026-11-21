import { addToQueue, importToQueue } from "@/lib/server/room-actions";
import { classifyLink } from "@/lib/music-links";
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
 * Adds `{ "url": "…" }` to the room's queue through the website's own
 * action: the same link validation, limits (queue_full) and membership
 * checks in the database. A playlist or album link (Spotify, YouTube,
 * SoundCloud) goes in track by track, as in the website's music rooms
 * (`imported`: added, found, capped). Not idempotent; the client does not
 * resend.
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
    const form = formFrom({ room: roomId, url: body.url });
    const link = typeof body.url === "string" ? classifyLink(body.url) : null;
    const playlist = !!link && link.kind !== "single";
    const result = playlist
      ? await importToQueue(initialResult, form)
      : await addToQueue(initialResult, form);
    if (result.status !== "success")
      return nativeError(actionErrorCode(result), requestId);
    return nativeOk(
      playlist && "imported" in result && result.imported
        ? { queued: true, imported: result.imported }
        : { queued: true },
      requestId,
      201,
    );
  });
}
