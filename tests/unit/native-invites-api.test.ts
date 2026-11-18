import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createInvite: vi.fn(),
  revokeInvite: vi.fn(),
  moderateRoom: vi.fn(),
  redeem: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: () => {
    throw new Error("cookies must not be read for a native request");
  },
}));
vi.mock("../../src/lib/server/room-actions", () => ({
  createInvite: mocks.createInvite,
  revokeInvite: mocks.revokeInvite,
  moderateRoom: mocks.moderateRoom,
}));
vi.mock("../../src/lib/server/invite-operations", () => ({
  redeemInviteToken: mocks.redeem,
}));

import { POST as issue } from "../../src/app/api/native/v1/rooms/[roomId]/invites/route";
import { DELETE as revoke } from "../../src/app/api/native/v1/rooms/[roomId]/invites/[inviteId]/route";
import { POST as moderate } from "../../src/app/api/native/v1/rooms/[roomId]/members/[userId]/route";
import { POST as redeem } from "../../src/app/api/native/v1/invites/redeem/route";

const bearer = `Bearer ${"a".repeat(20)}.${"b".repeat(40)}.${"c".repeat(30)}`;
const room = "10000000-0000-4000-8000-000000000001";
const user = "20000000-0000-4000-8000-000000000002";
const token = "t".repeat(43);
const request = (method: string, body?: unknown, auth = true) =>
  new Request("http://localhost/api/native/v1/x", {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: bearer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = <T>(value: T) => ({ params: Promise.resolve(value) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("native invitations and moderation", () => {
  it("issues an invitation with the website's join link", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://katsodi.example");
    mocks.createInvite.mockResolvedValue({
      status: "success",
      code: "saved",
      invite: { id: user, token },
    });
    const response = await issue(request("POST"), params({ roomId: room }));
    expect(response.status).toBe(201);
    expect((await response.json()).invite).toEqual({
      id: user,
      token,
      link: `https://katsodi.example/join#${token}`,
    });
    expect(mocks.createInvite.mock.calls[0][1].get("room")).toBe(room);
  });

  it("gives no link without a configured public origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    mocks.createInvite.mockResolvedValue({
      status: "success",
      code: "saved",
      invite: { id: user, token },
    });
    const response = await issue(request("POST"), params({ roomId: room }));
    expect((await response.json()).invite.link).toBeNull();
  });

  it("requires a signed-in caller", async () => {
    const response = await issue(
      request("POST", undefined, false),
      params({ roomId: room }),
    );
    expect(response.status).toBe(401);
    expect(mocks.createInvite).not.toHaveBeenCalled();
  });

  it("maps a refused invitation to an error envelope", async () => {
    mocks.createInvite.mockResolvedValue({ status: "error", code: "failed" });
    const response = await issue(request("POST"), params({ roomId: room }));
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect((await response.json()).error.messageKey).toMatch(/^native\./);
  });

  it("revokes an invitation", async () => {
    mocks.revokeInvite.mockResolvedValue({ status: "success", code: "saved" });
    const response = await revoke(
      request("DELETE"),
      params({ roomId: room, inviteId: user }),
    );
    expect(response.status).toBe(200);
    expect(mocks.revokeInvite.mock.calls[0][1].get("invite")).toBe(user);
  });

  it("passes only known moderation operations", async () => {
    mocks.moderateRoom.mockResolvedValue({ status: "success", code: "saved" });
    const ok = await moderate(
      request("POST", { operation: "kick" }),
      params({ roomId: room, userId: user }),
    );
    expect(ok.status).toBe(200);
    const form = mocks.moderateRoom.mock.calls[0][1];
    expect([form.get("room"), form.get("user"), form.get("operation")]).toEqual(
      [room, user, "kick"],
    );
    for (const body of [
      { operation: "ban" },
      { operation: "kick", x: 1 },
      {},
    ]) {
      const bad = await moderate(
        request("POST", body),
        params({ roomId: room, userId: user }),
      );
      expect(bad.status).toBe(400);
    }
    expect(mocks.moderateRoom).toHaveBeenCalledTimes(1);
  });

  it("redeems a token and returns the room", async () => {
    mocks.redeem.mockResolvedValue({ status: "redeemed", roomId: room });
    const response = await redeem(request("POST", { token }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ roomId: room });
    expect(mocks.redeem.mock.calls[0][0].get("token")).toBe(token);
    const bad = await redeem(request("POST", { token: 5 }));
    expect(bad.status).toBe(400);
  });
});
