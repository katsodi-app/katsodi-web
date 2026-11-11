import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { privacyVersion, termsVersion } from "../../src/content/legal/versions";
const mocks = vi.hoisted(() => ({
  currentAccount: vi.fn(),
  serverSupabase: vi.fn(),
  rpc: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  getUser: vi.fn(),
  recover: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  currentAccount: mocks.currentAccount,
  serverSupabase: mocks.serverSupabase,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error("REDIRECT:" + path);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  updateRoomSource,
  createNetworkRoom,
  createInvite,
  joinNetworkRoom,
  sendMessage,
  sendSticker,
  moderateRoom,
  redeemInvite,
} from "../../src/lib/server/room-actions";
import {
  signIn,
  signUp,
  recoverPassword,
} from "../../src/lib/server/auth-actions";
import { initialResult } from "../../src/lib/server/contracts";
import { createHash } from "node:crypto";
const rid = "10000000-0000-4000-8000-000000000001";
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: rid, error: null });
  mocks.currentAccount.mockResolvedValue({
    client: { rpc: mocks.rpc },
    user: { id: "verified-user", email_confirmed_at: "2026-11-01" },
  });
  mocks.serverSupabase.mockResolvedValue({
    auth: {
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
      getUser: mocks.getUser,
      resetPasswordForEmail: mocks.recover,
    },
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "verified-user", email_confirmed_at: "2026-11-01" } },
    error: null,
  });
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:3000");
});
afterEach(() => vi.unstubAllEnvs());
describe("server mutations fail closed", () => {
  it("validates source changes and never accepts a client-supplied actor", async () => {
    expect(
      await updateRoomSource(
        initialResult,
        form({ room: rid, url: "javascript:alert(1)" }),
      ),
    ).toEqual({ status: "error", code: "invalid" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(
      await updateRoomSource(
        initialResult,
        form({
          room: rid,
          url: "https://youtu.be/M7lc1UVf-VE",
          user: "forged-owner",
        }),
      ),
    ).toEqual({ status: "success", code: "saved" });
    expect(mocks.rpc).toHaveBeenCalledWith("set_room_source", {
      p_room: rid,
      p_url: "https://youtu.be/M7lc1UVf-VE",
    });
  });
  it("forwards optional fandom as null and rejects invented associations before RPC", async () => {
    const fields = {
      name: "Dune night",
      description: "",
      format: "video",
      visibility: "public",
      url: "",
      art: "orbit",
    };
    expect(
      await createNetworkRoom(
        initialResult,
        form({ ...fields, fandomId: "made-up" }),
      ),
    ).toEqual({
      status: "error",
      code: "invalid",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    await expect(
      createNetworkRoom(initialResult, form(fields)),
    ).rejects.toThrow(`REDIRECT:/room/${rid}`);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_room",
      expect.objectContaining({ p_fandom_id: null }),
    );
    mocks.rpc.mockClear();
    await expect(
      createNetworkRoom(
        initialResult,
        form({ ...fields, fandomId: "cinema-6" }),
      ),
    ).rejects.toThrow(`REDIRECT:/room/${rid}`);
    expect(mocks.rpc).toHaveBeenCalledWith("create_room", {
      p_name: "Dune night",
      p_description: "",
      p_format: "video",
      p_visibility: "public",
      p_url: "",
      p_art: "orbit",
      p_fandom_id: "cinema-6",
    });
  });
  it("restricts sticker IDs and derives the sender on the server", async () => {
    expect(
      (
        await sendSticker(
          initialResult,
          form({ room: rid, sticker: "not-a-sticker" }),
        )
      ).code,
    ).toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
    await sendSticker(
      initialResult,
      form({ room: rid, sticker: "cozy", sender_id: "someone-else" }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("send_room_sticker", {
      p_room: rid,
      p_sticker: "cozy",
    });
  });
  it("does not call SQL without a verified account", async () => {
    mocks.currentAccount.mockResolvedValue({
      client: { rpc: mocks.rpc },
      user: null,
    });
    expect(await joinNetworkRoom(initialResult, form({ room: rid }))).toEqual({
      status: "error",
      code: "auth",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not call SQL with invalid content or operations", async () => {
    expect(
      (await sendMessage(initialResult, form({ room: rid, body: " " }))).code,
    ).toBe("invalid");
    expect(
      (
        await moderateRoom(
          initialResult,
          form({ room: rid, user: rid, operation: "become-owner" }),
        )
      ).code,
    ).toBe("invalid");
    expect(
      (await redeemInvite(initialResult, form({ token: "invalid" }))).code,
    ).toBe("invalid");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("never accepts a sender ID from a message form", async () => {
    await sendMessage(
      initialResult,
      form({ room: rid, body: "Hello", sender_id: "victim" }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("send_room_message", {
      p_room: rid,
      p_body: "Hello",
    });
  });
  it("only sends an invite hash to SQL and returns a fresh 256-bit credential", async () => {
    const result = await createInvite(initialResult, form({ room: rid }));
    expect(result.status).toBe("success");
    expect(result.invite?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mocks.rpc).toHaveBeenCalledWith("create_room_invite", {
      p_room: rid,
      p_hash: createHash("sha256").update(result.invite!.token).digest("hex"),
      p_max_uses: 10,
    });
  });
  it("returns a safe failure when PostgreSQL denies access", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "forbidden", details: "private data" },
    });
    expect(await joinNetworkRoom(initialResult, form({ room: rid }))).toEqual({
      status: "error",
      code: "failed",
    });
  });
});
describe("auth action boundaries", () => {
  it("does not return success when the backend is missing", async () => {
    mocks.serverSupabase.mockResolvedValue(null);
    expect(
      (
        await signIn(
          initialResult,
          form({ email: "person@example.test", password: "example-password" }),
        )
      ).code,
    ).toBe("unconfigured");
  });
  it("uses one sign-in error for unknown email or incorrect password", async () => {
    mocks.signIn.mockResolvedValue({ error: { message: "User not found" } });
    expect(
      await signIn(
        initialResult,
        form({ email: "person@example.test", password: "example-password" }),
      ),
    ).toEqual({ status: "error", code: "auth" });
  });
  it("does not follow an external next URL after sign-in", async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    await expect(
      signIn(
        initialResult,
        form({
          email: "person@example.test",
          password: "example-password",
          next: "https://evil.test",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/account");
  });
  it("does not disclose whether signup or recovery addresses exist", async () => {
    mocks.signUp.mockResolvedValue({ error: { code: "user_already_exists" } });
    mocks.recover.mockResolvedValue({ error: null });
    const data = form({
      email: "person@example.test",
      password: "example-password",
      terms: "accepted",
    });
    expect(await signUp(initialResult, data)).toEqual({
      status: "success",
      code: "sent",
    });
    expect(await recoverPassword(initialResult, data)).toEqual({
      status: "success",
      code: "sent",
    });
  });
  it("refuses sign-up without accepting the Terms", async () => {
    mocks.signUp.mockReset();
    for (const terms of [undefined, "", "on", "yes"]) {
      const fields: Record<string, string> = {
        email: "person@example.test",
        password: "example-password",
      };
      if (terms !== undefined) fields.terms = terms;
      expect(await signUp(initialResult, form(fields))).toEqual({
        status: "error",
        code: "terms",
      });
    }
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("records the accepted Terms and Privacy versions with a new account", async () => {
    mocks.signUp.mockReset();
    mocks.signUp.mockResolvedValue({ error: null });
    await signUp(
      initialResult,
      form({
        email: "person@example.test",
        password: "example-password",
        terms: "accepted",
      }),
    );
    const options = mocks.signUp.mock.calls[0][0].options;
    expect(options.data).toMatchObject({
      terms_version: termsVersion,
      privacy_version: privacyVersion,
    });
    expect(Date.parse(options.data.terms_accepted_at)).not.toBeNaN();
  });
});
