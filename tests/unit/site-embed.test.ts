import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  page: vi.fn(),
  account: vi.fn(),
  active: true,
  closed: false,
  site: "https://example.org/" as string | null,
}));
vi.mock("@/lib/server/public-player-request", () => ({
  publicPlayerPage: mocks.page,
  PublicPageError: class extends Error {},
}));
vi.mock("../../src/lib/server/public-player-request", () => ({
  publicPlayerPage: mocks.page,
  PublicPageError: class extends Error {},
}));
vi.mock("@/lib/supabase/server", () => ({ currentAccount: mocks.account }));

import { siteEmbedding } from "../../src/lib/server/site-embed";
import { GET } from "../../src/app/api/rooms/[roomId]/site/route";

const page = (
  headers: Record<string, string>,
  url = "https://example.org/",
) => ({
  body: "<!doctype html>",
  headers: new Headers(headers),
  url,
});
let n = 0;
// Each case uses a fresh URL, so the module's verdict cache never interferes.
const fresh = () => `https://site${++n}.example.org/`;

describe("website embedding check", () => {
  beforeEach(() => {
    mocks.page.mockReset();
  });
  it("allows a site whose response permits framing", async () => {
    const url = fresh();
    mocks.page.mockResolvedValue(page({}, url + "home"));
    expect(await siteEmbedding(url)).toEqual({
      embedding: "allowed",
      src: url + "home",
    });
  });
  it("blocks X-Frame-Options and restrictive frame-ancestors", async () => {
    for (const headers of <Record<string, string>[]>[
      { "x-frame-options": "SAMEORIGIN" },
      {
        "content-security-policy": "default-src 'self'; frame-ancestors 'self'",
      },
      { "content-security-policy": "frame-ancestors https://partner.example" },
    ]) {
      const url = fresh();
      mocks.page.mockResolvedValue(page(headers, url));
      expect((await siteEmbedding(url)).embedding).toBe("blocked");
    }
    const open = fresh();
    mocks.page.mockResolvedValue(
      page({ "content-security-policy": "frame-ancestors *" }, open),
    );
    expect((await siteEmbedding(open)).embedding).toBe("allowed");
  });
  it("never embeds what it could not confirm", async () => {
    const url = fresh();
    mocks.page.mockImplementation(async () => {
      throw new Error("blocked");
    });
    expect(await siteEmbedding(url)).toEqual({
      embedding: "unchecked",
      src: url,
    });
    expect((await siteEmbedding("javascript:alert(1)")).embedding).toBe(
      "unchecked",
    );
    expect((await siteEmbedding("https://127.0.0.1/")).embedding).toBe(
      "unchecked",
    );
  });
  it("caches a verdict instead of fetching the site for every member", async () => {
    const url = fresh();
    mocks.page.mockResolvedValue(page({}, url));
    await siteEmbedding(url);
    await siteEmbedding(url);
    expect(mocks.page).toHaveBeenCalledTimes(1);
  });
});

describe("room website API", () => {
  const roomId = "20000000-0000-4000-8000-000000000001";
  const params = { params: Promise.resolve({ roomId }) };
  beforeEach(() => {
    mocks.page.mockReset();
    mocks.page.mockResolvedValue(page({}));
    mocks.active = true;
    mocks.closed = false;
    mocks.site = "https://example.org/";
    mocks.account.mockResolvedValue({
      user: { id: "verified" },
      client: {
        from(table: string) {
          const query = {
            select: () => query,
            eq: () => query,
            maybeSingle: async () => ({
              error: null,
              data:
                table === "rooms"
                  ? { closed_at: mocks.closed ? "2026-11-05" : null }
                  : table === "room_sites"
                    ? mocks.site && { url: mocks.site }
                    : mocks.active
                      ? { user_id: "verified" }
                      : null,
            }),
          };
          return query;
        },
      },
    });
  });
  it("checks only the stored website for active members", async () => {
    const response = await GET(new Request("http://localhost"), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({
      site: { url: "https://example.org/", embedding: "allowed" },
    });
  });
  it("answers null when no website is set", async () => {
    mocks.site = null;
    const response = await GET(new Request("http://localhost"), params);
    expect(await response.json()).toEqual({ site: null });
    expect(mocks.page).not.toHaveBeenCalled();
  });
  it("refuses anonymous, removed and closed-room requests", async () => {
    mocks.active = false;
    expect((await GET(new Request("http://localhost"), params)).status).toBe(
      404,
    );
    mocks.active = true;
    mocks.closed = true;
    expect((await GET(new Request("http://localhost"), params)).status).toBe(
      404,
    );
    mocks.account.mockResolvedValue({ client: null, user: null });
    expect((await GET(new Request("http://localhost"), params)).status).toBe(
      401,
    );
    expect(mocks.page).not.toHaveBeenCalled();
  });
});
