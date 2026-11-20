import { storeProfile } from "@/lib/server/profile-store";
import {
  nativeError,
  nativeOk,
  nativeRoute,
  readJsonObject,
} from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * Saves the caller's profile: `{ "username", "displayName", "bio",
 * "fandoms": ["<fandom id>", …] }`, the same rules as the website's form.
 */
export async function POST(request: Request) {
  return nativeRoute(request, "required", async (requestId) => {
    const body = await readJsonObject(request);
    const code = await storeProfile({
      username: body.username,
      display_name: body.displayName,
      bio: body.bio ?? "",
      fandoms: body.fandoms ?? [],
    });
    if (code === "saved") return nativeOk({ saved: true }, requestId);
    // A taken @username is the usual failure the database reports.
    return nativeError(
      code === "auth"
        ? "auth_required"
        : code === "invalid"
          ? "invalid_request"
          : "conflict",
      requestId,
    );
  });
}
