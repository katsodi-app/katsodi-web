import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  configured: true,
  payload: null as unknown,
  admin: false,
  fandomRow: null as unknown,
}));
vi.mock("@/lib/supabase/config", () => ({
  supabaseConfig: () =>
    mocks.configured
      ? { url: "https://example.supabase.co", key: "public" }
      : null,
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getClaims: async () => ({}) },
    rpc: async () => ({ data: mocks.admin, error: null }),
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        abortSignal: () => query,
        maybeSingle: async () => ({
          data:
            table === "fandoms" ? mocks.fandomRow : { payload: mocks.payload },
          error: null,
        }),
      };
      return query;
    },
  }),
}));
import { proxy } from "../../src/proxy";
import { musicChart } from "../../src/lib/music";
beforeEach(() => {
  mocks.configured = true;
  mocks.payload = null;
  mocks.admin = false;
  mocks.fandomRow = null;
});
it("returns a real 404 for unknown song slugs before a response starts streaming", async () => {
  const response = await proxy(
    new NextRequest("http://localhost/music/not-a-real-track"),
  );
  expect(response.status).toBe(404);
  expect(response.headers.get("x-middleware-rewrite")).toBe(
    "http://localhost/__not-found",
  );
});
it("keeps known songs and real unknown-song 404s working without Supabase", async () => {
  mocks.configured = false;
  expect(
    (
      await proxy(
        new NextRequest(`http://localhost/music/${musicChart.tracks[0].slug}`),
      )
    ).status,
  ).toBe(200);
  expect(
    (await proxy(new NextRequest("http://localhost/music/not-a-real-track")))
      .status,
  ).toBe(404);
});
it("admits newly ranked slugs only when the stored all-time chart validates", async () => {
  mocks.payload = {
    ...musicChart,
    tracks: musicChart.tracks.map((track, index) =>
      index === 0 ? { ...track, slug: "fresh-song" } : track,
    ),
  };
  expect(
    (await proxy(new NextRequest("http://localhost/music/fresh-song"))).status,
  ).toBe(200);
  mocks.payload = { tracks: [{ slug: "unverified-song" }] };
  expect(
    (await proxy(new NextRequest("http://localhost/music/unverified-song")))
      .status,
  ).toBe(404);
});
it("preserves the administrator access boundary", async () => {
  expect((await proxy(new NextRequest("http://localhost/admin"))).status).toBe(
    404,
  );
  mocks.admin = true;
  expect((await proxy(new NextRequest("http://localhost/admin"))).status).toBe(
    200,
  );
});

it("returns a real 404 for unknown fandom ids and keeps known ones", async () => {
  const status = async (path: string) =>
    (await proxy(new NextRequest(`http://localhost${path}`))).status;
  expect(await status("/fandoms/zzz")).toBe(404);
  expect(await status("/fandoms/cinema-0")).toBe(200);
  expect(await status("/fandoms/request")).toBe(200);
  expect(await status("/fandoms")).toBe(200);
  // An approved community fandom exists only in the database.
  expect(await status("/fandoms/community-0123456789")).toBe(404);
  mocks.fandomRow = { id: "community-0123456789" };
  expect(await status("/fandoms/community-0123456789")).toBe(200);
  mocks.configured = false;
  expect(await status("/fandoms/zzz")).toBe(404);
  expect(await status("/fandoms/cinema-0")).toBe(200);
});
