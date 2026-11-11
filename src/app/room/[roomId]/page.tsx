import { RoomScreen } from "@/components/room-screen";
import { roomSnapshot } from "@/lib/server/network-data";
import { uuid } from "@/lib/server/contracts";
import { SharedRoom } from "@/components/network-rooms";
import { supabaseConfig } from "@/lib/supabase/config";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ import?: string }>;
}) {
  const { roomId } = await params;
  if (uuid.safeParse(roomId).success && supabaseConfig()) {
    const snapshot = await roomSnapshot(roomId);
    if (snapshot)
      return (
        <SharedRoom
          initial={snapshot}
          creationImportFailed={(await searchParams).import === "failed"}
        />
      );
    // A UUID can also be an existing local draft. RLS-protected server data is
    // never sent to this fallback; its badge and content stay explicitly local.
  }
  return <RoomScreen id={roomId} />;
}
