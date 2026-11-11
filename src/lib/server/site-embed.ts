import { inspectSource } from "../providers";
import { embeddingBlocked } from "./generic-player-resolver";
import { publicPlayerPage } from "./public-player-request";

import type { SiteEmbedding } from "./site-embed-schema";

const cache = new Map<string, { until: number; result: SiteEmbedding }>();

/**
 * Whether a public https site lets other sites show it in an iframe, read
 * from its X-Frame-Options and CSP frame-ancestors headers. The request goes
 * through the same guarded fetcher as player discovery: public addresses
 * only, no cookies or credentials, limited redirects and size. Anything the
 * check cannot confirm (bot protection, non-HTML, private address, timeout)
 * is "unchecked" and is never embedded.
 */
export async function siteEmbedding(input: string): Promise<SiteEmbedding> {
  const safe = inspectSource(input);
  if (!safe) return { embedding: "unchecked", src: "https://invalid.invalid/" };
  const cached = cache.get(safe.url);
  if (cached && cached.until > Date.now()) return cached.result;
  let result: SiteEmbedding;
  try {
    const page = await publicPlayerPage(safe.url, Date.now() + 10000);
    result = embeddingBlocked(page.headers)
      ? { embedding: "blocked", src: safe.url }
      : { embedding: "allowed", src: page.url };
  } catch {
    result = { embedding: "unchecked", src: safe.url };
  }
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(safe.url, {
    until: Date.now() + (result.embedding === "unchecked" ? 60000 : 600000),
    result,
  });
  return result;
}
