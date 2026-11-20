import { uuid } from "@/lib/server/contracts";
import { isMediaKind } from "@/lib/profile-media";
import { readProfileMedia } from "@/lib/server/profile-store";

export const runtime = "nodejs";
const missing = () =>
  new Response(null, {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });

/**
 * Serves an avatar or banner to people allowed to see the profile (RLS:
 * yourself or a roommate). Missing and forbidden look the same.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string; kind: string }> },
) {
  const { userId, kind } = await params;
  if (!uuid.safeParse(userId).success || !isMediaKind(kind)) return missing();
  try {
    const image = await readProfileMedia(userId, kind);
    if (!image) return missing();
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        // URLs carry a version, so a short private cache is safe.
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${kind}.webp"`,
      },
    });
  } catch {
    return missing();
  }
}
