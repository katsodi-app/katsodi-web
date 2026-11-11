import "server-only";
import { currentAccount } from "@/lib/supabase/server";
import { networkRoomRecord } from "./network-data";
import type { FandomRoomsResult } from "@/components/fandom-connections";
export async function publicFandomRooms(
  id: string,
): Promise<FandomRoomsResult> {
  const { client } = await currentAccount();
  if (!client) return { status: "unconfigured", rooms: [] };
  try {
    // Explicit visibility filter also excludes the signed-in owner's private rooms.
    const result = await client
      .from("rooms")
      .select("*")
      .eq("fandom_id", id)
      .eq("visibility", "public")
      .is("closed_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .abortSignal(AbortSignal.timeout(5000));
    const parsed = networkRoomRecord.array().safeParse(result.data);
    if (result.error || !parsed.success) return { status: "failed", rooms: [] };
    return { status: "ready", rooms: parsed.data };
  } catch {
    return { status: "failed", rooms: [] };
  }
}
