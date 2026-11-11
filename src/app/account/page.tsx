import { currentAccount } from "@/lib/supabase/server";
import { profileMediaState } from "@/lib/server/profile-media-state";
import { claimDailyXp } from "@/lib/server/progression";
import { viewerIsAdmin } from "@/lib/server/community-fandoms";
import {
  AccountAccess,
  ProfileForm,
  type ProfileData,
} from "@/components/account-forms";
export default async function Page() {
  const { client, user, configured } = await currentAccount();
  if (!client || !user) return <AccountAccess configured={configured} />;
  await claimDailyXp(client);
  const [{ data: profile, error }, { data: followed }, media, admin] =
    await Promise.all([
      client
        .from("profiles")
        .select("username,display_name,bio,onboarding_completed")
        .eq("id", user.id)
        .single(),
      client.from("user_fandoms").select("fandom_id").eq("user_id", user.id),
      profileMediaState(client, user.id),
      viewerIsAdmin(),
    ]);
  if (error || !profile) return <AccountAccess configured={configured} error />;
  return (
    <ProfileForm
      profile={profile as ProfileData}
      followed={(followed || []).map((row) => String(row.fandom_id))}
      media={media}
      admin={admin}
    />
  );
}
