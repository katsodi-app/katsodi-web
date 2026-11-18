import { z } from "zod";
import { currentAccount } from "@/lib/supabase/server";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
export const runtime = "nodejs";

const person = z.object({
  id: z.string().uuid(),
  username: z.string(),
  display_name: z.string(),
  since: z.string().optional(),
});
const request = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  username: z.string(),
  display_name: z.string(),
  created_at: z.string(),
});
const overview = z.object({
  friends: z.array(person),
  incoming: z.array(request),
  outgoing: z.array(request),
  blocked: z.array(person),
});

/**
 * The caller's friends, requests both ways and blocked people: the same
 * friends_overview RPC as the website's friends page. 503 until the
 * friends migration is applied.
 */
export async function GET(request_: Request) {
  return nativeRoute(request_, "required", async (requestId) => {
    const { client, user } = await currentAccount();
    if (!client) return nativeError("not_configured", requestId);
    if (!user) return nativeError("auth_required", requestId);
    const { data, error } = await client.rpc("friends_overview");
    const parsed = overview.safeParse(data);
    if (error || !parsed.success) return nativeError("unavailable", requestId);
    return nativeOk(parsed.data, requestId);
  });
}
