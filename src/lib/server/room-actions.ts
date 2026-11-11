"use server";
import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentAccount } from "@/lib/supabase/server";
import { isStickerId, CHAT_IMAGE_BUCKET } from "@/lib/chat-media";
import { embedCodeSource, inspectSource } from "@/lib/providers";
import { playbackSchema, syncSource } from "@/lib/playback";
import { resolveImport, type ImportResult } from "./playlist-import";
import {
  serverRoomSchema,
  uuid,
  messageSchema,
  inviteTokenSchema,
  type ActionResult,
} from "./contracts";

type RpcArgs = Record<string, string | number | boolean | string[]>;
export async function updateRoomSource(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room")),
    raw = form.get("url"),
    url = typeof raw === "string" ? embedCodeSource(raw) : null;
  if (!id.success || url === null || (url && !inspectSource(url)))
    return { status: "error", code: "invalid" };
  const result = await mutate("set_room_source", {
    p_room: id.data,
    p_url: url.trim(),
  });
  if (result.status === "success") revalidatePath(`/room/${id.data}`);
  return result;
}
/**
 * Keeps the room occupied while its page is open (Task 3.1, migration 2000).
 * Errors are ignored: the room simply counts as empty without the migration.
 */
export async function pingRoomOccupancy(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room"));
  if (!id.success) return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client || !user) return { status: "error", code: "auth" };
  const { error } = await client.rpc("room_occupancy_ping", {
    p_room: id.data,
  });
  return error
    ? { status: "error", code: "failed" }
    : { status: "success", code: "saved" };
}
/**
 * Posts a link to the chat and asks to demo it. A host's own request starts
 * at once; a member's waits for an owner/moderator (migration 1800).
 */
export async function requestDemo(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room")),
    raw = form.get("url"),
    source = typeof raw === "string" ? inspectSource(raw.trim()) : null;
  if (!id.success || !source) return { status: "error", code: "invalid" };
  const result = await mutate("request_room_demo", {
    p_room: id.data,
    p_url: source.url,
  });
  if (result.status === "success") revalidatePath(`/room/${id.data}`);
  return result;
}
/** Hosts accept (accept=1) or decline (accept=0) a waiting demo request. */
export async function decideDemo(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room")),
    accept = form.get("accept");
  if (!id.success || (accept !== "1" && accept !== "0"))
    return { status: "error", code: "invalid" };
  return mutate("decide_room_demo", {
    p_room: id.data,
    p_accept: accept === "1",
  });
}
/** Hosts pause (paused=1) or resume (paused=0) a running demo. */
export async function pauseDemo(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room")),
    paused = form.get("paused");
  if (!id.success || (paused !== "1" && paused !== "0"))
    return { status: "error", code: "invalid" };
  return mutate("pause_room_demo", {
    p_room: id.data,
    p_paused: paused === "1",
  });
}
/** Hosts let everyone annotate (open=1) or only hosts and the presenter. */
export async function setDemoAnnotations(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room")),
    open = form.get("open");
  if (!id.success || (open !== "1" && open !== "0"))
    return { status: "error", code: "invalid" };
  return mutate("set_demo_annotations", {
    p_room: id.data,
    p_open: open === "1",
  });
}
/** The sharer or a host ends the demo, or the author withdraws a request. */
export async function stopDemo(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room"));
  if (!id.success) return { status: "error", code: "invalid" };
  return mutate("stop_room_demo", { p_room: id.data });
}
/** The sharer's client confirms its running demo every ~20 seconds. */
export async function beatDemo(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room"));
  if (!id.success) return { status: "error", code: "invalid" };
  return mutate("beat_room_demo", { p_room: id.data });
}
/**
 * Sets or clears (empty url) the room website. The database checks the
 * caller is an owner/moderator of an open room and throttles changes.
 */
export async function updateRoomSite(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room")),
    raw = form.get("url"),
    url = typeof raw === "string" ? raw.trim() : null;
  if (!id.success || url === null || (url && !inspectSource(url)))
    return { status: "error", code: "invalid" };
  const result = await mutate("set_room_site", {
    p_room: id.data,
    p_url: url ? inspectSource(url)!.url : "",
  });
  if (result.status === "success") revalidatePath(`/room/${id.data}`);
  return result;
}
/**
 * Publishes the shared play/pause/position for a YouTube room source. The
 * database checks the caller's owner/moderator role, the current source and
 * the rate limit; the client never supplies identity or timestamps.
 */
