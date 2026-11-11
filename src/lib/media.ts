import { z } from "zod";
import { inspectSource } from "./providers";

/**
 * "Now playing" details from a provider's official oEmbed response. Every
 * field is untrusted text from the provider: lengths are bounded, the cover
 * must be a public HTTPS URL, and React escapes everything when rendering.
 */
export const mediaDetailsSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().max(120).nullable(),
  thumbnail: z
    .string()
    .max(2048)
    .nullable()
    .refine((value) => value === null || !!inspectSource(value), {
      message: "unsafe_thumbnail",
    }),
  provider: z.string().min(1).max(60),
  /** Seconds, when the provider reports it (Vimeo does; YouTube does not). */
  duration: z.number().finite().min(0).max(172800).nullable(),
});
export type MediaDetails = z.infer<typeof mediaDetailsSchema>;

/** Normalizes a raw oEmbed object into MediaDetails, or null if unusable. */
export function readOembedDetails(
  value: unknown,
  provider: string,
): MediaDetails | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const text = (input: unknown, max: number) =>
    typeof input === "string" && input.trim()
      ? input.trim().replace(/\s+/g, " ").slice(0, max)
      : null;
  const title = text(data.title, 200);
  if (!title) return null;
  const thumbnail =
    typeof data.thumbnail_url === "string"
      ? (inspectSource(data.thumbnail_url)?.url ?? null)
      : null;
  const duration = Number(data.duration);
  const parsed = mediaDetailsSchema.safeParse({
    title,
    author: text(data.author_name, 120),
    thumbnail,
    provider,
    duration:
      Number.isFinite(duration) && duration > 0 && duration <= 172800
        ? Math.round(duration)
        : null,
  });
  return parsed.success ? parsed.data : null;
}

/** 3725 → "1:02:05", 95 → "1:35". */
export function formatDuration(seconds: number) {
  const s = Math.floor(seconds % 60),
    m = Math.floor((seconds / 60) % 60),
    h = Math.floor(seconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
