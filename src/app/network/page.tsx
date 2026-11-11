import { currentAccount } from "@/lib/supabase/server";
import { networkRoomRecord, type NetworkRoom } from "@/lib/server/network-data";
import { NetworkCatalog } from "@/components/network-rooms";
export default async function Page() {
  const { client, user, configured } = await currentAccount();
  if (!client)
    return <NetworkCatalog rooms={[]} configured={false} signedIn={false} />;
  let rooms: NetworkRoom[] = [];
  let failed = false;
  try {
    let query = client
      .from("rooms")
      .select("*")
      .is("closed_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!user) query = query.eq("visibility", "public");
    const { data, error } = await query;
    const parsed = networkRoomRecord.array().safeParse(data);
    rooms = parsed.success ? parsed.data : [];
    failed = !!error || !parsed.success;
  } catch {
    failed = true;
  }
  return (
    <NetworkCatalog
      rooms={rooms}
      configured={configured}
      signedIn={!!user}
      error={failed}
    />
  );
}
