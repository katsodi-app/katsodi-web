import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  resolve: vi.fn(),
  active: true,
  closed: false,
}));
vi.mock("@/lib/supabase/server", () => ({ currentAccount: mocks.account }));
vi.mock("@/lib/server/player-resolver", () => ({
  resolvePlayer: mocks.resolve,
}));
import { GET } from "../../src/app/api/rooms/[roomId]/player/route";
const roomId = "20000000-0000-4000-8000-000000000001";
const params = { params: Promise.resolve({ roomId }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.active = true;
  mocks.closed = false;
  mocks.resolve.mockResolvedValue({
    kind: "external",
    reason: "notFound",
    sync: false,
  });
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
                ? {
                    url: "https://kinogo.is/240-diuna.html",
                    closed_at: mocks.closed ? "2026-11-02" : null,
                  }
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
it("resolves only the stored room source after active membership checks", async () => {
  const result = await GET(
    new Request(
      `http://localhost/api/rooms/${roomId}/player?url=https://evil.org/`,
    ),
    params,
  );
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.resolve).toHaveBeenCalledWith(
    "https://kinogo.is/240-diuna.html",
  );
});
it("does not resolve for anonymous, kicked, closed or nonexistent rooms", async () => {
  mocks.active = false;
  expect((await GET(new Request("http://localhost"), params)).status).toBe(404);
  mocks.active = true;
  mocks.closed = true;
  expect((await GET(new Request("http://localhost"), params)).status).toBe(404);
  mocks.account.mockResolvedValue({ client: null, user: null });
  expect((await GET(new Request("http://localhost"), params)).status).toBe(401);
  expect(mocks.resolve).not.toHaveBeenCalled();
});
