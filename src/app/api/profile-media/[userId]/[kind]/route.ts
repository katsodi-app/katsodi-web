import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { PROFILE_MEDIA_BUCKET, isMediaKind } from "@/lib/profile-media";
import { sanitizeStoredImage } from "@/lib/server/profile-media";

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
    const { client, user } = await currentAccount();
    if (!client || !user) return missing();
    const profile = await client
      .from("profiles")
      .select("avatar_path,banner_path")
      .eq("id", userId)
      .maybeSingle();
    const path =
      kind === "avatar" ? profile.data?.avatar_path : profile.data?.banner_path;
    if (profile.error || typeof path !== "string") return missing();
    const file = await client.storage.from(PROFILE_MEDIA_BUCKET).download(path);
    if (file.error || !file.data) return missing();
    const image = await sanitizeStoredImage(
      new Uint8Array(await file.data.arrayBuffer()),
      kind,
    );
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
