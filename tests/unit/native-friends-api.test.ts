import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendFriendRequest: vi.fn(),
  respondFriendRequest: vi.fn(),
  cancelFriendRequest: vi.fn(),
  changeFriendship: vi.fn(),
  currentAccount: vi.fn(),
  loadProfile: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: () => {
    throw new Error("cookies must not be read for a native request");
  },
}));
vi.mock("../../src/lib/server/friend-actions", () => ({
  sendFriendRequest: mocks.sendFriendRequest,
  respondFriendRequest: mocks.respondFriendRequest,
  cancelFriendRequest: mocks.cancelFriendRequest,
  changeFriendship: mocks.changeFriendship,
}));
vi.mock("../../src/lib/supabase/server", () => ({
  currentAccount: mocks.currentAccount,
}));
vi.mock("../../src/lib/server/public-profile", () => ({
  loadProfile: mocks.loadProfile,
}));

import { GET as friends } from "../../src/app/api/native/v1/friends/route";
import { POST as ask } from "../../src/app/api/native/v1/friends/requests/route";
import {
  DELETE as withdraw,
  POST as answer,
} from "../../src/app/api/native/v1/friends/requests/[requestId]/route";
import { POST as person } from "../../src/app/api/native/v1/people/[userId]/route";
import { GET as profile } from "../../src/app/api/native/v1/profiles/[username]/route";

const bearer = `Bearer ${"a".repeat(20)}.${"b".repeat(40)}.${"c".repeat(30)}`;
const id = "60000000-0000-4000-8000-000000000006";
const me = "70000000-0000-4000-8000-000000000007";
const call = (body?: unknown, method = "POST") =>
  new Request("http://localhost/api/native/v1/x", {
    method,
    headers: {
      authorization: bearer,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentAccount.mockResolvedValue({
    client: { rpc: mocks.rpc },
    user: { id: me },
  });
});

describe("native friends", () => {
  it("returns the overview and hides a missing migration as unavailable", async () => {
    const overview = {
      friends: [
        { id, username: "anna", display_name: "Anna", since: "2026-11-01" },
      ],
      incoming: [],
      outgoing: [],
      blocked: [],
    };
    mocks.rpc.mockResolvedValue({ data: overview, error: null });
    const ok = await friends(call(undefined, "GET"));
    expect(ok.status).toBe(200);
    expect((await ok.json()).friends[0].username).toBe("anna");
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    expect((await friends(call(undefined, "GET"))).status).toBe(503);
  });

  it("asks by username through the website's action and reports its outcome", async () => {
    mocks.sendFriendRequest.mockImplementation(
      async (_p: unknown, form: FormData) => {
        expect(form.get("username")).toBe("@anna");
        return { status: "success", code: "saved", friend: "sent" };
      },
    );
    const sent = await ask(call({ username: "@anna" }));
    expect(sent.status).toBe(201);
    expect(await sent.json()).toEqual({ outcome: "sent" });
    for (const bad of [{}, { username: "a", extra: 1 }, { name: "a" }])
      expect((await ask(call(bad))).status).toBe(400);
  });

  it("answers, withdraws and changes friendships with strict bodies", async () => {
    const params = { params: Promise.resolve({ requestId: id }) };
    mocks.respondFriendRequest.mockResolvedValue({
      status: "success",
      code: "saved",
    });
    expect((await answer(call({ accept: true }), params)).status).toBe(200);
    expect(mocks.respondFriendRequest.mock.calls[0][1].get("accept")).toBe(
      "true",
    );
    expect((await answer(call({ accept: "yes" }), params)).status).toBe(400);
    mocks.cancelFriendRequest.mockResolvedValue({
      status: "error",
      code: "failed",
    });
    expect((await withdraw(call(undefined, "DELETE"), params)).status).toBe(
      403,
    );
    const who = { params: Promise.resolve({ userId: id }) };
    mocks.changeFriendship.mockResolvedValue({
      status: "success",
      code: "saved",
    });
    expect((await person(call({ operation: "block" }), who)).status).toBe(200);
    expect(mocks.changeFriendship.mock.calls[0][1].get("operation")).toBe(
      "block",
    );
    expect((await person(call({ operation: "delete" }), who)).status).toBe(400);
  });

  it("shows a profile the caller may see, and hides the rest as not found", async () => {
    const params = { params: Promise.resolve({ username: "Anna" }) };
    mocks.loadProfile.mockResolvedValue(null);
    expect((await profile(call(undefined, "GET"), params)).status).toBe(404);
    expect(mocks.loadProfile.mock.calls[0][1]).toBe("anna");
    mocks.loadProfile.mockResolvedValue({
      id: me,
      username: "anna",
      display_name: "Anna",
      bio: "",
      fandoms: [],
      communityFandoms: [],
      progress: null,
    });
    const ok = await profile(call(undefined, "GET"), params);
    expect(ok.status).toBe(200);
    expect((await ok.json()).self).toBe(true);
  });
});
