import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  queue: [] as { room_id: string }[],
  listing: {} as Record<string, { name: string; id: string | null }[]>,
  removed: [] as string[][],
  dequeued: [] as string[],
  removeFails: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: mocks.rpc,
    from: () => {
      const query = {
        select: () => query,
        order: () => query,
        limit: async () => ({ data: mocks.queue, error: null }),
        delete: () => ({
          eq: async (_column: string, room: string) => {
            mocks.dequeued.push(room);
            return { error: null };
          },
        }),
      };
      return query;
    },
    storage: {
      from: () => ({
        list: async (
          prefix: string,
          { limit, offset = 0 }: { limit: number; offset?: number },
        ) => ({
          data: (mocks.listing[prefix] ?? []).slice(offset, offset + limit),
          error: null,
        }),
        remove: async (paths: string[]) => {
          if (mocks.removeFails) return { error: { message: "down" } };
          mocks.removed.push(paths);
          return { error: null };
        },
      }),
    },
  }),
}));

import { runRoomLifecycle } from "../../src/lib/server/room-lifecycle";
import { POST } from "../../src/app/api/internal/rooms-lifecycle/route";

const room = "20000000-0000-4000-8000-000000000001";
beforeEach(() => {
  mocks.rpc.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
  vi.stubEnv("VOICE_WORKER_SECRET", "scheduler-secret");
  mocks.rpc.mockResolvedValue({
    data: [{ inactive: 2, deleted: 1 }],
    error: null,
  });
  mocks.queue = [{ room_id: room }];
  mocks.listing = {
    [room]: [{ name: "msg-1", id: null }],
    [`${room}/msg-1`]: [{ name: "a.webp", id: "f1" }],
  };
  mocks.removed = [];
  mocks.dequeued = [];
  mocks.removeFails = false;
});
afterEach(() => vi.unstubAllEnvs());

describe("room lifecycle runner", () => {
  it("runs the database step and removes a deleted room's images", async () => {
    expect(await runRoomLifecycle()).toEqual({
      inactive: 2,
      deleted: 1,
      cleaned: 1,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("run_room_lifecycle");
    expect(mocks.removed).toEqual([[`${room}/msg-1/a.webp`]]);
    expect(mocks.dequeued).toEqual([room]);
  });
  it("pages through listings longer than one Storage page", async () => {
    mocks.listing = {
      [room]: Array.from({ length: 1001 }, (_, i) => ({
        name: `u${i}`,
        id: null,
      })),
    };
    mocks.listing[`${room}/u1000`] = Array.from({ length: 1002 }, (_, i) => ({
      name: `${i}.webp`,
      id: `f${i}`,
    }));
    await runRoomLifecycle();
    const removed = mocks.removed.flat();
    expect(removed).toHaveLength(1002);
    expect(removed).toContain(`${room}/u1000/1001.webp`);
    expect(mocks.dequeued).toEqual([room]);
  });
  it("keeps the cleanup queued when Storage fails", async () => {
    mocks.removeFails = true;
    await expect(runRoomLifecycle()).rejects.toThrow("storage_unavailable");
    expect(mocks.dequeued).toEqual([]);
  });
});

describe("lifecycle endpoint", () => {
  const call = (auth?: string) =>
    POST(
      new Request("http://localhost/api/internal/rooms-lifecycle", {
        method: "POST",
        headers: auth ? { Authorization: auth } : {},
      }),
    );
  it("refuses callers without the scheduler secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("runs for the trusted scheduler", async () => {
    const response = await call("Bearer scheduler-secret");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ inactive: 2, deleted: 1 });
  });
  it("is unavailable without service credentials", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect((await call("Bearer scheduler-secret")).status).toBe(401);
  });
});
