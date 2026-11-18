import "server-only";
import { revalidatePath } from "next/cache";
import { currentAccount } from "@/lib/supabase/server";
import { resolveImport, type ImportResult } from "./playlist-import";
import { serverRoomSchema, uuid, type ActionResult } from "./contracts";

/**
 * Domain operations shared by the website's Server Actions and the native
 * API. They act as the current caller (cookie session or native bearer, see
 * src/lib/supabase/actor.ts) and never decide where the caller goes next.
 */
export function importFailure(
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

export type CreatedRoom = {
  status: "created";
  id: string;
  /** A music room was created but its playlist could not be queued. */
  importFailed: boolean;
};

/**
 * Creates a shared room for a verified account: same schema, optional
 * fandom, optional playlist import (checked before the room exists) and the
 * atomic create_room function that also adds the owner as a member.
 */
export async function createRoom(
  form: FormData,
): Promise<CreatedRoom | ActionResult> {
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
  return { status: "created", id, importFailed };
}
