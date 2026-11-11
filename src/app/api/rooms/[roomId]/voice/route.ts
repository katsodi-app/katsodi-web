import { sameOrigin } from "@/lib/server/same-origin";
import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { voiceConfig, voiceToken } from "@/lib/server/voice";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
async function access(roomId: string) {
  if (!uuid.safeParse(roomId).success)
    return { status: 404, code: "access" } as const;
  const { client, user } = await currentAccount();
  if (!client || !user) return { status: 401, code: "auth" } as const;
  const [room, member] = await Promise.all([
    client.from("rooms").select("id,closed_at").eq("id", roomId).maybeSingle(),
    client
      .from("room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (
    room.error ||
    member.error ||
    !room.data ||
    room.data.closed_at ||
    !member.data
  )
    return { status: 403, code: "access" } as const;
  if (!voiceConfig()) return { status: 503, code: "unconfigured" } as const;
  const ready = await client.rpc("voice_worker_ready", { p_room: roomId });
  if (ready.error || ready.data !== true)
    return { status: 503, code: "unconfigured" } as const;
  return { status: 200, user } as const;
}
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const allowed = await access((await params).roomId);
    return Response.json(
      allowed.status === 200 ? { ready: true } : { error: allowed.code },
      { status: allowed.status, headers },
    );
  } catch {
    return Response.json({ error: "network" }, { status: 503, headers });
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  if (!sameOrigin(request))
    return Response.json({ error: "access" }, { status: 403, headers });
  try {
    const { roomId } = await params,
      allowed = await access(roomId);
    if (allowed.status !== 200)
      return Response.json(
        { error: allowed.code },
        { status: allowed.status, headers },
      );
    return Response.json(await voiceToken(roomId, allowed.user.id), {
      headers,
    });
  } catch {
    return Response.json({ error: "network" }, { status: 503, headers });
  }
}
