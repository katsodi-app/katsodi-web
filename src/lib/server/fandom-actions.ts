"use server";
import { revalidatePath } from "next/cache";
import { currentAccount } from "@/lib/supabase/server";
import { categories } from "@/lib/fandoms";
import { uuid, type ActionResult } from "./contracts";

function code(message: string): ActionResult["code"] {
  return message.includes("fandom_exists")
    ? "fandomExists"
    : message.includes("request_exists")
      ? "requestExists"
      : message.includes("request_unavailable")
        ? "requestUnavailable"
        : message.includes("slow_down")
          ? "rateLimit"
          : message.includes("invalid_request")
            ? "invalid"
            : message.includes("forbidden")
              ? "auth"
              : "failed";
}

/** A signed-in member asks for a new fandom (migration 1900). */
export async function requestFandom(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const name = String(form.get("name") ?? "").trim(),
    category = String(form.get("category") ?? ""),
    note = String(form.get("note") ?? "").trim();
  if (
    name.length < 2 ||
    name.length > 80 ||
    !(categories as readonly string[]).includes(category) ||
    note.length > 500
  )
    return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  const { error } = await client.rpc("request_fandom", {
    p_name: name,
    p_category: category,
    p_note: note || null,
  });
  if (error) return { status: "error", code: code(error.message) };
  revalidatePath("/fandoms/request");
  return { status: "success", code: "requestSent" };
}

/** The administrator approves (approve=1) or rejects (approve=0) a request. */
export async function decideFandomRequest(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const request = uuid.safeParse(form.get("request")),
    approve = form.get("approve"),
    reason = String(form.get("reason") ?? "").trim();
  if (
    !request.success ||
    (approve !== "1" && approve !== "0") ||
    reason.length > 300
  )
    return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  const { error } = await client.rpc("decide_fandom_request", {
    p_request: request.data,
    p_approve: approve === "1",
    p_reason: reason || null,
  });
  if (error) return { status: "error", code: code(error.message) };
  revalidatePath("/admin");
  revalidatePath("/fandoms");
  return { status: "success", code: "saved" };
}
