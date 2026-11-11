import { beforeEach, describe, expect, it, vi } from "vitest";
import { mergeRoomSnapshot } from "../../src/lib/room-sync";
import type {
  RoomMessage,
  RoomSnapshot,
} from "../../src/lib/server/network-data";

const mocks = vi.hoisted(() => ({ viewer: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ currentViewer: mocks.viewer }));
import { roomSnapshot } from "../../src/lib/server/network-data";

const roomId = "20000000-0000-4000-8000-000000000001",
  me = "10000000-0000-4000-8000-000000000001";
const id = (n: number) =>
  `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const message = (n: number): RoomMessage => ({
  id: id(n),
  sender_id: me,
  body: `message ${n}`,
  created_at: new Date(Date.UTC(2026, 10, 4, 12, 0, n)).toISOString(),
  kind: "text",
});
const room = {
  id: roomId,
  owner_id: me,
  name: "Evening",
  description: "",
  format: "video" as const,
  visibility: "public" as const,
  url: "",
  art: "orbit" as const,
  closed_at: null,
  created_at: "2026-11-04T12:00:00.000Z",
};
const snapshot = (
  messages: RoomMessage[],
  messageIds?: string[],
): RoomSnapshot => ({
  room,
  userId: me,
  joined: true,
  members: [{ user_id: me, role: "owner", status: "active" }],
  messages,
  ...(messageIds ? { messageIds } : {}),
  profiles: [],
  invites: [],
});

describe("mergeRoomSnapshot", () => {
  it("replaces the snapshot with a full response", () => {
    const next = snapshot([message(2)]);
    expect(mergeRoomSnapshot(snapshot([message(1)]), next)).toBe(next);
  });
  it("appends new rows and keeps known rows from the previous snapshot", () => {
    const merged = mergeRoomSnapshot(
      snapshot([message(1), message(2)]),
      snapshot([message(3)], [id(1), id(2), id(3)]),
    );
    expect(merged?.messages.map((m) => m.body)).toEqual([
      "message 1",
      "message 2",
      "message 3",
    ]);
    expect(merged).not.toHaveProperty("messageIds");
  });
  it("drops messages that left the window, including deletions", () => {
    const merged = mergeRoomSnapshot(
      snapshot([message(1), message(2), message(3)]),
      snapshot([], [id(1), id(3)]),
    );
    expect(merged?.messages.map((m) => m.id)).toEqual([id(1), id(3)]);
  });
  it("asks for a full resync when the delta does not line up", () => {
    expect(
      mergeRoomSnapshot(snapshot([message(2)]), snapshot([], [id(1), id(2)])),
    ).toBeNull();
    expect(mergeRoomSnapshot(null, snapshot([], [id(1)]))).toBeNull();
  });
});

/** Minimal PostgREST stand-in that records which message queries ran. */
function fakeClient(stored: RoomMessage[], memberIds = [me]) {
  const calls: string[] = [];
  const newestFirst = [...stored].reverse();
  const from = (table: string) => {
    let columns = "*";
    let inIds: string[] | null = null;
    const result = () => {
      if (table === "rooms") return room;
      if (table === "room_members")
        return memberIds.map((user_id) => ({
          user_id,
          role: user_id === me ? "owner" : "member",
          status: "active",
        }));
      if (table === "profiles") return [];
      if (table === "room_invites") return [];
      if (inIds) return stored.filter((m) => inIds!.includes(m.id));
      return columns === "id"
        ? newestFirst.map(({ id }) => ({ id }))
        : newestFirst;
    };
    const query = {
      select(value: string) {
        columns = value;
        return query;
      },
      eq: () => query,
      is: () => query,
      gt: () => query,
      order: () => query,
      limit: () => query,
      in(_column: string, values: string[]) {
        inIds = values;
        return query;
      },
      maybeSingle: async () => ({ data: result(), error: null }),
      then(resolve: (value: unknown) => void) {
        if (table === "room_messages")
          calls.push(inIds ? `in:${inIds.length}` : `window:${columns}`);
        resolve({ data: result(), error: null });
      },
    };
    return query;
  };
  return {
    calls,
    client: {
      from,
      rpc: async () => ({ data: true, error: null }),
    },
  };
}

describe("roomSnapshot message deltas", () => {
  beforeEach(() => {
    mocks.viewer.mockReset();
  });
  it("returns the full window when no cursor is given", async () => {
    const fake = fakeClient([message(1), message(2)]);
    mocks.viewer.mockResolvedValue({ client: fake.client, userId: me });
    const result = await roomSnapshot(roomId);
    expect(fake.calls).toEqual(["window:*"]);
    expect(result?.messages.map((m) => m.id)).toEqual([id(1), id(2)]);
    expect(result?.messageIds).toBeUndefined();
  });
  it("sends only the id window when nothing is new", async () => {
    const fake = fakeClient([message(1), message(2)]);
    mocks.viewer.mockResolvedValue({ client: fake.client, userId: me });
    const result = await roomSnapshot(roomId, id(2));
    expect(fake.calls).toEqual(["window:id"]);
    expect(result?.messages).toEqual([]);
    expect(result?.messageIds).toEqual([id(1), id(2)]);
  });
  it("fetches full rows only for messages newer than the cursor", async () => {
    const fake = fakeClient([message(1), message(2), message(3), message(4)]);
    mocks.viewer.mockResolvedValue({ client: fake.client, userId: me });
    const result = await roomSnapshot(roomId, id(2));
    expect(fake.calls).toEqual(["window:id", "in:2"]);
    expect(result?.messages.map((m) => m.id)).toEqual([id(3), id(4)]);
    expect(result?.messageIds).toEqual([id(1), id(2), id(3), id(4)]);
  });
  it("falls back to a full window for an unknown cursor", async () => {
    const fake = fakeClient([message(1), message(2)]);
    mocks.viewer.mockResolvedValue({ client: fake.client, userId: me });
    const result = await roomSnapshot(roomId, id(99));
    expect(fake.calls).toEqual(["window:id", "window:*"]);
    expect(result?.messageIds).toBeUndefined();
    expect(result?.messages).toHaveLength(2);
  });
  it("never returns messages to a signed-in non-member", async () => {
    const fake = fakeClient([message(1)], []);
    mocks.viewer.mockResolvedValue({ client: fake.client, userId: me });
    const result = await roomSnapshot(roomId, id(1));
    expect(result?.joined).toBe(false);
    expect(result?.messages).toEqual([]);
    expect(fake.calls).toEqual([]);
  });
});
