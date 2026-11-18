import { z } from "zod";
import { currentAccount } from "@/lib/supabase/server";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

const profile = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  username: z.string(),
  avatar_path: z.string().nullable().optional(),
});

/** The signed-in, e-mail-confirmed account and its own profile. */
export async function GET(request: Request) {
  return nativeRoute(request, "required", async (requestId) => {
    const { client, user } = await currentAccount();
    if (!client) return nativeError("not_configured", requestId);
    if (!user) return nativeError("auth_required", requestId);
    const result = await client
      .from("profiles")
      .select("id,display_name,username,avatar_path")
      .eq("id", user.id)
      .maybeSingle();
    if (result.error) return nativeError("unavailable", requestId);
    const parsed = profile.safeParse(result.data);
    return nativeOk(
      {
        id: user.id,
        email: user.email ?? null,
        profile: parsed.success
          ? {
              displayName: parsed.data.display_name,
              username: parsed.data.username,
              hasAvatar: !!parsed.data.avatar_path,
            }
          : null,
      },
      requestId,
    );
  });
}
