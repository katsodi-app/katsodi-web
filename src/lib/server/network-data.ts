import "server-only";
import { z } from "zod";
import { currentViewer } from "@/lib/supabase/server";
import { deleteBrowserSession, hyperbeamKey, safeEmbedUrl } from "./hyperbeam";
import { voiceConfig } from "./voice";
import { demoCurrent, demoRecord, type RoomDemo } from "@/lib/demo";
export type { RoomDemo } from "@/lib/demo";
import { playbackSchema, syncSource, type PlaybackState } from "@/lib/playback";
export const networkRoomRecord = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  format: z.enum(["video", "music"]),
  visibility: z.enum(["public", "private"]),
  url: z.string(),
  art: z.enum(["orbit", "wave", "moon", "sun"]),
  closed_at: z.string().nullable(),
  created_at: z.string(),
  fandom_id: z.string().nullable().optional(),
  source_updated_at: z.string().nullable().optional(),
  // Room lifecycle (migration 2000); absent before it is applied.
  last_occupied_at: z.string().nullable().optional(),
  inactive_at: z.string().nullable().optional(),
});
const memberRecord = z.object({
  user_id: z.string(),
  role: z.enum(["owner", "moderator", "member"]),
  status: z.string(),
});
const messageRecord = z.object({
  id: z.string(),
  sender_id: z.string(),
  body: z.string(),
  created_at: z.string(),
  kind: z.enum(["text", "sticker", "image"]).default("text"),
  sticker_id: z.string().nullable().optional(),
  image_width: z.number().nullable().optional(),
  image_height: z.number().nullable().optional(),
});
const profileRecord = z.object({
  id: z.string(),
  display_name: z.string(),
  username: z.string(),
  avatar_path: z.string().nullable().optional(),
  media_updated_at: z.string().nullable().optional(),
});
export const inviteRecord = z.object({
  id: z.string(),
  expires_at: z.string(),
  max_uses: z.number(),
  uses: z.number(),
  revoked_at: z.string().nullable(),
});
export type InviteMeta = z.infer<typeof inviteRecord>;
export type NetworkRoom = z.infer<typeof networkRoomRecord>;
export type RoomMessage = z.infer<typeof messageRecord>;
export const queueRecord = z.object({
  id: z.string().uuid(),
  url: z.string(),
  added_by: z.string().nullable(),
  created_at: z.string(),
});
export type QueueItem = z.infer<typeof queueRecord>;
export type RoomSnapshot = {
  room: NetworkRoom;
  userId: string | null;
  joined: boolean;
  mediaEnabled?: boolean;
  members: z.infer<typeof memberRecord>[];
  /** Full rows. In a delta response, only messages newer than `after`. */
  messages: RoomMessage[];
  /** Present only in a delta response: the ordered ids of the current window. */
  messageIds?: string[];
  profiles: z.infer<typeof profileRecord>[];
  invites: InviteMeta[];
  /**
   * Shared YouTube timeline: undefined when sync is unavailable (not a
   * YouTube source, or the playback migration is not applied), null when no
   * one has started playback for the current source yet.
   */
  playback?: PlaybackState | null;
  /** Links waiting to play; undefined when the queue migration is absent. */
  queue?: QueueItem[];
  /**
   * Shared browser: undefined when Hyperbeam is not configured or the
   * migration is absent; null when no session is running.
   */
  browser?: SharedBrowser | null;
  /**
   * Room website: undefined when the site migration is absent; null when
   * no website is set.
   */
  site?: RoomSite | null;
  /**
   * Link demo: undefined when voice (LiveKit) is not configured or the demo
   * migration is absent; null when there is no current request or demo.
   */
  demo?: RoomDemo | null;
};
export const roomSiteRecord = z.object({
  url: z.string().url(),
  updated_at: z.string(),
});
export type RoomSite = z.infer<typeof roomSiteRecord>;
export const sharedBrowserRecord = z.object({
  embed_url: z.string().url(),
  current_url: z.string().nullable(),
  started_at: z.string(),
});
export type SharedBrowser = z.infer<typeof sharedBrowserRecord>;
const MESSAGE_WINDOW = 100;
async function roomQueue(
  client: NonNullable<Awaited<ReturnType<typeof currentViewer>>["client"]>,
  id: string,
  format: NetworkRoom["format"],
): Promise<QueueItem[] | undefined> {
  const result = await client
    .from("room_queue")
    .select("id,url,added_by,created_at")
    .eq("room_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(format === "music" ? 300 : 50);
  if (result.error) return undefined;
  const parsed = z.array(queueRecord).safeParse(result.data);
  return parsed.success ? parsed.data : undefined;
}
async function roomBrowser(
  client: NonNullable<Awaited<ReturnType<typeof currentViewer>>["client"]>,
  id: string,
): Promise<SharedBrowser | null | undefined> {
  if (!hyperbeamKey()) return undefined;
  // A kick, a host losing rights or closing the room revoked the session:
  // a remaining member's refresh claims it once and ends it at Hyperbeam.
  const revoked = await client.rpc("claim_room_browser_revocation", {
    p_room: id,
  });
  if (revoked.error) return undefined;
  if (typeof revoked.data === "string")
    await deleteBrowserSession(revoked.data).catch(() => {});
  const result = await client.rpc("get_room_browser", { p_room: id });
  if (result.error) return undefined;
  const parsed = sharedBrowserRecord.nullable().safeParse(result.data);
  return parsed.success && (!parsed.data || safeEmbedUrl(parsed.data.embed_url))
    ? parsed.data
    : undefined;
}
async function roomSite(
  client: NonNullable<Awaited<ReturnType<typeof currentViewer>>["client"]>,
  id: string,
): Promise<RoomSite | null | undefined> {
  const result = await client
    .from("room_sites")
    .select("url,updated_at")
    .eq("room_id", id)
    .maybeSingle();
  if (result.error) return undefined;
  const parsed = roomSiteRecord.nullable().safeParse(result.data);
  return parsed.success ? parsed.data : undefined;
}
async function roomDemo(
  client: NonNullable<Awaited<ReturnType<typeof currentViewer>>["client"]>,
  id: string,
): Promise<RoomDemo | null | undefined> {
  if (!voiceConfig()) return undefined;
  const result = await client
    .from("room_demos")
    .select("*")
    .eq("room_id", id)
    .maybeSingle();
  if (result.error) return undefined;
  const parsed = demoRecord.nullable().safeParse(result.data);
  if (!parsed.success) return undefined;
  // Expired requests and demos whose sharer went silent are over.
  return parsed.data && demoCurrent(parsed.data) ? parsed.data : null;
}
/** Reads the shared timeline only for sources that can be synchronized. */
async function roomPlayback(
  client: NonNullable<Awaited<ReturnType<typeof currentViewer>>["client"]>,
  id: string,
  url: string,
): Promise<PlaybackState | null | undefined> {
  if (!syncSource(url)) return undefined;
  const result = await client.rpc("get_room_playback", { p_room: id });
  if (result.error) return undefined;
  const playback = playbackSchema.nullable().safeParse(result.data);
  return playback.success ? playback.data : undefined;
}
/**
 * Room state for the polling client. With `after` (the newest message id the
 * client already has), only the id window and newer full rows are returned, so
 * an idle room costs a single index scan instead of re-sending 100 messages.
 * The id window also carries deletions to the client.
 */
async function roomMessages(
  client: NonNullable<Awaited<ReturnType<typeof currentViewer>>["client"]>,
  id: string,
  after?: string,
): Promise<Pick<RoomSnapshot, "messages" | "messageIds">> {
  const latest = (columns: string) =>
    client
      .from("room_messages")
      .select(columns)
      .eq("room_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(MESSAGE_WINDOW);
  if (after) {
    const window = await latest("id");
    if (window.error) throw new Error("room_unavailable");
    const ids = z
      .array(z.object({ id: z.string() }))
      .parse(window.data)
      .map((row) => row.id);
    const known = ids.indexOf(after);
    if (known !== -1) {
      const fresh = ids.slice(0, known);
      const rows = fresh.length
        ? await client.from("room_messages").select("*").in("id", fresh)
        : { data: [], error: null };
      if (rows.error) throw new Error("room_unavailable");
      const byId = new Map(
        z
          .array(messageRecord)
          .parse(rows.data)
          .map((message) => [message.id, message]),
      );
      return {
        messages: fresh
          .reverse()
          .flatMap((messageId) => byId.get(messageId) ?? []),
        messageIds: ids.reverse(),
      };
    }
  }
  const full = await latest("*");
  if (full.error) throw new Error("room_unavailable");
  return { messages: z.array(messageRecord).parse(full.data).reverse() };
}
export async function roomSnapshot(
  id: string,
  after?: string,
): Promise<RoomSnapshot | null> {
  const { client, userId } = await currentViewer();
  if (!client) return null;
  let roomQuery = client.from("rooms").select("*").eq("id", id);
  if (!userId)
    roomQuery = roomQuery.eq("visibility", "public").is("closed_at", null);
  const roomResult = await roomQuery.maybeSingle();
  const room = networkRoomRecord.safeParse(roomResult.data);
  if (roomResult.error || !room.success) return null;
  const outside = {
    room: room.data,
    userId,
    joined: false,
    members: [],
    messages: [],
    profiles: [],
    invites: [],
  };
  if (!userId) return outside;
  const membership = await client
    .from("room_members")
    .select("user_id,role,status")
    .eq("room_id", id)
    .eq("status", "active");
  if (membership.error) throw new Error("membership_unavailable");
  const members = z.array(memberRecord).parse(membership.data);
  if (!members.some((m) => m.user_id === userId)) return outside;
  const [chat, profilesResult, playback, queue, browser, site, demo] =
    await Promise.all([
      roomMessages(client, id, after),
      client
        .from("profiles")
        .select("*")
        .in(
          "id",
          members.map((m) => m.user_id),
        ),
      roomPlayback(client, id, room.data.url),
      roomQueue(client, id, room.data.format),
      roomBrowser(client, id),
      roomSite(client, id),
      roomDemo(client, id),
    ]);
  if (profilesResult.error) throw new Error("room_unavailable");
  const inviteResult =
    room.data.owner_id === userId
      ? await client
          .from("room_invites")
          .select("id,expires_at,max_uses,uses,revoked_at")
          .eq("room_id", id)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(20)
      : null;
  if (inviteResult?.error) throw new Error("invites_unavailable");
  const capabilities = await client.rpc("chat_media_capabilities");
  return {
    room: room.data,
    userId,
    joined: true,
    mediaEnabled: !capabilities.error && capabilities.data === true,
    invites: inviteResult ? inviteRecord.array().parse(inviteResult.data) : [],
    members,
    ...chat,
    profiles: z.array(profileRecord).parse(profilesResult.data),
    ...(playback !== undefined ? { playback } : {}),
    ...(queue !== undefined ? { queue } : {}),
    ...(browser !== undefined ? { browser } : {}),
    ...(site !== undefined ? { site } : {}),
    ...(demo !== undefined ? { demo } : {}),
  };
}
