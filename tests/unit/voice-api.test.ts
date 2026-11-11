import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  config: vi.fn(),
  token: vi.fn(),
  worker: vi.fn(),
  member: true,
  closed: false,
  ready: true,
}));
vi.mock("../../src/lib/supabase/server", () => ({
  currentAccount: mocks.account,
}));
vi.mock("../../src/lib/server/voice", () => ({
  voiceConfig: mocks.config,
  voiceToken: mocks.token,
  drainVoiceRevocations: mocks.worker,
}));
import { GET, POST } from "../../src/app/api/rooms/[roomId]/voice/route";
import { POST as worker } from "../../src/app/api/internal/voice-worker/route";
const roomId = "20000000-0000-4000-8000-000000000001",
  params = { params: Promise.resolve({ roomId }) };
const request = () =>
  new Request(`http://localhost/api/rooms/${roomId}/voice`, {
    method: "POST",
    headers: { Origin: "http://localhost" },
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.member = true;
  mocks.closed = false;
  mocks.ready = true;
  mocks.config.mockReturnValue({ worker: "scheduler-secret" });
  mocks.token.mockResolvedValue({
    url: "wss://test.livekit.cloud",
    token: "short-lived",
  });
  mocks.account.mockResolvedValue({
    user: { id: "verified-user" },
    client: {
      rpc: async () => ({ data: mocks.ready, error: null }),
      from: (table: string) => {
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({
            data:
              table === "rooms"
                ? { id: roomId, closed_at: mocks.closed ? "closed" : null }
                : mocks.member
                  ? { user_id: "verified-user" }
                  : null,
            error: null,
          }),
        };
        return q;
      },
    },
  });
});
it("issues a private token only for the verified active member, ignoring client identities and room names", async () => {
  const result = await POST(request(), params);
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.token).toHaveBeenCalledWith(roomId, "verified-user");
});
it("refuses anonymous, kicked and closed-room users before issuing a token", async () => {
  mocks.member = false;
  expect((await POST(request(), params)).status).toBe(403);
  mocks.member = true;
  mocks.closed = true;
  expect((await POST(request(), params)).status).toBe(403);
  mocks.account.mockResolvedValue({ user: null, client: null });
  expect((await POST(request(), params)).status).toBe(401);
  expect(mocks.token).not.toHaveBeenCalled();
});
it("stays unavailable without configuration, migration or a fresh revocation worker", async () => {
  mocks.config.mockReturnValue(null);
  expect((await GET(request(), params)).status).toBe(503);
  mocks.config.mockReturnValue({});
  mocks.ready = false;
  expect((await POST(request(), params)).status).toBe(503);
  expect(mocks.token).not.toHaveBeenCalled();
});
it("rejects cross-origin token requests and wrong worker credentials", async () => {
  expect(
    (
      await POST(
        new Request("http://localhost/api/voice", {
          method: "POST",
          headers: { Origin: "https://evil.org" },
        }),
        params,
      )
    ).status,
  ).toBe(403);
  expect(
    (await worker(new Request("http://localhost/worker", { method: "POST" })))
      .status,
  ).toBe(401);
  expect(mocks.worker).not.toHaveBeenCalled();
  expect(
    (
      await worker(
        new Request("http://localhost/worker", {
          method: "POST",
          headers: { Authorization: "Bearer scheduler-secret" },
        }),
      )
    ).status,
  ).toBe(200);
  expect(mocks.worker).toHaveBeenCalledTimes(1);
});