export async function updatePlayback(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room")),
    source = form.get("source"),
    state = form.get("state"),
    position = Number(form.get("position"));
  if (
    !room.success ||
    typeof source !== "string" ||
    !syncSource(source) ||
    (state !== "playing" && state !== "paused") ||
    !Number.isFinite(position) ||
    position < 0 ||
    position > 172800
  )
    return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  try {
    const { data, error } = await client.rpc("set_room_playback", {
      p_room: room.data,
      p_source: source,
      p_state: state,
      p_position: Math.round(position * 1000) / 1000,
    });
    if (error)
      return {
        status: "error",
        code:
          error.code === "PGRST202"
            ? "mediaUnavailable"
            : error.message.includes("slow_down")
              ? "rateLimit"
              : "failed",
      };
    const playback = playbackSchema.nullable().safeParse(data);
    return {
      status: "success",
      code: "saved",
      playback: playback.success ? playback.data : null,
    };
  } catch {
    return { status: "error", code: "failed" };
  }
}
/** Any active member may queue a link the room could show. */
export async function addToQueue(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room")),
    url = form.get("url");
  const source = typeof url === "string" ? inspectSource(url) : null;
  if (!room.success || !source) return { status: "error", code: "invalid" };
  return mutate("add_room_queue", {
    p_room: room.data,
    p_url: (url as string).trim(),
  });
}
export async function removeFromQueue(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const item = uuid.safeParse(form.get("item"));
  if (!item.success) return { status: "error", code: "invalid" };
  return mutate("remove_room_queue", { p_item: item.data });
}
/** Owner/moderator: play a queued item, or the oldest one without "item". */
export async function playFromQueue(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room")),
    rawItem = form.get("item"),
    item = rawItem ? uuid.safeParse(rawItem) : null;
  if (!room.success || (item && !item.success))
    return { status: "error", code: "invalid" };
  const result = await mutate("play_room_queue", {
    p_room: room.data,
    ...(item?.success ? { p_item: item.data } : {}),
  });
  if (result.status === "success") revalidatePath(`/room/${room.data}`);
  return result;
}
/**
 * Music rooms: queue a pasted playlist or track (public links only, see
 * playlist-import). Any member; the database keeps what fits in the queue.
 */
