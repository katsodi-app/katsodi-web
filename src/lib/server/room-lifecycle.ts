import "server-only";
import { createClient } from "@supabase/supabase-js";
import { CHAT_IMAGE_BUCKET } from "@/lib/chat-media";

const PAGE = 1000;

/** Service credentials for the trusted scheduler; null when not configured. */
export function lifecycleConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    admin = process.env.SUPABASE_SERVICE_ROLE_KEY,
    secret =
      process.env.ROOMS_LIFECYCLE_SECRET || process.env.VOICE_WORKER_SECRET;
  return url && admin && secret ? { url, admin, secret } : null;
}

/**
 * Task 3.1. Marks rooms empty for 10 minutes inactive and deletes rooms
 * empty for 30 (migration 2000), then removes deleted rooms' chat images
 * from Storage. A failed removal stays queued for the next run.
 */
export async function runRoomLifecycle() {
  const config = lifecycleConfig();
  if (!config) throw Error("unconfigured");
  const db = createClient(config.url, config.admin, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
    },
  });
  const run = await db.rpc("run_room_lifecycle");
  if (run.error) throw Error("lifecycle_unavailable");
  const counts = (Array.isArray(run.data) ? run.data[0] : run.data) as
    { inactive?: number; deleted?: number } | undefined;
  const queue = await db
    .from("room_storage_cleanup")
    .select("room_id")
    .order("queued_at")
    .limit(20);
  if (queue.error) throw Error("queue_unavailable");
  let cleaned = 0;
  for (const { room_id: room } of queue.data || []) {
    // Paths are <room>/<folder>/<file>.webp: list the room's folders, then files.
    const storage = db.storage.from(CHAT_IMAGE_BUCKET);
    // Page through every listing: the queue row is deleted afterwards, so a
    // truncated list would leave private images behind for good.
    const listAll = async (prefix: string) => {
      const entries: { id: string | null; name: string }[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const page = await storage.list(prefix, { limit: PAGE, offset });
        if (page.error) throw Error("storage_unavailable");
        entries.push(...(page.data || []));
        if ((page.data || []).length < PAGE) return entries;
      }
    };
    const paths: string[] = [];
    for (const entry of await listAll(String(room))) {
      if (entry.id) {
        paths.push(`${room}/${entry.name}`);
        continue;
      }
      for (const file of await listAll(`${room}/${entry.name}`))
        paths.push(`${room}/${entry.name}/${file.name}`);
    }
    for (let i = 0; i < paths.length; i += 100) {
      const removed = await storage.remove(paths.slice(i, i + 100));
      if (removed.error) throw Error("storage_unavailable");
    }
    const done = await db
      .from("room_storage_cleanup")
      .delete()
      .eq("room_id", room);
    if (done.error) throw Error("queue_unavailable");
    cleaned++;
  }
  return {
    inactive: Number(counts?.inactive ?? 0),
    deleted: Number(counts?.deleted ?? 0),
    cleaned,
  };
}
