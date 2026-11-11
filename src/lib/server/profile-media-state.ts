import "server-only";
import type { currentAccount } from "@/lib/supabase/server";
import type { ProfileMediaState } from "@/components/profile-media-editor";

type Client = NonNullable<Awaited<ReturnType<typeof currentAccount>>["client"]>;

/**
 * Avatar/banner presence for a profile the caller may see (RLS), or null
 * when the profile-media migration is not applied yet.
 */
export async function profileMediaState(
  client: Client,
  userId: string,
): Promise<ProfileMediaState | null> {
  const { data, error } = await client
    .from("profiles")
    .select("avatar_path,banner_path,media_updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId,
    avatar: typeof data.avatar_path === "string",
    banner: typeof data.banner_path === "string",
    version:
      typeof data.media_updated_at === "string" ? data.media_updated_at : null,
  };
}
