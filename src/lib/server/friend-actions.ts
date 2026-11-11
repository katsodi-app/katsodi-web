"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentAccount } from "@/lib/supabase/server";
import { uuid, type ActionResult } from "./contracts";

const username = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, "").toLowerCase())
  .pipe(z.string().regex(/^[a-z][a-z0-9_]{2,23}$/));

async function call(
  name: string,
  args: Record<string, unknown>,
): Promise<{ data?: unknown; result: ActionResult }> {
  const { client, user } = await currentAccount();
  if (!client) return { result: { status: "error", code: "unconfigured" } };
  if (!user) return { result: { status: "error", code: "auth" } };
  try {
    const { data, error } = await client.rpc(name, args);
    if (error)
      return {
        result: {
          status: "error",
          code:
            error.code === "PGRST202"
              ? "mediaUnavailable"
              : error.message.includes("slow_down")
                ? "rateLimit"
                : "failed",
        },
      };
    revalidatePath("/friends");
    return { data, result: { status: "success", code: "saved" } };
  } catch {
    return { result: { status: "error", code: "failed" } };
  }
}

/** Sends a request by @username; the outcome says what happened. */
export async function sendFriendRequest(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const name = username.safeParse(form.get("username"));
  if (!name.success) return { status: "error", code: "invalid" };
  const { data, result } = await call("send_friend_request", {
    p_username: name.data,
  });
  if (result.status !== "success") return result;
  const outcome = ["sent", "friends", "already", "unavailable"].includes(
    String(data),
  )
    ? (String(data) as NonNullable<ActionResult["friend"]>)
    : "unavailable";
  return { status: "success", code: "saved", friend: outcome };
}

export async function respondFriendRequest(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const request = uuid.safeParse(form.get("request"));
  if (!request.success) return { status: "error", code: "invalid" };
  return (
    await call("respond_friend_request", {
      p_request: request.data,
      p_accept: form.get("accept") === "true",
    })
  ).result;
}

export async function cancelFriendRequest(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const request = uuid.safeParse(form.get("request"));
  if (!request.success) return { status: "error", code: "invalid" };
  return (await call("cancel_friend_request", { p_request: request.data }))
    .result;
}

/** remove | block | unblock another user, by id. */
export async function changeFriendship(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const user = uuid.safeParse(form.get("user")),
    operation = form.get("operation");
  const rpc =
    operation === "remove"
      ? "remove_friend"
      : operation === "block"
        ? "block_user"
        : operation === "unblock"
          ? "unblock_user"
          : null;
  if (!user.success || !rpc) return { status: "error", code: "invalid" };
  return (await call(rpc, { p_user: user.data })).result;
}
