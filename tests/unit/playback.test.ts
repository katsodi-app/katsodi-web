import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ currentAccount: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  currentAccount: mocks.currentAccount,
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  drifted,
  expectedPosition,
  syncableVideoId,
  syncSource,
  type PlaybackState,
} from "../../src/lib/playback";
import { updatePlayback } from "../../src/lib/server/room-actions";
import { adapterKind } from "../../src/lib/player-adapters";
import { initialResult } from "../../src/lib/server/contracts";

const room = "20000000-0000-4000-8000-000000000001";
const video = "https://www.youtube.com/watch?v=M7lc1UVf-VE";
const state = (s: "playing" | "paused", position: number): PlaybackState => ({
  state: s,
  position,
  updated_at: "2026-11-04T12:00:00.000Z",
  source_url: video,
});
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("timeline math", () => {
  it("advances only while playing", () => {
    expect(expectedPosition(state("playing", 10), 2500)).toBe(12.5);
    expect(expectedPosition(state("paused", 10), 2500)).toBe(10);
    expect(expectedPosition(state("playing", 10), -50)).toBe(10);
  });
  it("tolerates small drift but not more than 1.5 seconds", () => {
    expect(drifted(10, 11.4)).toBe(false);
    expect(drifted(10, 11.6)).toBe(true);
    expect(drifted(12, 10)).toBe(true);
  });
  it("reads YouTube video ids only from exact YouTube hosts", () => {
    expect(syncableVideoId(video)).toBe("M7lc1UVf-VE");
    expect(syncableVideoId("https://youtu.be/M7lc1UVf-VE")).toBe("M7lc1UVf-VE");
    for (const url of [
      "https://vimeo.com/76979871",
      "https://www.youtube.com/channel/abc",
      "https://evil-youtube.com/watch?v=M7lc1UVf-VE",
      "javascript:alert(1)",
    ])
      expect(syncableVideoId(url), url).toBeNull();
  });
  it("syncs YouTube, Vimeo and SoundCloud sources and nothing else", () => {
    expect(syncSource(video)).toBe("youtube");
    expect(syncSource("https://vimeo.com/76979871")).toBe("vimeo");
    expect(syncSource("https://soundcloud.com/forss/flickermood")).toBe(
      "soundcloud",
    );
    for (const url of [
      "https://www.dailymotion.com/video/x7tgad0",
      "https://rutube.ru/video/abc/",
      "https://player.vimeo.com/video/1",
      "https://vimeo.com.evil.org/1",
      "http://vimeo.com/1",
    ])
      expect(syncSource(url), url).toBeNull();
  });
  it("maps embed URLs to adapters by exact official player host", () => {
    expect(adapterKind("https://www.youtube.com/embed/M7lc1UVf-VE")).toBe(
      "youtube",
    );
    expect(adapterKind("https://player.vimeo.com/video/1")).toBe("vimeo");
    expect(adapterKind("https://w.soundcloud.com/player/?url=x")).toBe(
      "soundcloud",
    );
    for (const url of [
      "https://player.vimeo.com.evil.org/video/1",
      "http://player.vimeo.com/video/1",
      "https://geo.dailymotion.com/player.html?video=x1",
      "not a url",
    ])
      expect(adapterKind(url), url).toBeNull();
  });
});

describe("updatePlayback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentAccount.mockResolvedValue({
      client: { rpc: mocks.rpc },
      user: { id: "verified-user" },
    });
    mocks.rpc.mockResolvedValue({ data: state("playing", 30), error: null });
  });
  it("rejects malformed input before touching the database", async () => {
    for (const entries of [
      { room: "not-a-uuid", source: video, state: "playing", position: "1" },
      {
        room,
        source: "https://www.dailymotion.com/video/x1",
        state: "playing",
        position: "1",
      },
      { room, source: video, state: "rewind", position: "1" },
      { room, source: video, state: "playing", position: "-1" },
      { room, source: video, state: "playing", position: "NaN" },
      { room, source: video, state: "playing", position: "Infinity" },
      { room, source: video, state: "playing", position: "172801" },
    ])
      expect(
        await updatePlayback(initialResult, form(entries)),
        JSON.stringify(entries),
      ).toEqual({ status: "error", code: "invalid" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires a verified account and never sends a client actor", async () => {
    mocks.currentAccount.mockResolvedValueOnce({
      client: { rpc: mocks.rpc },
      user: null,
    });
    const entries = {
      room,
      source: video,
      state: "playing",
      position: "30.12345",
      user: "someone-else",
    };
    expect(await updatePlayback(initialResult, form(entries))).toMatchObject({
      code: "auth",
    });
    expect(await updatePlayback(initialResult, form(entries))).toEqual({
      status: "success",
      code: "saved",
      playback: state("playing", 30),
    });
    expect(mocks.rpc).toHaveBeenCalledWith("set_room_playback", {
      p_room: room,
      p_source: video,
      p_state: "playing",
      p_position: 30.123,
    });
  });
  it("maps database refusals without leaking details", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "slow_down" },
    });
    const entries = { room, source: video, state: "paused", position: "3" };
    expect(await updatePlayback(initialResult, form(entries))).toEqual({
      status: "error",
      code: "rateLimit",
    });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "42501", message: "forbidden" },
    });
    expect(await updatePlayback(initialResult, form(entries))).toEqual({
      status: "error",
      code: "failed",
    });
  });
});
