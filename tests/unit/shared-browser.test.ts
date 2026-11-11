import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  rpc: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ currentAccount: mocks.account }));
import {
  createBrowserSession,
  grantHostRoles,
  safeEmbedUrl,
} from "../../src/lib/server/hyperbeam";
import {
  claimSharedBrowserControl,
  endSharedBrowser,
  startSharedBrowser,
} from "../../src/lib/server/browser-actions";
import { initialResult } from "../../src/lib/server/contracts";

const room = "20000000-0000-4000-8000-000000000001";
const KEY = "hb_test_key_0123456789";
const embed = "https://abc123.hyperbeam.com/AbCdEf?token=viewer-secret";
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
let rpcResults: Record<string, { data: unknown; error: unknown }>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("HYPERBEAM_API_KEY", KEY);
  vi.stubGlobal("fetch", mocks.fetch);
  rpcResults = {
    can_host_room_browser: { data: true, error: null },
    set_room_browser: { data: null, error: null },
    end_room_browser: { data: "session-1", error: null },
    get_room_browser: { data: { embed_url: embed }, error: null },
  };
  mocks.rpc.mockImplementation(async (name: string) => rpcResults[name]);
  mocks.account.mockResolvedValue({
    client: { rpc: mocks.rpc },
    user: { id: "u" },
  });
  mocks.fetch.mockImplementation(async (url: string, init: RequestInit) =>
    init.method === "POST" && url.endsWith("/v0/vm")
      ? json({ session_id: "session-new", embed_url: embed, admin_token: "x" })
      : json({ ok: true }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Hyperbeam client", () => {
  it("creates sessions with no default roles, bounded timeouts and the key only in the header", async () => {
    expect(await createBrowserSession("https://example.org/")).toEqual({
      sessionId: "session-new",
      embedUrl: embed,
    });
    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url).toBe("https://engine.hyperbeam.com/v0/vm");
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(init.body)).toEqual({
      start_url: "https://example.org/",
      default_roles: [],
      timeout: { absolute: 14400, offline: 300 },
    });
  });
  it("accepts only Hyperbeam HTTPS embed URLs", async () => {
    for (const bad of [
      "https://evil.example/x",
      "https://hyperbeam.com.evil.example/x",
      "http://abc.hyperbeam.com/x",
      "javascript:alert(1)",
    ])
      expect(safeEmbedUrl(bad), bad).toBeNull();
    mocks.fetch.mockResolvedValueOnce(
      json({ session_id: "session-new", embed_url: "https://evil.example/" }),
    );
    await expect(
      createBrowserSession("https://example.org/"),
    ).rejects.toThrow();
  });
  it("grants control and tab roles at the session's addRoles endpoint", async () => {
    await grantHostRoles(embed, "1f2e3d4c-aaaa-bbbb");
    const [url, init] = mocks.fetch.mock.calls[0];
    // The viewer token in the embed URL is not forwarded.
    expect(url).toBe("https://abc123.hyperbeam.com/AbCdEf/addRoles");
    expect(JSON.parse(init.body)).toEqual([
      ["1f2e3d4c-aaaa-bbbb"],
      ["control", "chrome_apis"],
      false,
    ]);
    await expect(grantHostRoles(embed, "bad id!")).rejects.toThrow();
  });
});

describe("shared browser actions", () => {
  it("reports unconfigured without a key and never calls Hyperbeam", async () => {
    vi.stubEnv("HYPERBEAM_API_KEY", "");
    expect(
      await startSharedBrowser(
        initialResult,
        form({ room, url: "https://example.org/" }),
      ),
    ).toEqual({ status: "error", code: "unconfigured" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("checks the host role before creating a paid session", async () => {
    rpcResults.can_host_room_browser = { data: false, error: null };
    expect(
      await startSharedBrowser(
        initialResult,
        form({ room, url: "https://example.org/" }),
      ),
    ).toEqual({ status: "error", code: "auth" });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(
      await startSharedBrowser(
        initialResult,
        form({ room, url: "javascript:x" }),
      ),
    ).toEqual({ status: "error", code: "invalid" });
  });
  it("records the session and ends the previous one", async () => {
    rpcResults.set_room_browser = { data: "session-old", error: null };
    expect(
      await startSharedBrowser(
        initialResult,
        form({ room, url: "https://example.org/" }),
      ),
    ).toEqual({ status: "success", code: "saved" });
    expect(mocks.rpc).toHaveBeenCalledWith("set_room_browser", {
      p_room: room,
      p_session: "session-new",
      p_embed: embed,
    });
    const deleted = mocks.fetch.mock.calls.find(
      ([, init]) => init.method === "DELETE",
    );
    expect(deleted?.[0]).toBe("https://engine.hyperbeam.com/v0/vm/session-old");
  });
  it("deletes a new session that could not be recorded", async () => {
    rpcResults.set_room_browser = {
      data: null,
      error: { code: "42501", message: "forbidden" },
    };
    expect(
      await startSharedBrowser(
        initialResult,
        form({ room, url: "https://example.org/" }),
      ),
    ).toEqual({ status: "error", code: "failed" });
    const deleted = mocks.fetch.mock.calls.find(
      ([, init]) => init.method === "DELETE",
    );
    expect(deleted?.[0]).toBe("https://engine.hyperbeam.com/v0/vm/session-new");
  });
  it("ends a session at Hyperbeam and grants control only to hosts", async () => {
    expect(await endSharedBrowser(initialResult, form({ room }))).toEqual({
      status: "success",
      code: "saved",
    });
    expect(mocks.fetch.mock.calls[0][0]).toBe(
      "https://engine.hyperbeam.com/v0/vm/session-1",
    );
    mocks.fetch.mockClear();
    expect(
      await claimSharedBrowserControl(
        initialResult,
        form({ room, connection: "1f2e3d4c-aaaa-bbbb" }),
      ),
    ).toEqual({ status: "success", code: "saved" });
    rpcResults.can_host_room_browser = { data: false, error: null };
    mocks.fetch.mockClear();
    expect(
      await claimSharedBrowserControl(
        initialResult,
        form({ room, connection: "1f2e3d4c-aaaa-bbbb" }),
      ),
    ).toEqual({ status: "error", code: "auth" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
