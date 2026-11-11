import { z } from "zod";
import { roomSchema, fandomIdSchema } from "../rooms";
import type { PlaybackState } from "../playback";
export const uuid = z.string().uuid();
export const emailSchema = z.string().trim().email().max(254);
export const passwordSchema = z.string().min(12).max(128);
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{2,23}$/),
  display_name: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(280),
});
export const serverRoomSchema = roomSchema.extend({
  art: z.enum(["orbit", "wave", "moon", "sun"]),
});
export const messageSchema = z.string().trim().min(1).max(2000);
export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export function safeNext(value: unknown, fallback = "/account") {
  if (typeof value !== "string" || value.length > 300 || /[\\\r\n]/.test(value))
    return fallback;
  if (value === "/network/create") return value;
  const fandom = value.match(/^\/network\/create\?fandom=([a-z]+-\d+)$/)?.[1];
  if (fandom && fandomIdSchema.safeParse(fandom).success) return value;
  if (
    value === "/join" ||
    value === "/music" ||
    /^\/music\/[a-z0-9-]{1,160}$/.test(value) ||
    value === "/account" ||
    value === "/onboarding" ||
    value === "/friends" ||
    value === "/rooms" ||
    value === "/network" ||
    value === "/reset-password" ||
    /^\/room\/[a-f0-9-]{36}$/.test(value)
  )
    return value;
  return fallback;
}
export type ActionResult = {
  status: "idle" | "success" | "error";
  code?:
    | "unconfigured"
    | "invalid"
    | "terms"
    | "auth"
    | "failed"
    | "sent"
    | "saved"
    | "rateLimit"
    | "mediaUnavailable"
    | "queueFull"
    | "demoBusy"
    | "demoUnavailable"
    | "requestSent"
    | "fandomExists"
    | "requestExists"
    | "requestUnavailable"
    | "importUnsupported"
    | "importUnconfigured"
    | "importNotFound"
    | "importEmpty"
    | "musicOnly"
    | "imported";
  invite?: { id: string; token: string };
  /** Playlist import into a music room's queue. */
  imported?: { added: number; found: number; capped: boolean };
  /** Which service an import message refers to ("YouTube", "Spotify"). */
  service?: string;
  /** Outcome of a friend request. */
  friend?: "sent" | "friends" | "already" | "unavailable";
  /** Authoritative timeline after a successful updatePlayback. */
  playback?: PlaybackState | null;
};
export const initialResult: ActionResult = { status: "idle" };