export async function importToQueue(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room")),
    url = form.get("url");
  if (!room.success || typeof url !== "string" || url.length > 2048)
    return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  try {
    // Authorize before spending provider quota; SQL rechecks on insertion.
    const roomResult = await client
      .from("rooms")
      .select("format,closed_at")
      .eq("id", room.data)
      .maybeSingle();
    const membership = await client
      .from("room_members")
      .select("user_id")
      .eq("room_id", room.data)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (
      roomResult.error ||
      membership.error ||
      !roomResult.data ||
      roomResult.data.closed_at ||
      !membership.data
    )
      return { status: "error", code: "failed" };
    if (roomResult.data.format !== "music")
      return { status: "error", code: "musicOnly" };
    const found = await resolveImport(url);
    if (found.status === "error") return importFailure(found);
    const { data, error } = await client.rpc("add_room_queue_many", {
      p_room: room.data,
      p_urls: found.urls,
    });
    if (error)
      return {
        status: "error",
        code: error.message.includes("slow_down")
          ? "rateLimit"
          : error.message.includes("queue_full")
            ? "queueFull"
            : error.message.includes("music_only")
              ? "musicOnly"
              : error.code === "PGRST202"
                ? "mediaUnavailable"
                : "failed",
      };
    return {
      status: "success",
      code: "imported",
      service: found.source,
      imported: {
        added: Number(data) || 0,
        found: found.urls.length,
        capped: found.capped,
      },
    };
  } catch {
    return { status: "error", code: "failed" };
  }
}
function importFailure(
  found: Extract<ImportResult, { status: "error" }>,
): ActionResult {
  return {
    status: "error",
    service: found.service,
    code:
      found.code === "unconfigured"
        ? "importUnconfigured"
        : found.code === "notFound"
          ? "importNotFound"
          : found.code === "empty"
            ? "importEmpty"
            : found.code === "unsupported"
              ? "importUnsupported"
              : "failed",
  };
}
/** Music rooms, owners/moderators: interleave everyone's queued tracks. */
export async function mixQueue(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room"));
  if (!room.success) return { status: "error", code: "invalid" };
  return mutate("mix_room_queue", { p_room: room.data });
}
async function mutate(name: string, args: RpcArgs): Promise<ActionResult> {
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  try {
    const { error } = await client.rpc(name, args);
    if (error)
      return {
        status: "error",
        code:
          error.code === "PGRST202"
            ? "mediaUnavailable"
            : error.message.includes("slow_down")
              ? "rateLimit"
              : error.message.includes("queue_full")
                ? "queueFull"
                : error.message.includes("demo_busy")
                  ? "demoBusy"
                  : error.message.includes("demo_unavailable")
                    ? "demoUnavailable"
                    : "failed",
      };
    return { status: "success", code: "saved" };
  } catch {
    return { status: "error", code: "failed" };
  }
}
export async function createNetworkRoom(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  const parsed = serverRoomSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { status: "error", code: "invalid" };
  const importUrl = form.get("import");
  let playlist: Extract<ImportResult, { status: "ok" }> | null = null;
  if (parsed.data.format === "music" && importUrl !== null) {
    if (typeof importUrl !== "string" || importUrl.length > 2048)
      return { status: "error", code: "invalid" };
    const found = await resolveImport(importUrl);
    if (found.status === "error") return importFailure(found);
    playlist = found;
  }
  let id: string;
  try {
    const r = parsed.data;
    const { data, error } = await client.rpc("create_room", {
      p_name: r.name,
      p_description: r.description,
      p_format: r.format,
      p_visibility: r.visibility,
      p_url: r.url,
      p_art: r.art,
      p_fandom_id: r.fandomId || null,
    });
    if (error || !uuid.safeParse(data).success)
      return { status: "error", code: "failed" };
    id = data;
  } catch {
    return { status: "error", code: "failed" };
  }
  let importFailed = false;
  if (playlist) {
    try {
      const queued = await client.rpc("add_room_queue_many", {
        p_room: id,
        p_urls: playlist.urls,
      });
      importFailed = !!queued.error || !(Number(queued.data) > 0);
    } catch {
      importFailed = true;
    }
  }
  revalidatePath("/network");
  if (parsed.data.fandomId) revalidatePath(`/fandoms/${parsed.data.fandomId}`);
  redirect(`/room/${id}${importFailed ? "?import=failed" : ""}`);
}
export async function joinNetworkRoom(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room"));
  if (!id.success) return { status: "error", code: "invalid" };
  const result = await mutate("join_room", { p_room: id.data });
  revalidatePath(`/room/${id.data}`);
  return result;
}
export async function sendMessage(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room")),
    body = messageSchema.safeParse(form.get("body"));
  if (!id.success || !body.success) return { status: "error", code: "invalid" };
  return mutate("send_room_message", { p_room: id.data, p_body: body.data });
}
export async function sendSticker(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room")),
    sticker = form.get("sticker");
  if (!room.success || !isStickerId(sticker))
    return { status: "error", code: "invalid" };
  return mutate("send_room_sticker", { p_room: room.data, p_sticker: sticker });
}
export async function createInvite(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("room"));
  if (!id.success) return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  try {
    const { data, error } = await client.rpc("create_room_invite", {
      p_room: id.data,
      p_hash: hash,
      p_max_uses: 10,
    });
    if (error || !uuid.safeParse(data).success)
      return { status: "error", code: "failed" };
    return { status: "success", code: "saved", invite: { id: data, token } };
  } catch {
    return { status: "error", code: "failed" };
  }
}
export async function redeemInvite(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const token = inviteTokenSchema.safeParse(form.get("token"));
  if (!token.success) return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  let id: string;
  try {
    const { data, error } = await client.rpc("redeem_room_invite", {
      p_token: token.data,
    });
    if (error || !uuid.safeParse(data).success)
      return { status: "error", code: "failed" };
    id = data;
  } catch {
    return { status: "error", code: "failed" };
  }
  redirect(`/room/${id}`);
}
export async function moderateRoom(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room")),
    user = uuid.safeParse(form.get("user"));
  const action = form.get("operation");
  if (
    !room.success ||
    !user.success ||
    !["kick", "promote", "demote", "leave", "close"].includes(String(action))
  )
    return { status: "error", code: "invalid" };
  const result = await mutate("moderate_room", {
    p_room: room.data,
    p_user: user.data,
    p_action: String(action),
  });
  revalidatePath(`/room/${room.data}`);
  revalidatePath("/network");
  return result;
}
export async function deleteMessage(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("message"));
  if (!id.success) return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client || !user)
    return { status: "error", code: client ? "auth" : "unconfigured" };
  const message = await client
    .from("room_messages")
    .select("image_path")
    .eq("id", id.data)
    .maybeSingle();
  const result = await mutate("delete_room_message", { p_message: id.data });
  if (result.status === "success" && message.data?.image_path) {
    // Storage API removes bytes; SQL never deletes storage.objects directly.
    try {
      await client.storage
        .from(CHAT_IMAGE_BUCKET)
        .remove([message.data.image_path]);
    } catch {
      /* Message stays deleted. An orphan can be removed by maintenance. */
    }
  }
  return result;
}
export async function revokeInvite(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("invite"));
  if (!id.success) return { status: "error", code: "invalid" };
  return mutate("revoke_room_invite", { p_invite: id.data });
}
