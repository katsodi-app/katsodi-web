import { z } from "zod";
import { inspectSource } from "./providers";
import { fandoms } from "./fandoms";
export const fandomIdSchema = z
  .string()
  .refine((id) => !id || fandoms.some((f) => f.id === id));
export const roomSchema = z.object({
  fandomId: fandomIdSchema.optional(),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500),
  format: z.enum(["video", "music"]),
  visibility: z.enum(["public", "private"]),
  url: z
    .string()
    .trim()
    .refine((value) => !value || !!inspectSource(value)),
});
export const createRoomSchema = roomSchema;
export type RoomInput = z.infer<typeof roomSchema>;
export const storedRoomSchema = roomSchema.extend({
  id: z.string().uuid(),
  kind: z.literal("local"),
  art: z.enum(["orbit", "wave", "moon", "sun"]),
  createdAt: z.string().datetime(),
});
export type LocalRoom = z.infer<typeof storedRoomSchema>;
export type Room = RoomInput & {
  id: string;
  kind: "local";
  art: "orbit" | "wave" | "moon" | "sun";
  category?: string;
};
