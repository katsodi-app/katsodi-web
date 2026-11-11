import { currentAccount } from "@/lib/supabase/server";
import { ProfileForm, type ProfileData } from "@/components/account-forms";
import { OnboardingWelcome } from "@/components/community-pages";
export default async function Page() {
  const { client, user, configured } = await currentAccount();
  if (!client || !user) return <OnboardingWelcome configured={configured} />;
  let data: ProfileData | null = null;
  let interests: string[] = [];
  try {
    const [profile, followed] = await Promise.all([
      client
        .from("profiles")
        .select("username,display_name,bio,onboarding_completed")
        .eq("id", user.id)
        .single(),
      client.from("user_fandoms").select("fandom_id").eq("user_id", user.id),
    ]);
    if (!profile.error && profile.data && !followed.error) {
      data = profile.data as ProfileData;
      interests = (followed.data || []).map((item) => String(item.fandom_id));
    }
  } catch {
    data = null;
  }
  return data ? (
    <ProfileForm profile={data} followed={interests} onboarding />
  ) : (
    <OnboardingWelcome configured={configured} error />
  );
}
