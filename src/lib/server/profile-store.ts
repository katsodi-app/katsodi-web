import { randomUUID } from "node:crypto";
import { currentAccount } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/server/contracts";
import {
  PROFILE_MEDIA_BUCKET,
  type Crop,
  type MediaKind,
} from "@/lib/profile-media";
import {
  prepareProfileImage,
  sanitizeStoredImage,
} from "@/lib/server/profile-media";

/**
 * Profile changes for the website (cookies) and the desktop app (bearer):
 * the caller's own account only; the database checks the rest.
 */
export type ProfileCode =
  | "saved"
  | "auth"
  | "invalid"
  | "invalidImage"
  | "mediaUnavailable"
  | "rateLimit"
  | "failed";

/** Name, @username, bio and fandoms of the signed-in user. */
export async function storeProfile(input: {
  username: unknown;
  display_name: unknown;
  bio: unknown;
  fandoms: unknown;
}): Promise<ProfileCode> {
  const { client, user } = await currentAccount();
  if (!client || !user) return "auth";
  const data = profileSchema.safeParse(input);
  const fandoms = Array.isArray(input.fandoms) ? input.fandoms : [];
  if (
    !data.success ||
    fandoms.length > 30 ||
    fandoms.some((id) => typeof id !== "string" || id.length > 40)
  )
    return "invalid";
  try {
    const { error } = await client.rpc("update_my_profile", {
      p_username: data.data.username,
      p_display_name: data.data.display_name,
      p_bio: data.data.bio,
      p_fandoms: fandoms,
    });
    return error ? "failed" : "saved";
  } catch {
    return "failed";
  }
}

/** A new avatar or banner from an upright image and a crop of it. */
export async function storeProfileMedia(
  kind: MediaKind,
  input: Uint8Array,
  crop: Crop,
): Promise<ProfileCode> {
  const { client, user } = await currentAccount();
  if (!client || !user) return "auth";
  let image;
  try {
    image = await prepareProfileImage(input, kind, crop);
  } catch (error) {
    console.error("[profile-media] image rejected:", (error as Error).message);
    return "invalidImage";
  }
  const path = `${user.id}/${kind}-${randomUUID()}.webp`;
  const storage = client.storage.from(PROFILE_MEDIA_BUCKET);
  let attached = false;
  try {
    const upload = await storage.upload(path, image.data, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "0",
    });
    if (upload.error) {
      console.error("[profile-media] upload failed:", upload.error.message);
      return "mediaUnavailable";
    }
    const saved = await client.rpc("set_profile_media", {
      p_kind: kind,
      p_path: path,
    });
    if (saved.error) {
      console.error(
        "[profile-media] set_profile_media failed:",
        saved.error.message,
      );
      return saved.error.message.includes("slow_down") ? "rateLimit" : "failed";
    }
    attached = true;
    if (typeof saved.data === "string")
      await storage.remove([saved.data]).catch(() => {});
    return "saved";
  } catch (error) {
    console.error("[profile-media] upload error:", (error as Error).message);
    return "failed";
  } finally {
    if (!attached) await storage.remove([path]).catch(() => {});
  }
}

/** Removes the signed-in user's avatar or banner. */
export async function clearProfileMedia(kind: MediaKind): Promise<ProfileCode> {
  const { client, user } = await currentAccount();
  if (!client || !user) return "auth";
  try {
    const cleared = await client.rpc("clear_profile_media", { p_kind: kind });
    if (cleared.error) return "failed";
    if (typeof cleared.data === "string")
      await client.storage
        .from(PROFILE_MEDIA_BUCKET)
        .remove([cleared.data])
        .catch(() => {});
    return "saved";
  } catch {
    return "failed";
  }
}

/**
 * Someone's avatar or banner, for people allowed to see the profile (RLS:
 * yourself or a roommate), re-encoded; null when missing or forbidden.
 */
export async function readProfileMedia(
  userId: string,
  kind: MediaKind,
): Promise<Uint8Array | null> {
  const { client, user } = await currentAccount();
  if (!client || !user) return null;
  const profile = await client
    .from("profiles")
    .select("avatar_path,banner_path")
    .eq("id", userId)
    .maybeSingle();
  const path =
    kind === "avatar" ? profile.data?.avatar_path : profile.data?.banner_path;
  if (profile.error || typeof path !== "string") return null;
  const file = await client.storage.from(PROFILE_MEDIA_BUCKET).download(path);
  if (file.error || !file.data) return null;
  return new Uint8Array(
    await sanitizeStoredImage(
      new Uint8Array(await file.data.arrayBuffer()),
      kind,
    ),
  );
}
