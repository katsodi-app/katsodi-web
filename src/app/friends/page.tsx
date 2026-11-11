import { FriendsPage } from "@/components/community-pages";
import {
  FriendsWorkspace,
  type FriendsOverview,
} from "@/components/friends-workspace";
import { FriendsSignIn } from "@/components/friends-sign-in";
import { currentAccount } from "@/lib/supabase/server";
import { claimDailyXp } from "@/lib/server/progression";
export default async function Page() {
  const { client, user } = await currentAccount();
  // No backend: the design-only page explains that the service is coming.
  if (!client) return <FriendsPage />;
  if (!user) return <FriendsSignIn />;
  await claimDailyXp(client);
  const { data, error } = await client.rpc("friends_overview");
  // Friends migration not applied yet: keep the design-only page.
  if (error || !data || typeof data !== "object") return <FriendsPage />;
  const overview = data as FriendsOverview;
  const ids = [
    ...overview.friends,
    ...overview.incoming,
    ...overview.outgoing,
    ...overview.blocked,
  ].map((p) => ("user_id" in p ? p.user_id : p.id));
  const { data: profiles } = ids.length
    ? await client
        .from("profiles")
        .select("id,avatar_path,media_updated_at")
        .in("id", ids)
    : { data: [] };
  const withAvatar = <T extends { id: string; user_id?: string }>(
    person: T,
  ) => {
    const profile = profiles?.find(
      (p) => p.id === (person.user_id || person.id),
    );
    return {
      ...person,
      avatar: !!profile?.avatar_path,
      version: profile?.media_updated_at,
    };
  };
  return (
    <FriendsWorkspace
      overview={{
        friends: overview.friends.map(withAvatar),
        incoming: overview.incoming.map(withAvatar),
        outgoing: overview.outgoing.map(withAvatar),
        blocked: overview.blocked.map(withAvatar),
      }}
    />
  );
}
