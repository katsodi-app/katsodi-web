import "server-only";
import { categories, type Category } from "@/lib/fandoms";
import type { currentAccount } from "@/lib/supabase/server";
import type { Progress } from "@/lib/progression";
import { profileProgress } from "./progression";

type Client = NonNullable<Awaited<ReturnType<typeof currentAccount>>["client"]>;

export type ProfileCore = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  created_at?: string;
  fandoms: string[];
  /** Community fandoms (not in the static catalogue) keep their names. */
  communityFandoms: { id: string; name: string; category: Category }[];
  progress: Progress | null;
};

export const usernamePattern = /^[a-z][a-z0-9_]{2,23}$/;

/**
 * A profile as the caller may see it (RLS: yourself or someone you share an
 * active room with; otherwise missing and forbidden look the same: null).
 * Shared by the website's profile page and the native API.
 */
export async function loadProfile(
  client: Client,
  username: string,
): Promise<ProfileCore | null> {
  if (!usernamePattern.test(username)) return null;
  const { data, error } = await client
    .from("profiles")
    .select("id,username,display_name,bio,created_at")
    .eq("username", username)
    .maybeSingle();
  if (error || !data) return null;
  const [fandoms, progress] = await Promise.all([
    client
      .from("user_fandoms")
      .select("fandom_id, fandoms(name, category, community)")
      .eq("user_id", data.id),
    profileProgress(client, data.id),
  ]);
  return {
    id: data.id,
    username: data.username,
    display_name: data.display_name,
    bio: data.bio,
    created_at: data.created_at,
    progress,
    fandoms: fandoms.error
      ? []
      : (fandoms.data || []).map((row) => String(row.fandom_id)),
    communityFandoms: fandoms.error ? [] : communityNames(fandoms.data || []),
  };
}

function communityNames(
  rows: { fandom_id: unknown; fandoms: unknown }[],
): { id: string; name: string; category: Category }[] {
  return rows.flatMap((row) => {
    const joined = Array.isArray(row.fandoms) ? row.fandoms[0] : row.fandoms;
    const fandom = joined as {
      name?: unknown;
      category?: unknown;
      community?: unknown;
    } | null;
    return fandom?.community === true &&
      typeof fandom.name === "string" &&
      (categories as readonly unknown[]).includes(fandom.category)
      ? [
          {
            id: String(row.fandom_id),
            name: fandom.name,
            category: fandom.category as Category,
          },
        ]
      : [];
  });
}
