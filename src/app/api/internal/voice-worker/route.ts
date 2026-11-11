import { timingSafeEqual } from "node:crypto";
import { drainVoiceRevocations, voiceConfig } from "@/lib/server/voice";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const config = voiceConfig(),
    actual = Buffer.from(request.headers.get("authorization") || ""),
    expected = Buffer.from(`Bearer ${config?.worker || ""}`);
  const headers = { "Cache-Control": "no-store" };
  if (
    !config ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "auth" }, { status: 401, headers });
  try {
    await drainVoiceRevocations();
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
