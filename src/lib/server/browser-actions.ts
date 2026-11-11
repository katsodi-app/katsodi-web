"use server";
import { currentAccount } from "@/lib/supabase/server";
import { inspectSource } from "@/lib/providers";
import { uuid, type ActionResult } from "./contracts";
import {
  createBrowserSession,
  deleteBrowserSession,
  grantHostRoles,
  hyperbeamKey,
} from "./hyperbeam";

const fail = (code: ActionResult["code"]): ActionResult => ({
  status: "error",
  code,
});
type Client = NonNullable<Awaited<ReturnType<typeof currentAccount>>["client"]>;
type Host = { ok: false; error: ActionResult } | { ok: true; client: Client };
async function host(room: string): Promise<Host> {
  const { client, user } = await currentAccount();
  if (!client) return { ok: false, error: fail("unconfigured") };
  if (!user) return { ok: false, error: fail("auth") };
  const allowed = await client.rpc("can_host_room_browser", { p_room: room });
  if (allowed.error)
    return {
      ok: false,
      error: fail(
        allowed.error.code === "PGRST202" ? "mediaUnavailable" : "failed",
      ),
    };
  if (allowed.data !== true) return { ok: false, error: fail("auth") };
  return { ok: true, client };
}

/** Owner/moderator: start a shared browser at a public HTTPS address. */
export async function startSharedBrowser(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!hyperbeamKey()) return fail("unconfigured");
  const room = uuid.safeParse(form.get("room"));
  const raw = form.get("url");
  const source = typeof raw === "string" ? inspectSource(raw) : null;
  if (!room.success || !source) return fail("invalid");
  // Role is checked BEFORE a paid session is created.
  const checked = await host(room.data);
  if (!checked.ok) return checked.error;
  let session: { sessionId: string; embedUrl: string };
  try {
    session = await createBrowserSession(source.url);
  } catch {
    return fail("failed");
  }
  const saved = await checked.client.rpc("set_room_browser", {
    p_room: room.data,
    p_session: session.sessionId,
    p_embed: session.embedUrl,
  });
  if (saved.error) {
    // Not recorded (role changed meanwhile, room closed): do not leave it running.
    await deleteBrowserSession(session.sessionId).catch(() => {});
    return fail("failed");
  }
  if (typeof saved.data === "string")
    await deleteBrowserSession(saved.data).catch(() => {});
  return { status: "success", code: "saved" };
}

export async function endSharedBrowser(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!hyperbeamKey()) return fail("unconfigured");
  const room = uuid.safeParse(form.get("room"));
  if (!room.success) return fail("invalid");
  const checked = await host(room.data);
  if (!checked.ok) return checked.error;
  const ended = await checked.client.rpc("end_room_browser", {
    p_room: room.data,
  });
  if (ended.error) return fail("failed");
  if (typeof ended.data === "string")
    await deleteBrowserSession(ended.data).catch(() => {});
  return { status: "success", code: "saved" };
}

/** Owner/moderator: give their own Hyperbeam connection control of the browser. */
export async function claimSharedBrowserControl(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  if (!hyperbeamKey()) return fail("unconfigured");
  const room = uuid.safeParse(form.get("room"));
  const connection = form.get("connection");
  if (
    !room.success ||
    typeof connection !== "string" ||
    !/^[A-Za-z0-9-]{8,64}$/.test(connection)
  )
    return fail("invalid");
  const checked = await host(room.data);
  if (!checked.ok) return checked.error;
  const browser = await checked.client.rpc("get_room_browser", {
    p_room: room.data,
  });
  const embed =
    browser.data && typeof browser.data === "object"
      ? (browser.data as { embed_url?: unknown }).embed_url
      : null;
  if (browser.error || typeof embed !== "string") return fail("failed");
  try {
    await grantHostRoles(embed, connection);
  } catch {
    return fail("failed");
  }
  return { status: "success", code: "saved" };
}

/** Host's browser reports its current address so members can see it. */
export async function reportSharedBrowserUrl(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room")),
    url = form.get("url");
  if (
    !room.success ||
    typeof url !== "string" ||
    url.length > 2048 ||
    !/^https?:\/\/\S+$/.test(url)
  )
    return fail("invalid");
  const { client, user } = await currentAccount();
  if (!client) return fail("unconfigured");
  if (!user) return fail("auth");
  const { error } = await client.rpc("set_room_browser_url", {
    p_room: room.data,
    p_url: url,
  });
  return error ? fail("failed") : { status: "success", code: "saved" };
}
