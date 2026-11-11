import { sameOrigin } from "@/lib/server/same-origin";
import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { demoToken, voiceConfig } from "@/lib/server/voice";
import { siteEmbedding } from "@/lib/server/site-embed";
import { demoCurrent, demoRecord } from "@/lib/demo";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

/** The caller's role and the room's current demo, for active members only. */
async function access(roomId: string) {
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

/**
 * Whether the current demo's link can open inside Katsodi (the sharer's
 * in-app mode) or must be shared as a separate window.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const allowed = await access((await params).roomId);
    if (allowed.status !== 200)
      return Response.json(
        { error: allowed.error },
        { status: allowed.status, headers },
      );
    if (!allowed.demo) return Response.json({ demo: null }, { headers });
    return Response.json(
      {
        demo: {
          url: allowed.demo.url,
          ...(await siteEmbedding(allowed.demo.url)),
        },
      },
      { headers },
    );
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}

/**
 * A short-lived LiveKit token for the demo SFU room. Only the sharer of the
 * current accepted demo may publish a screen; only hosts may send drawing
 * and click hints; everyone watches. Requires a healthy revocation worker.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  if (!sameOrigin(request))
    return Response.json({ error: "access" }, { status: 403, headers });
  try {
    const roomId = (await params).roomId;
    const allowed = await access(roomId);
    if (allowed.status !== 200)
      return Response.json(
        { error: allowed.error },
        { status: allowed.status, headers },
      );
    if (!voiceConfig())
      return Response.json({ error: "unconfigured" }, { status: 503, headers });
    const ready = await allowed.client.rpc("voice_worker_ready", {
      p_room: roomId,
    });
    if (ready.error || ready.data !== true)
      return Response.json({ error: "unconfigured" }, { status: 503, headers });
    const running = !!allowed.demo && allowed.demo.status !== "pending";
    const publish = running && allowed.demo!.user_id === allowed.user.id;
    // Annotations (Task 3.2): hosts and the presenter always; everyone else
    // only while a host has opened annotations.
    const data =
      allowed.host ||
      publish ||
      (running && allowed.demo!.annotations_open === true);
    return Response.json(
      {
        ...(await demoToken(roomId, allowed.user.id, { publish, data })),
        publish,
        host: allowed.host,
      },
      { headers },
    );
  } catch {
    return Response.json({ error: "network" }, { status: 503, headers });
  }
}
