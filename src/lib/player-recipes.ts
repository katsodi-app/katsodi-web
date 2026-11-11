import { inspectSource } from "./providers";
export type DiscoveryPlan = {
  adapter: "kinogo-html-v1";
  provider: string;
  page: string;
};
/** Removed integrations must not silently fall back to generic scraping. */
export function retiredParserSource(input: string): boolean {
  try {
    const host = new URL(input).hostname;
    return ["reanime.to", "liveball.sx", "flixcloud.cc"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
export function discoveryPlan(input: string): DiscoveryPlan | null {
  const safe = inspectSource(input);
  if (!safe) return null;
  const url = new URL(safe.url);
  if (
    url.hostname === "kinogo.is" &&
    /^\/\d{1,9}-[a-z0-9-]+\.html$/.test(url.pathname)
  )
    return {
      adapter: "kinogo-html-v1",
      provider: "Kinogo",
      page: `https://kinogo.is${url.pathname}`,
    };
  return null;
}
