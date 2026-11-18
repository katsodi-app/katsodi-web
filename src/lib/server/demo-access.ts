import "server-only";
import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { demoToken, voiceConfig } from "@/lib/server/voice";
import { demoCurrent, demoRecord } from "@/lib/demo";

/**
 * The caller's role and the room's current link demo, for active members of
 * an open room only. Shared by the website's demo route and the native API.
 */
export async function demoAccess(roomId: string) {
  if (!uuid.safeParse(roomId).success)
    return { status: 404, error: "access" } as const;
  const { client, user } = await currentAccount();
  if (!client || !user) return { status: 401, error: "auth" } as const;
  const [room, member, demo] = await Promise.all([
    client.from("rooms").select("closed_at").eq("id", roomId).maybeSingle(),
    client
      .from("room_members")
      .select("role")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    client.from("room_demos").select("*").eq("room_id", roomId).maybeSingle(),
  ]);
  if (
    room.error ||
    member.error ||
    !room.data ||
    room.data.closed_at ||
    !member.data
  )
    return { status: 403, error: "access" } as const;
  const parsed = demoRecord.nullable().safeParse(demo.data);
  const current =
    !demo.error && parsed.success && parsed.data && demoCurrent(parsed.data)
      ? parsed.data
      : null;
  return {
    status: 200,
    client,
    user,
    host: ["owner", "moderator"].includes(member.data.role),
    demo: current,
  } as const;
}

export type DemoGrant =
  | {
      status: "ok";
      url: string;
      token: string;
      publish: boolean;
      host: boolean;
    }
  | { status: "unconfigured" };

/**
 * A short-lived LiveKit token for the demo SFU room. Only the sharer of the
 * current accepted demo may publish a screen; only hosts (and the presenter,
 * or everyone while a host opened annotations) may send drawing data;
 * everyone watches. Requires a healthy revocation worker.
 */
export async function demoGrant(
  roomId: string,
  allowed: Extract<Awaited<ReturnType<typeof demoAccess>>, { status: 200 }>,
): Promise<DemoGrant> {
  if (!voiceConfig()) return { status: "unconfigured" };
  const ready = await allowed.client.rpc("voice_worker_ready", {
    p_room: roomId,
  });
  if (ready.error || ready.data !== true) return { status: "unconfigured" };
  const running = !!allowed.demo && allowed.demo.status !== "pending";
  const publish = running && allowed.demo!.user_id === allowed.user.id;
  const data =
    allowed.host ||
    publish ||
    (running && allowed.demo!.annotations_open === true);
  return {
    status: "ok",
    ...(await demoToken(roomId, allowed.user.id, { publish, data })),
    publish,
    host: allowed.host,
  };
}
