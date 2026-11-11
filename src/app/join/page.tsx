import { currentAccount } from "@/lib/supabase/server";
import { JoinInvitation } from "@/components/network-rooms";
export default async function Page() {
  const { configured, user } = await currentAccount();
  return <JoinInvitation configured={configured} signedIn={!!user} />;
}
