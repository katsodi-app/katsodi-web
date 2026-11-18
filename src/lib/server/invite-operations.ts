import "server-only";
import { currentAccount } from "@/lib/supabase/server";
import { inviteTokenSchema, uuid, type ActionResult } from "./contracts";

/**
 * Redeems a room invitation token for the signed-in caller. Shared by the
 * website's action (which then redirects to the room) and the native API.
 */
export async function redeemInviteToken(
  form: FormData,
): Promise<{ status: "redeemed"; roomId: string } | ActionResult> {
  const token = inviteTokenSchema.safeParse(form.get("token"));
  if (!token.success) return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  try {
    const { data, error } = await client.rpc("redeem_room_invite", {
      p_token: token.data,
    });
    const id = uuid.safeParse(data);
    if (error || !id.success) return { status: "error", code: "failed" };
    return { status: "redeemed", roomId: id.data };
  } catch {
    return { status: "error", code: "failed" };
  }
}
