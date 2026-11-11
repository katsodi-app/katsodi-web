import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  resolve: vi.fn(),
  rpc: vi.fn(),
  room: { format: "music", closed_at: null } as {
    format: string;
    closed_at: string | null;
  } | null,
  member: true,
  queryError: false,
}));
vi.mock("@/lib/supabase/server", () => ({ currentAccount: mocks.account }));
vi.mock("@/lib/server/playlist-import", () => ({
  resolveImport: mocks.resolve,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Error(`REDIRECT:${path}`);
  },
}));
import {
  createNetworkRoom,
  importToQueue,
} from "../../src/lib/server/room-actions";
import { initialResult } from "../../src/lib/server/contracts";
const room = "10000000-0000-4000-8000-000000000001";
const url = "https://open.spotify.com/playlist/" + "p".repeat(22);
const urls = ["https://open.spotify.com/track/" + "t".repeat(22)];
const form = (values: Record<string, string>) => {
  const result = new FormData();
  Object.entries(values).forEach(([key, value]) => result.set(key, value));
  return result;
};
const creation = () =>
  form({
    name: "Music night",
    description: "",
    format: "music",
    visibility: "private",
    url: "",
    art: "wave",
    import: url,
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.room = { format: "music", closed_at: null };
  mocks.member = true;
  mocks.queryError = false;
  mocks.resolve.mockResolvedValue({
    status: "ok",
    urls,
    source: "Spotify",
    capped: false,
  });
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "create_room" ? room : 1,
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
            data:
              table === "rooms"
                ? mocks.room
                : mocks.member
                  ? { user_id: "verified" }
                  : null,
            error: mocks.queryError ? { message: "unavailable" } : null,
          }),
        };
        return query;
      },
    },
  });
});
describe("playlist authorization before provider requests", () => {
  it.each(["outsider", "missing", "closed", "video", "query failure"])(
    "does not resolve a playlist for %s rooms",
    async (scenario) => {
      if (scenario === "outsider") mocks.member = false;
      if (scenario === "missing") mocks.room = null;
      if (scenario === "closed") mocks.room!.closed_at = "2026-11-08";
      if (scenario === "video") mocks.room!.format = "video";
      if (scenario === "query failure") mocks.queryError = true;
      expect(
        (await importToQueue(initialResult, form({ room, url }))).status,
      ).toBe("error");
      expect(mocks.resolve).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it("imports for an active member and still lets SQL enforce insertion rights", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "forbidden" },
    });
    expect(await importToQueue(initialResult, form({ room, url }))).toEqual({
      status: "error",
      code: "failed",
    });
    expect(mocks.resolve).toHaveBeenCalledWith(url);
    expect(mocks.rpc).toHaveBeenCalledWith("add_room_queue_many", {
      p_room: room,
      p_urls: urls,
    });
  });
});
describe("room creation with a playlist", () => {
  it.each(["unconfigured", "notFound", "empty", "unsupported", "failed"])(
    "reports %s without creating an empty room",
    async (code) => {
      mocks.resolve.mockResolvedValue({
        status: "error",
        code,
        service: "Spotify",
      });
      const result = await createNetworkRoom(initialResult, creation());
      expect(result.status).toBe("error");
      expect(result.code).toBe(
        (
          {
            unconfigured: "importUnconfigured",
            notFound: "importNotFound",
            empty: "importEmpty",
            unsupported: "importUnsupported",
            failed: "failed",
          } as Record<string, string>
        )[code],
      );
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it("queues the resolved playlist and opens the new room", async () => {
    await expect(createNetworkRoom(initialResult, creation())).rejects.toThrow(
      `REDIRECT:/room/${room}`,
    );
    expect(mocks.rpc).toHaveBeenCalledWith("add_room_queue_many", {
      p_room: room,
      p_urls: urls,
    });
  });
  it.each(["database error", "network error", "zero added"])(
    "keeps the created room with a visible warning on %s",
    async (failure) => {
      mocks.rpc.mockImplementation(async (name: string) => {
        if (name === "create_room") return { data: room, error: null };
        if (failure === "network error") throw Error("offline");
        return {
          data: 0,
          error: failure === "database error" ? { message: "failed" } : null,
        };
      });
      await expect(
        createNetworkRoom(initialResult, creation()),
      ).rejects.toThrow(`REDIRECT:/room/${room}?import=failed`);
      expect(
        mocks.rpc.mock.calls.filter(([name]) => name === "create_room"),
      ).toHaveLength(1);
    },
  );
});
