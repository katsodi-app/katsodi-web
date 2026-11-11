import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  rpc: vi.fn(),
  format: "music",
  member: true,
  closed: false,
  currentSource: "",
  queryError: false,
}));
vi.mock("@/lib/supabase/server", () => ({ currentAccount: mocks.account }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Error(`REDIRECT:${path}`);
  },
}));
import { listenInRoom } from "../../src/lib/server/music-actions";
import { initialResult, safeNext } from "../../src/lib/server/contracts";
const current = "10000000-0000-4000-8000-000000000001",
  created = "10000000-0000-4000-8000-000000000002";
const url = "https://open.spotify.com/track/" + "a".repeat(22);
const form = (source = url, room = current) => {
  const data = new FormData();
  data.set("url", source);
  data.set("room", room);
  data.set("title", "Selected song");
  return data;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.format = "music";
  mocks.member = true;
  mocks.closed = false;
  mocks.queryError = false;
  mocks.currentSource = "";
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "create_room" ? created : null,
    error: null,
  }));
  mocks.account.mockResolvedValue({
    user: { id: "verified" },
    client: {
      rpc: mocks.rpc,
      from(table: string) {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            error: mocks.queryError ? { message: "forbidden" } : null,
            data:
              table === "rooms"
                ? {
                    format: mocks.format,
                    closed_at: mocks.closed ? "2026-11-08" : null,
                    url: mocks.currentSource,
                  }
                : mocks.member
                  ? { user_id: "verified" }
                  : null,
          }),
        };
        return query;
      },
    },
  });
});
it("switches only an active music room and redirects directly to that room", async () => {
  await expect(listenInRoom(initialResult, form())).rejects.toThrow(
    `REDIRECT:/room/${current}`,
  );
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("set_room_source", {
    p_room: current,
    p_url: url,
  });
});
it.each(["video", "closed", "kicked", "forbidden"])(
  "creates a private music room instead of mutating a %s room",
  async (scenario) => {
    if (scenario === "video") mocks.format = "video";
    if (scenario === "closed") mocks.closed = true;
    if (scenario === "kicked") mocks.member = false;
    if (scenario === "forbidden") mocks.queryError = true;
    await expect(listenInRoom(initialResult, form())).rejects.toThrow(
      `REDIRECT:/room/${created}`,
    );
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("create_room", {
      p_name: "Selected song",
      p_description: "",
      p_format: "music",
      p_visibility: "private",
      p_url: url,
      p_art: "wave",
      p_fandom_id: null,
    });
  },
);
it("opens an already selected track without resetting it", async () => {
  mocks.currentSource = url;
  await expect(listenInRoom(initialResult, form())).rejects.toThrow(
    `REDIRECT:/room/${current}`,
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("does not create another room when source switching is throttled", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "slow_down" } });
  expect(await listenInRoom(initialResult, form())).toEqual({
    status: "error",
    code: "rateLimit",
  });
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it("rejects unsupported, credential-bearing and unsafe URLs before authentication or SQL", async () => {
  for (const source of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=abcdefghijk",
    "https://user:password@open.spotify.com/track/" + "a".repeat(22),
    "https://127.0.0.1/music",
    "https://open.spotify.com/playlist/" + "a".repeat(22),
  ])
    expect((await listenInRoom(initialResult, form(source))).code).toBe(
      "invalid",
    );
  expect(mocks.account).not.toHaveBeenCalled();
});
it("does not mutate without a verified session and preserves safe music return routes", async () => {
  mocks.account.mockResolvedValue({ client: { rpc: mocks.rpc }, user: null });
  expect((await listenInRoom(initialResult, form())).code).toBe("auth");
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(safeNext("/music/a-song")).toBe("/music/a-song");
  expect(safeNext("/music//evil.test")).toBe("/account");
});
