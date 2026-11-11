import { describe, expect, it } from "vitest";
import { fandoms } from "../../src/lib/fandoms";
import officialLinks from "../../src/data/fandom-official-links.json";

const kinds = ["stream", "site", "channel", "league", "search"];
const entries = Object.entries(
  officialLinks as Record<
    string,
    { provider: string; url: string; kind: string; checked: string }[]
  >,
);

describe("official fandom links", () => {
  it("belong to catalogue fandoms", () => {
    const ids = new Set(fandoms.map((f) => f.id));
    for (const [id] of entries) expect(ids.has(id), id).toBe(true);
  });
  it("are https links with a provider, a known kind and a check date", () => {
    for (const [id, links] of entries) {
      expect(links.length, id).toBeGreaterThan(0);
      for (const link of links) {
        expect(new URL(link.url).protocol, link.url).toBe("https:");
        expect(link.provider.trim(), link.url).not.toBe("");
        expect(kinds, link.url).toContain(link.kind);
        expect(link.checked, link.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
  it("only use search pages of official services, never unofficial mirrors", () => {
    for (const [, links] of entries)
      for (const link of links.filter((l) => l.kind === "search")) {
        const url = new URL(link.url);
        expect(url.host).toBe("www.crunchyroll.com");
        expect(url.pathname).toBe("/search");
        expect(url.searchParams.get("q")).toBeTruthy();
      }
  });
  it("do not repeat a link within a fandom", () => {
    for (const [id, links] of entries)
      expect(new Set(links.map((l) => l.url)).size, id).toBe(links.length);
  });
});
