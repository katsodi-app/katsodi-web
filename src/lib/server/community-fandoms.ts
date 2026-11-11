import "server-only";
import { z } from "zod";
import { currentAccount } from "@/lib/supabase/server";
import {
  adminAccountRecord,
  communityFandomRecord,
  fandomRequestRecord,
  isCommunityFandom,
  type AdminAccount,
  type CommunityFandom,
  type FandomRequest,
} from "@/lib/community-fandoms";

const columns = "id,name,category,description,created_at";

/** Fandoms approved from requests; empty without the migration or backend. */
export async function communityFandoms(): Promise<CommunityFandom[]> {
  try {
    const { client } = await currentAccount();
    if (!client) return [];
    const result = await client
      .from("fandoms")
      .select(columns)
      .eq("community", true)
      .order("created_at", { ascending: true })
      .limit(500)
      .abortSignal(AbortSignal.timeout(5000));
    const parsed = communityFandomRecord.array().safeParse(result.data);
    return result.error || !parsed.success ? [] : parsed.data;
  } catch {
    return [];
  }
}

export async function communityFandom(
  id: string,
): Promise<CommunityFandom | null> {
  if (!isCommunityFandom(id)) return null;
  try {
    const { client } = await currentAccount();
    if (!client) return null;
    const result = await client
      .from("fandoms")
      .select(columns)
      .eq("id", id)
      .eq("community", true)
      .maybeSingle();
    const parsed = communityFandomRecord.nullable().safeParse(result.data);
    return result.error || !parsed.success ? null : parsed.data;
  } catch {
    return null;
  }
}

const requestColumns =
  "id,user_id,name,category,note,status,reason,fandom_id,created_at,decided_at";

/** The signed-in member's own requests, newest first (RLS limits the rows). */
export async function myFandomRequests(): Promise<
  | { status: "signed-out" | "unconfigured" | "unavailable" }
  | { status: "ready"; requests: FandomRequest[] }
> {
  const { client, user, configured } = await currentAccount();
  if (!configured || !client) return { status: "unconfigured" };
  if (!user) return { status: "signed-out" };
  const result = await client
    .from("fandom_requests")
    .select(requestColumns)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const parsed = fandomRequestRecord.array().safeParse(result.data);
  if (result.error || !parsed.success) return { status: "unavailable" };
  return { status: "ready", requests: parsed.data };
}

export type AdminState = {
  accounts: AdminAccount[];
  requests: FandomRequest[];
  followers: Record<string, number>;
  community: CommunityFandom[];
};

/**
 * Everything the admin panel shows, or null for anyone who is not the
 * administrator (the database decides; the page then answers 404).
 */
export async function adminState(): Promise<AdminState | null> {
  const { client, user } = await currentAccount();
  if (!client || !user) return null;
  const admin = await client.rpc("is_admin");
  if (admin.error || admin.data !== true) return null;
  const [accounts, requests, followers, community] = await Promise.all([
    client.rpc("admin_accounts"),
    client
      .from("fandom_requests")
      .select(requestColumns)
      .order("created_at", { ascending: false })
      .limit(500),
    client.rpc("admin_fandom_followers"),
    communityFandoms(),
  ]);
  const parsedAccounts = adminAccountRecord.array().safeParse(accounts.data);
  const parsedRequests = fandomRequestRecord.array().safeParse(requests.data);
  const parsedFollowers = z
    .array(z.object({ fandom_id: z.string(), followers: z.coerce.number() }))
    .safeParse(followers.data);
  return {
    accounts: parsedAccounts.success ? parsedAccounts.data : [],
    requests: parsedRequests.success ? parsedRequests.data : [],
    followers: parsedFollowers.success
      ? Object.fromEntries(
          parsedFollowers.data.map((row) => [row.fandom_id, row.followers]),
        )
      : {},
    community,
  };
}

/** Whether the signed-in user is the administrator (for showing the link). */
export async function viewerIsAdmin(): Promise<boolean> {
  try {
    const { client, user } = await currentAccount();
    if (!client || !user) return false;
    const result = await client.rpc("is_admin");
    return !result.error && result.data === true;
  } catch {
    return false;
  }
}
