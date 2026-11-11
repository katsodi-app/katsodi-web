import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  viewer: vi.fn(),
  format: "music",
  joined: true,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ currentViewer: mocks.viewer }));
vi.mock("@/lib/server/hyperbeam", () => ({ hyperbeamKey: () => null }));
vi.mock("@/lib/server/voice", () => ({ voiceConfig: () => null }));
import { roomSnapshot } from "../../src/lib/server/network-data";
const id = "10000000-0000-4000-8000-000000000001";
const tracks = Array.from({ length: 300 }, (_, index) => ({
  id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  url: `https://example.org/${index}`,
  added_by: id,
  created_at: "2026-11-08",
}));
beforeEach(() => {
  mocks.format = "music";
  mocks.joined = true;
  mocks.viewer.mockResolvedValue({
    userId: id,
    client: {
      rpc: async () => ({ data: true, error: null }),
      from(table: string) {
        let count = Infinity;
        const result = () => ({
          error: null,
          data:
            table === "rooms"
              ? {
                  id,
                  owner_id: "10000000-0000-4000-8000-000000000002",
                  name: "Music",
                  description: "",
                  format: mocks.format,
                  visibility: "private",
                  url: "",
                  art: "wave",
                  closed_at: null,
                  created_at: "2026-11-08",
                }
              : table === "room_members"
                ? mocks.joined
                  ? [{ user_id: id, role: "member", status: "active" }]
                  : []
                : table === "room_queue"
                  ? tracks.slice(0, count)
                  : table === "room_sites"
                    ? null
                    : [],
        });
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          in: () => query,
          limit: (value: number) => {
            count = value;
            return query;
          },
          maybeSingle: async () => result(),
          then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
            Promise.resolve(result()).then(resolve),
        };
        return query;
      },
    },
  });
});
it("returns all 300 music tracks, including tracks beyond the old 50-item window", async () => {
  const snapshot = await roomSnapshot(id);
  expect(snapshot?.queue).toHaveLength(300);
  expect(snapshot?.queue?.at(-1)?.url).toBe(tracks[299].url);
});
it("keeps the 50-item video queue limit", async () => {
  mocks.format = "video";
  expect((await roomSnapshot(id))?.queue).toHaveLength(50);
});
it("does not expose a queue to nonmembers", async () => {
  mocks.joined = false;
  expect((await roomSnapshot(id))?.queue).toBeUndefined();
});
