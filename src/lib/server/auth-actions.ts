"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverSupabase, currentAccount } from "@/lib/supabase/server";
import {
  emailSchema,
  passwordSchema,
  profileSchema,
  safeNext,
  type ActionResult,
} from "./contracts";
import { privacyVersion, termsVersion } from "@/content/legal/versions";
import { appOrigin } from "./app-origin";

const failure = (code: ActionResult["code"]): ActionResult => ({
  status: "error",
  code,
});
const appUrl = appOrigin;
export async function signIn(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const client = await serverSupabase();
  if (!client) return failure("unconfigured");
  const email = emailSchema.safeParse(form.get("email")),
    password = passwordSchema.safeParse(form.get("password"));
  if (!email.success || !password.success) return failure("invalid");
  try {
    const { error } = await client.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    });
    if (error) return failure("auth");
    const { data } = await client.auth.getUser();
    if (!data.user?.email_confirmed_at) {
      await client.auth.signOut();
      return failure("auth");
    }
  } catch {
    return failure("failed");
  }
  redirect(safeNext(form.get("next")));
}
export async function signUp(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const client = await serverSupabase();
  const origin = appUrl();
  if (!client || !origin) return failure("unconfigured");
  const email = emailSchema.safeParse(form.get("email")),
    password = passwordSchema.safeParse(form.get("password"));
  if (!email.success || !password.success) return failure("invalid");
  // The Terms must be accepted explicitly (unticked checkbox on the form).
  if (form.get("terms") !== "accepted") return failure("terms");
  try {
    const { error } = await client.auth.signUp({
      email: email.data,
      password: password.data,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        // Which documents this account agreed to, for renewed acceptance later.
        data: {
          terms_version: termsVersion,
          privacy_version: privacyVersion,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    });
    if (error && error.code !== "user_already_exists")
      return failure(error.status === 429 ? "rateLimit" : "failed");
    // Same response for existing and newly created addresses.
    return { status: "success", code: "sent" };
  } catch {
    return failure("failed");
  }
}
export async function resendConfirmation(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const client = await serverSupabase();
  const origin = appUrl();
  if (!client || !origin) return failure("unconfigured");
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return failure("invalid");
  try {
    const { error } = await client.auth.resend({
      type: "signup",
      email: email.data,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error?.status === 429) return failure("rateLimit");
    return { status: "success", code: "sent" };
  } catch {
    return failure("failed");
  }
}
export async function recoverPassword(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const client = await serverSupabase();
  const origin = appUrl();
  if (!client || !origin) return failure("unconfigured");
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return failure("invalid");
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    if (error?.status === 429) return failure("rateLimit");
    // Do not disclose account existence or mail delivery.
    return { status: "success", code: "sent" };
  } catch {
    return failure("failed");
  }
}
export async function resetPassword(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { client, user } = await currentAccount();
  if (!client) return failure("unconfigured");
  if (!user) return failure("auth");
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success || form.get("confirm") !== password.data)
    return failure("invalid");
  try {
    const { error } = await client.auth.updateUser({ password: password.data });
    if (error) return failure("failed");
  } catch {
    return failure("failed");
  }
  return { status: "success", code: "saved" };
}
export async function signOut() {
  const client = await serverSupabase();
  if (client) await client.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
export async function saveProfile(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { client, user } = await currentAccount();
  if (!client) return failure("unconfigured");
  if (!user) return failure("auth");
  const data = profileSchema.safeParse(Object.fromEntries(form));
  if (!data.success) return failure("invalid");
  const ids = form
    .getAll("fandom")
    .filter((v): v is string => typeof v === "string");
  try {
    const { error } = await client.rpc("update_my_profile", {
      p_username: data.data.username,
      p_display_name: data.data.display_name,
      p_bio: data.data.bio,
      p_fandoms: ids,
    });
    if (error) return failure("failed");
  } catch {
    return failure("failed");
  }
  revalidatePath("/account");
  return { status: "success", code: "saved" };
}
