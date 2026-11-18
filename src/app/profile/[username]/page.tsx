import { ProfilePage, type PublicProfile } from "@/components/community-pages";
import { currentAccount } from "@/lib/supabase/server";
import { profileMediaState } from "@/lib/server/profile-media-state";
import { claimDailyXp } from "@/lib/server/progression";
import { loadProfile, usernamePattern } from "@/lib/server/public-profile";
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!usernamePattern.test(username)) return <ProfilePage profile={null} />;
  const { client, user } = await currentAccount();
  if (!client || !user) return <ProfilePage profile={null} />;
  await claimDailyXp(client);
  let profile: PublicProfile | null = null;
  try {
    const core = await loadProfile(client, username);
    if (core) {
      const { id, ...shown } = core;
      profile = { ...shown, media: await profileMediaState(client, id) };
    }
  } catch {
    profile = null;
  }
  return <ProfilePage profile={profile} />;
}
