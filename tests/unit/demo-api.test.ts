import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  config: vi.fn(),
  token: vi.fn(),
  embedding: vi.fn(),
  role: "member" as string | null,
  closed: false,
  ready: true,
  demo: null as Record<string, unknown> | null,
}));
vi.mock("../../src/lib/supabase/server", () => ({
  currentAccount: mocks.account,
}));
vi.mock("../../src/lib/server/voice", () => ({
  voiceConfig: mocks.config,
  demoToken: mocks.token,
}));
vi.mock("../../src/lib/server/site-embed", () => ({
  siteEmbedding: mocks.embedding,
}));
import { GET, POST } from "../../src/app/api/rooms/[roomId]/demo/route";
const roomId = "20000000-0000-4000-8000-000000000001",
  me = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  params = { params: Promise.resolve({ roomId }) };
const request = (origin = "http://localhost") =>
  new Request(`http://localhost/api/rooms/${roomId}/demo`, {
    method: "POST",
    headers: { Origin: origin },
  });
const demo = (user: string, status: string, seen = new Date()) => ({
  user_id: user,
  url: "https://example.org/demo",
  status,
  requested_at: new Date().toISOString(),
  decided_by: null,
  paused_by: null,
  seen_at: seen.toISOString(),
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.role = "member";
  mocks.closed = false;
  mocks.ready = true;
  mocks.demo = null;
  mocks.config.mockReturnValue({ worker: "scheduler-secret" });
  mocks.token.mockResolvedValue({
    url: "wss://test.livekit.cloud",
    token: "short-lived",
  });
  mocks.embedding.mockResolvedValue({
    embedding: "allowed",
    src: "https://example.org/demo",
  });
  mocks.account.mockResolvedValue({
    user: { id: me },
    client: {
      rpc: async () => ({ data: mocks.ready, error: null }),
      from: (table: string) => {
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({
            data:
              table === "rooms"
                ? { closed_at: mocks.closed ? "closed" : null }
                : table === "room_demos"
                  ? mocks.demo
                  : mocks.role
                    ? { role: mocks.role }
                    : null,
            error: null,
          }),
        };
        return q;
      },
    },
  });
});
it("lets only the presenter of an accepted demo publish", async () => {
  // No demo, someone else's demo, or my request still waiting: watch only.
  for (const current of [
    null,
    demo(other, "live"),
    demo(me, "pending"),
    demo(me, "live", new Date(Date.now() - 120000)),
  ]) {
    mocks.demo = current;
    const response = await POST(request(), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ publish: false });
  }
  for (const status of ["live", "paused"]) {
    mocks.demo = demo(me, status);
    expect(await (await POST(request(), params)).json()).toMatchObject({
      publish: true,
      host: false,
    });
  }
  // The presenter annotates too and sends late joiners the current marks.
  expect(mocks.token).toHaveBeenLastCalledWith(roomId, me, {
    publish: true,
    data: true,
  });
});
it("gives members annotation rights only while a host has opened them", async () => {
  mocks.demo = demo(other, "live");
  await POST(request(), params);
  expect(mocks.token).toHaveBeenLastCalledWith(roomId, me, {
    publish: false,
    data: false,
  });
  mocks.demo = { ...demo(other, "live"), annotations_open: true };
  await POST(request(), params);
  expect(mocks.token).toHaveBeenLastCalledWith(roomId, me, {
    publish: false,
    data: true,
  });
  // A waiting request does not open anything.
  mocks.demo = { ...demo(other, "pending"), annotations_open: true };
  await POST(request(), params);
  expect(mocks.token).toHaveBeenLastCalledWith(roomId, me, {
    publish: false,
    data: false,
  });
});
it("lets only hosts send drawings and click hints", async () => {
  for (const role of ["owner", "moderator"]) {
    mocks.role = role;
    expect(await (await POST(request(), params)).json()).toMatchObject({
      host: true,
    });
    expect(mocks.token).toHaveBeenLastCalledWith(roomId, me, {
      publish: false,
      data: true,
    });
  }
});
it("refuses cross-site, anonymous, removed and closed-room requests", async () => {
  expect((await POST(request("https://evil.example"), params)).status).toBe(
    403,
  );
  mocks.role = null;
  expect((await POST(request(), params)).status).toBe(403);
  expect((await GET(request(), params)).status).toBe(403);
  mocks.role = "owner";
  mocks.closed = true;
  expect((await POST(request(), params)).status).toBe(403);
  mocks.account.mockResolvedValue({ user: null, client: null });
  expect((await POST(request(), params)).status).toBe(401);
  expect(mocks.token).not.toHaveBeenCalled();
});
it("stays unavailable without LiveKit or a healthy revocation worker", async () => {
  mocks.config.mockReturnValue(null);
  expect((await POST(request(), params)).status).toBe(503);
  mocks.config.mockReturnValue({});
  mocks.ready = false;
  expect((await POST(request(), params)).status).toBe(503);
  expect(mocks.token).not.toHaveBeenCalled();
});
it("reports whether the demo link can open inside Katsodi", async () => {
  expect(await (await GET(request(), params)).json()).toEqual({ demo: null });
  mocks.demo = demo(other, "live");
  expect(await (await GET(request(), params)).json()).toEqual({
    demo: {
      url: "https://example.org/demo",
      embedding: "allowed",
      src: "https://example.org/demo",
    },
  });
  expect(mocks.embedding).toHaveBeenCalledWith("https://example.org/demo");
});
