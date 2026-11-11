import { currentAccount } from "@/lib/supabase/server";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const { client, user } = await currentAccount();
  if (!client || !user) return Response.json(null, { headers });
  const { data, error } = await client
    .from("profiles")
    .select("display_name,avatar_path,media_updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return Response.json(null, { headers });
  return Response.json(
    {
      id: user.id,
      name: data.display_name,
      available: !!data.avatar_path,
      version: data.media_updated_at,
    },
    { headers },
  );
}
