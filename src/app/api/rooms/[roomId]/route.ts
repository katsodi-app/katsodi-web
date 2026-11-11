import { roomSnapshot } from "@/lib/server/network-data";
import { uuid } from "@/lib/server/contracts";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  // Newest message the client already has; unknown or invalid ids fall back
  // to a full snapshot.
  const after = uuid.safeParse(new URL(request.url).searchParams.get("after"));
  if (!uuid.safeParse(roomId).success)
    return Response.json(
      { error: "unavailable" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const snapshot = await roomSnapshot(
      roomId,
      after.success ? after.data : undefined,
    );
    return Response.json(snapshot || { error: "unavailable" }, {
      status: snapshot ? 200 : 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
