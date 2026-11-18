import { openMusicRoom } from "@/lib/server/music-operations";
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
 * `{ "url", "title"?, "room"? }`: listen to a track in a room, as the
 * website's "Listen in a room": the caller's current music room (`room`,
 * as an active member) gets the track, otherwise a new private music room
 * is created. Answers `{ roomId }`.
 */
export async function POST(request: Request) {
  return nativeRoute(request, "required", async (requestId) => {
    const body = await readJsonObject(request);
    const allowed = ["url", "title", "room"];
    if (
      typeof body.url !== "string" ||
      Object.keys(body).some((key) => !allowed.includes(key))
    )
      return nativeError("invalid_request", requestId);
    const result = await openMusicRoom(
      formFrom({ url: body.url, title: body.title, room: body.room }),
    );
    return result.status === "opened"
      ? nativeOk({ roomId: result.roomId }, requestId, 201)
      : nativeError(actionErrorCode(result), requestId);
  });
}
