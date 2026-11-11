import { categories, type Category } from "@/lib/fandoms";
import { ProfilePage, type PublicProfile } from "@/components/community-pages";
import { currentAccount } from "@/lib/supabase/server";
import { profileMediaState } from "@/lib/server/profile-media-state";
import { claimDailyXp, profileProgress } from "@/lib/server/progression";
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(username))
    return <ProfilePage profile={null} />;
  const { client, user } = await currentAccount();
  if (!client || !user) return <ProfilePage profile={null} />;
  await claimDailyXp(client);
  let profile: PublicProfile | null = null;
  try {
    // RLS: yourself or someone you share an active room with; otherwise
    // missing and forbidden look the same.
    const { data, error } = await client
      .from("profiles")
      .select("id,username,display_name,bio,created_at")
      .eq("username", username)
      .maybeSingle();
    if (!error && data) {
      const [media, fandoms, progress] = await Promise.all([
        profileMediaState(client, data.id),
        client
          .from("user_fandoms")
          .select("fandom_id, fandoms(name, category, community)")
          .eq("user_id", data.id),
        profileProgress(client, data.id),
      ]);
      profile = {
        username: data.username,
        display_name: data.display_name,
        bio: data.bio,
        created_at: data.created_at,
        media,
        progress,
        fandoms: fandoms.error
          ? []
          : (fandoms.data || []).map((row) => String(row.fandom_id)),
        communityFandoms: fandoms.error
          ? []
          : communityNames(fandoms.data || []),
      };
    }
  } catch {
    profile = null;
  }
  return <ProfilePage profile={profile} />;
}

/** Community fandoms (Task 8) are not in the static catalogue: keep their names. */
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
