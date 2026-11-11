import "server-only";
import type { currentAccount } from "@/lib/supabase/server";
import { progressSchema, type Progress } from "../progression";

type Client = NonNullable<Awaited<ReturnType<typeof currentAccount>>["client"]>;

/** Daily login reward; idempotent per UTC day, silent without the migration. */
export async function claimDailyXp(client: Client) {
  try {
    await client.rpc("claim_daily_xp");
  } catch {
    /* Progression is optional. */
  }
}

/** Level and achievements of a profile the caller may see, or null. */
export async function profileProgress(
  client: Client,
  userId: string,
): Promise<Progress | null> {
  try {
    const { data, error } = await client.rpc("profile_progress", {
      p_user: userId,
    });
    if (error || !data) return null;
    const parsed = progressSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
