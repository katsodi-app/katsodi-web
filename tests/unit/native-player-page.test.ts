import { describe, expect, it } from "vitest";
import { GET } from "../../src/app/api/native/v1/player/route";

describe("native provider-only player page", () => {
  it("serves one nonce-gated script under a strict policy", async () => {
    const response = await GET();
    const html = await response.text();
    const csp = response.headers.get("content-security-policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain(
      "frame-src https://www.youtube.com https://player.vimeo.com https://w.soundcloud.com https://open.spotify.com",
    );
    expect(csp).not.toContain("unsafe-inline");
    // Every script and style tag carries this response's nonce.
    const tags = html.match(/<(script|style)\b[^>]*>/g) ?? [];
    expect(tags.length).toBe(2);
    for (const tag of tags) expect(tag).toContain(`nonce="${nonce}"`);
    // A fresh nonce per response.
    const again = (await GET()).headers.get("content-security-policy");
    expect(again).not.toBe(csp);
  });

  it("ships a script that parses, so every provider can load", async () => {
    // A broken script leaves window.katsodi undefined: nothing ever plays.
    const html = await (await GET()).text();
    const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)?.[1] ?? "";
    expect(script.length).toBeGreaterThan(1000);
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain("spotify");
  });

  it("contains no Katsodi navigation, account or data access", async () => {
    const html = await (await GET()).text();
    expect(html).not.toMatch(/supabase|authorization|localStorage|document\.cookie|fetch\(/i);
    expect(html).not.toMatch(/\/api\/native\/v1\/(rooms|me|meta)/);
    expect(html).toContain("window.katsodi = Object.freeze(");
  });
});
