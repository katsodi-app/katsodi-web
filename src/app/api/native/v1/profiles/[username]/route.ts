import { currentAccount } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/server/public-profile";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

/**
 * A profile the caller may see (yourself or someone you share an active
 * room with), as on the website: name, bio, level and achievements,
 * fandoms. Missing and hidden are both 404.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { username } = await params;
    const { client, user } = await currentAccount();
    if (!client) return nativeError("not_configured", requestId);
    if (!user) return nativeError("auth_required", requestId);
    const profile = await loadProfile(client, username.toLowerCase());
    if (!profile) return nativeError("not_found", requestId);
    return nativeOk({ ...profile, self: profile.id === user.id }, requestId);
  });
}
