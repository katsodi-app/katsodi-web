import { z } from "zod";

/** The room website embedding check, shared by the server and the room UI. */
export const siteEmbeddingSchema = z.object({
  /** "allowed" only after the site's own response permitted framing. */
  embedding: z.enum(["allowed", "blocked", "unchecked"]),
  src: z.string().url(),
});
export type SiteEmbedding = z.infer<typeof siteEmbeddingSchema>;
