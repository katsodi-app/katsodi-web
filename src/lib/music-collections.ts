import { z } from "zod";
import { discoveryTrackSchema, safeMusicCover } from "./music-discovery";
export const collectionSchema = z
  .object({
    provider: z.enum(["soundcloud-popular", "trending"]),
    checked: z.string().datetime(),
    method: z.string().max(500),
    tracks: z
      .array(
        discoveryTrackSchema.extend({
          duration: z.number().positive(),
          cover: z.string().refine((value) => safeMusicCover(value) !== null),
          plays: z.number().int().nonnegative(),
          evidence: z.object({
            url: z.string().url(),
            indexUrl: z.string().url(),
            checked: z.string().datetime(),
            likes: z.number().int().nonnegative(),
            policy: z.literal("ALLOW"),
            embedVerified: z.literal(true),
          }),
        }),
      )
      .max(150),
  })
  .refine(
    (c) =>
      new Set(c.tracks.map((t) => t.id)).size === c.tracks.length &&
      new Set(c.tracks.map((t) => t.url)).size === c.tracks.length,
  );
export const collectionsSchema = z.object({
  popular: collectionSchema.refine(
    (c) =>
      c.provider === "soundcloud-popular" &&
      c.tracks.length >= 75 &&
      c.tracks.every((t) => t.plays >= 1000000),
  ),
  trending: collectionSchema.refine(
    (c) =>
      c.provider === "trending" &&
      c.tracks.length >= 50 &&
      c.tracks.every((t) => t.plays >= 100000),
  ),
});
export type MusicCollections = z.infer<typeof collectionsSchema>;
