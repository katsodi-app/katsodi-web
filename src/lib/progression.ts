import { z } from "zod";

export const achievementIds = [
  "first_steps",
  "room_creator",
  "social_butterfly",
  "movie_marathon",
  "music_enthusiast",
  "community_veteran",
  "legendary_member",
] as const;
export type AchievementId = (typeof achievementIds)[number];

/** A profile's level and achievements, as returned by profile_progress. */
export const progressSchema = z.object({
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  into_level: z.number().int().min(0),
  next_level: z.number().int().min(1),
  achievements: z.array(
    z.object({
      id: z.enum(achievementIds),
      rarity: z.enum(["common", "rare", "epic", "legendary"]),
      xp: z.number().int(),
      unlocked_at: z.string().nullable(),
    }),
  ),
});
export type Progress = z.infer<typeof progressSchema>;

/** Same curve as SQL level_progress: level L→L+1 costs round(100 × L^1.5). */
export function levelProgress(total: number) {
  let level = 1,
    rest = Math.max(0, Math.floor(total));
  let need = Math.round(100 * Math.pow(level, 1.5));
  while (rest >= need && level < 1000) {
    rest -= need;
    level++;
    need = Math.round(100 * Math.pow(level, 1.5));
  }
  return { level, intoLevel: rest, nextLevel: need };
}
