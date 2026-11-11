import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { demoToken, voiceConfig, voiceToken } from "../../src/lib/server/voice";
beforeEach(() => {
  for (const [key, value] of Object.entries({
    VOICE_ENABLED: "true",
    LIVEKIT_URL: "wss://test.livekit.cloud",
    LIVEKIT_API_KEY: "test-key",
    LIVEKIT_API_SECRET: "test-only-secret-at-least-32-characters",
    SUPABASE_SERVICE_ROLE_KEY: "test-admin",
    VOICE_WORKER_SECRET: "test-worker",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  }))
    vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
it("signs a one-minute room-scoped microphone-only token with server-selected identity", async () => {
  const result = await voiceToken("room-id", "verified-user"),
    payload = JSON.parse(
      Buffer.from(result.token.split(".")[1], "base64url").toString(),
    );
  expect(payload.sub).toBe("verified-user");
  expect(payload.exp - payload.nbf).toBe(60);
  expect(payload.video).toMatchObject({
    room: "katsodi-room-id",
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canPublishSources: ["microphone"],
  });
  expect(payload.video.roomAdmin).not.toBe(true);
});
const claims = (token: string) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
it("lets only the presenter publish a screen and only hosts draw, in a separate SFU room", async () => {
  const presenter = claims(
    (await demoToken("room-id", "presenter", { publish: true, data: false }))
      .token,
  );
  expect(presenter.exp - presenter.nbf).toBe(60);
  expect(presenter.video).toMatchObject({
    room: "katsodi-room-id-screen",
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canPublishSources: ["screen_share", "screen_share_audio"],
  });
  const host = claims(
    (await demoToken("room-id", "host", { publish: false, data: true })).token,
  );
  expect(host.video).toMatchObject({
    canPublish: false,
    canPublishData: true,
    canSubscribe: true,
  });
  expect(host.video.canPublishSources ?? []).toEqual([]);
  const viewer = claims(
    (await demoToken("room-id", "member", { publish: false, data: false }))
      .token,
  );
  expect(viewer.sub).toBe("member");
  expect(viewer.video).toMatchObject({
    room: "katsodi-room-id-screen",
    canPublish: false,
    canSubscribe: true,
    canPublishData: false,
  });
  expect(viewer.video.canPublishSources ?? []).toEqual([]);
  expect(presenter.video.roomAdmin).not.toBe(true);
});
it("disables the integration with incomplete, insecure or unsupported deployment configuration", () => {
  vi.stubEnv("VOICE_ENABLED", "false");
  expect(voiceConfig()).toBeNull();
  vi.stubEnv("VOICE_ENABLED", "true");
  vi.stubEnv("LIVEKIT_URL", "ws://test.livekit.cloud");
  expect(voiceConfig()).toBeNull();
  vi.stubEnv("LIVEKIT_URL", "wss://selfhost.org");
  expect(voiceConfig()).toBeNull();
  vi.stubEnv("LIVEKIT_URL", "wss://test.livekit.cloud");
  vi.stubEnv("VOICE_WORKER_SECRET", "");
  expect(voiceConfig()).toBeNull();
});
