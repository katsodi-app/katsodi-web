import { uuid } from "@/lib/server/contracts";
import { roomPlayer } from "@/lib/server/room-player";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const headers = { "Cache-Control": "private, no-store" };
  const { roomId } = await params;
  if (!uuid.safeParse(roomId).success)
    return Response.json({ error: "unavailable" }, { status: 404, headers });
  try {
    const player = await roomPlayer(roomId);
    if (player === "auth")
      return Response.json({ error: "auth" }, { status: 401, headers });
    if (!player)
      return Response.json({ error: "unavailable" }, { status: 404, headers });
    return Response.json(player, { headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
