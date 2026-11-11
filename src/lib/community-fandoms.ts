import { z } from "zod";
import { categories } from "./fandoms";

/** A fandom added by the administrator from a member's request (migration 1900). */
export const communityFandomRecord = z.object({
  id: z.string().regex(/^community-[0-9a-f]{10}$/),
  name: z.string().min(2).max(80),
  category: z.enum(categories),
  description: z.string().max(500).nullable(),
  created_at: z.string(),
});
export type CommunityFandom = z.infer<typeof communityFandomRecord>;

export const fandomRequestRecord = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  name: z.string(),
  category: z.enum(categories),
  note: z.string().nullable(),
  status: z.enum(["pending", "approved", "rejected"]),
  reason: z.string().nullable(),
  fandom_id: z.string().nullable(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
});
export type FandomRequest = z.infer<typeof fandomRequestRecord>;

export const adminAccountRecord = z.object({
  id: z.string().uuid(),
  display_name: z.string().nullable(),
  username: z.string().nullable(),
  email: z.string().nullable(),
  confirmed: z.boolean(),
  created_at: z.string(),
  is_admin: z.boolean(),
});
export type AdminAccount = z.infer<typeof adminAccountRecord>;

export const isCommunityFandom = (id: string) =>
  /^community-[0-9a-f]{10}$/.test(id);
