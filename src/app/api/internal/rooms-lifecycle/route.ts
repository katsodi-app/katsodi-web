import { timingSafeEqual } from "node:crypto";
import { lifecycleConfig, runRoomLifecycle } from "@/lib/server/room-lifecycle";
export const runtime = "nodejs";

/**
 * Called by the trusted scheduler (every 30–60 s) with
 * `Authorization: Bearer <ROOMS_LIFECYCLE_SECRET or VOICE_WORKER_SECRET>`.
 */
export async function POST(request: Request) {
  const config = lifecycleConfig(),
    actual = Buffer.from(request.headers.get("authorization") || ""),
    expected = Buffer.from(`Bearer ${config?.secret || ""}`);
  const headers = { "Cache-Control": "no-store" };
  if (
    !config ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "auth" }, { status: 401, headers });
  try {
    return Response.json(await runRoomLifecycle(), { headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
