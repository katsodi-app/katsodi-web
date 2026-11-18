import { sameOrigin } from "@/lib/server/same-origin";
import { voiceToken } from "@/lib/server/voice";
import { voiceAccess } from "@/lib/server/voice-access";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const access = voiceAccess;
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
