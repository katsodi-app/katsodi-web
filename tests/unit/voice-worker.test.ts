import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  close: vi.fn(),
  health: vi.fn(),
  deleted: vi.fn(),
  beat: vi.fn(),
  jobs: [] as { id: number; room_id: string; user_id: string | null }[],
}));
vi.mock("livekit-server-sdk", () => ({
  TrackSource: { MICROPHONE: 2 },
  AccessToken: class {},
  RoomServiceClient: class {
    removeParticipant = mocks.remove;
    deleteRoom = mocks.close;
    listRooms = mocks.health;
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: mocks.jobs, error: null }),
        }),
      }),
      delete: () => ({ eq: mocks.deleted }),
      upsert: table === "voice_worker_state" ? mocks.beat : vi.fn(),
    }),
  }),
}));
import { drainVoiceRevocations } from "../../src/lib/server/voice";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.jobs = [
    { id: 1, room_id: "r", user_id: "u" },
    { id: 2, room_id: "r2", user_id: null },
  ];
  mocks.deleted.mockResolvedValue({ error: null });
  mocks.beat.mockResolvedValue({ error: null });
  for (const [k, v] of Object.entries({
    VOICE_ENABLED: "true",
    LIVEKIT_URL: "wss://test.livekit.cloud",
    LIVEKIT_API_KEY: "test",
    LIVEKIT_API_SECRET: "test",
    SUPABASE_SERVICE_ROLE_KEY: "test",
    VOICE_WORKER_SECRET: "test",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  }))
    vi.stubEnv(k, v);
});
afterEach(() => vi.unstubAllEnvs());
it("removes members and closed rooms before deleting durable jobs and publishing readiness", async () => {
  await drainVoiceRevocations();
  expect(mocks.remove).toHaveBeenCalledWith("katsodi-r", "u");
  expect(mocks.remove).toHaveBeenCalledWith("katsodi-r-screen", "u");
  expect(mocks.close).toHaveBeenCalledWith("katsodi-r2");
  expect(mocks.close).toHaveBeenCalledWith("katsodi-r2-screen");
  expect(mocks.deleted).toHaveBeenCalledTimes(2);
  expect(mocks.health).toHaveBeenCalled();
  expect(mocks.beat).toHaveBeenCalledTimes(1);
});
it("retains failed jobs and does not renew readiness if the SFU cannot revoke access", async () => {
  mocks.remove.mockRejectedValue(Error("offline"));
  await expect(drainVoiceRevocations()).rejects.toThrow("sfu_unavailable");
  expect(mocks.deleted).not.toHaveBeenCalled();
  expect(mocks.beat).not.toHaveBeenCalled();
});
it("accepts already-absent participants but requires a live SFU health check", async () => {
  mocks.remove.mockRejectedValue({ code: "not_found" });
  mocks.health.mockRejectedValue(Error("offline"));
  await expect(drainVoiceRevocations()).rejects.toThrow("offline");
  expect(mocks.deleted).toHaveBeenCalledTimes(2);
  expect(mocks.beat).not.toHaveBeenCalled();
});
