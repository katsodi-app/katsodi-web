import { currentAccount } from "@/lib/supabase/server";
import { networkRoomRecord } from "@/lib/server/network-data";
import { createRoom } from "@/lib/server/room-operations";
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
 * Open shared rooms, newest first (at most 50), as the website's catalogue
 * shows them: guests see public rooms only; RLS decides what a signed-in
 * account may read.
 */
export async function GET(request: Request) {
  return nativeRoute(request, "optional", async (requestId) => {
    const { client, user } = await currentAccount();
    if (!client) return nativeError("not_configured", requestId);
    let query = client
      .from("rooms")
      .select("*")
      .is("closed_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!user) query = query.eq("visibility", "public");
    const { data, error } = await query;
    const parsed = networkRoomRecord.array().safeParse(data);
    if (error || !parsed.success) return nativeError("unavailable", requestId);
    return nativeOk({ rooms: parsed.data, signedIn: !!user }, requestId);
  });
}

const CREATE_FIELDS = [
  "name",
  "description",
  "format",
  "visibility",
  "url",
  "art",
  "fandomId",
  "import",
];

/**
 * Creates a shared room. Body: { name, description, format, visibility,
 * url, art, fandomId?, import? } with the same limits as the website.
 * Not idempotent: the client must not resend after an ambiguous failure.
 */
export async function POST(request: Request) {
  return nativeRoute(request, "required", async (requestId) => {
    const body = await readJsonObject(request);
    if (Object.keys(body).some((key) => !CREATE_FIELDS.includes(key)))
      return nativeError("invalid_request", requestId);
    const result = await createRoom(formFrom(body));
    if (result.status === "created")
      return nativeOk(
        { id: result.id, importFailed: result.importFailed },
        requestId,
        201,
      );
    return nativeError(actionErrorCode(result), requestId);
  });
}
