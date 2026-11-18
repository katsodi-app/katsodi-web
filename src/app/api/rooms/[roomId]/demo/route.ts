import { sameOrigin } from "@/lib/server/same-origin";
import { siteEmbedding } from "@/lib/server/site-embed";
import { demoAccess, demoGrant } from "@/lib/server/demo-access";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

/**
 * Whether the current demo's link can open inside Katsodi (the sharer's
 * in-app mode) or must be shared as a separate window.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const allowed = await demoAccess((await params).roomId);
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

/** A short-lived LiveKit token for the demo SFU room (see demoGrant). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  if (!sameOrigin(request))
    return Response.json({ error: "access" }, { status: 403, headers });
  try {
    const roomId = (await params).roomId;
    const allowed = await demoAccess(roomId);
    if (allowed.status !== 200)
      return Response.json(
        { error: allowed.error },
        { status: allowed.status, headers },
      );
    const grant = await demoGrant(roomId, allowed);
    if (grant.status !== "ok")
      return Response.json({ error: "unconfigured" }, { status: 503, headers });
    return Response.json(
      {
        url: grant.url,
        token: grant.token,
        publish: grant.publish,
        host: grant.host,
      },
      { headers },
    );
  } catch {
    return Response.json({ error: "network" }, { status: 503, headers });
  }
}
