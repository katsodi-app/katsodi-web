import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createClient: vi.fn(),
  createServerClient: vi.fn(),
  sendMessage: vi.fn(),
  sendSticker: vi.fn(),
  createRoom: vi.fn(),
  addToQueue: vi.fn(),
  updatePlayback: vi.fn(),
  removeFromQueue: vi.fn(),
  playFromQueue: vi.fn(),
  bearerSeen: [] as (string | null)[],
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("../../src/lib/supabase/config", () => ({
  supabaseConfig: () => ({
    url: "https://project.supabase.co",
    key: "sb_publishable_test",
  }),
}));
vi.mock("../../src/lib/server/room-actions", () => ({
  sendMessage: mocks.sendMessage,
  sendSticker: mocks.sendSticker,
  addToQueue: mocks.addToQueue,
  updatePlayback: mocks.updatePlayback,
  removeFromQueue: mocks.removeFromQueue,
  playFromQueue: mocks.playFromQueue,
}));
vi.mock("../../src/lib/server/room-operations", () => ({
  createRoom: mocks.createRoom,
}));

import { bearerToken, parseBearer, runWithBearer } from "@/lib/supabase/actor";
import { serverSupabase } from "@/lib/supabase/server";
import { actionErrorCode, nativeRoute } from "@/lib/server/native-api";
import { POST as postMessage } from "../../src/app/api/native/v1/rooms/[roomId]/messages/route";
import { POST as createRoomRoute } from "../../src/app/api/native/v1/rooms/route";
import { GET as meta } from "../../src/app/api/native/v1/meta/route";
import { POST as queue } from "../../src/app/api/native/v1/rooms/[roomId]/queue/route";
import { POST as playback } from "../../src/app/api/native/v1/rooms/[roomId]/playback/route";
import { DELETE as unqueue } from "../../src/app/api/native/v1/rooms/[roomId]/queue/[itemId]/route";
import { POST as playItem } from "../../src/app/api/native/v1/rooms/[roomId]/queue/[itemId]/play/route";

const token = `${"a".repeat(20)}.${"b".repeat(40)}.${"c".repeat(30)}`;
const roomId = "20000000-0000-4000-8000-000000000001";
const params = { params: Promise.resolve({ roomId }) };
const jsonRequest = (url: string, body: unknown, auth: string | null = `Bearer ${token}`) =>
  new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: auth } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.bearerSeen.length = 0;
  mocks.cookies.mockImplementation(() => {
    throw new Error("cookies must not be read for a native request");
  });
  mocks.createClient.mockReturnValue({ kind: "bearer-client" });
});

describe("bearer parsing", () => {
  it("accepts exactly one well-formed bearer token", () => {
    expect(parseBearer(`Bearer ${token}`)).toEqual({ status: "ok", token });
    expect(parseBearer(null)).toEqual({ status: "missing" });
    expect(parseBearer("")).toEqual({ status: "missing" });
  });
  it("rejects anything ambiguous or malformed", () => {
    for (const header of [
      `bearer ${token}`,
      `Basic ${token}`,
      `Bearer  ${token}`,
      `Bearer ${token} `,
      `Bearer ${token}, Bearer ${token}`,
      `Bearer ${token}\n`,
      "Bearer not-a-jwt",
      `Bearer ${"a".repeat(9000)}`,
      `Bearer a.b.c`,
    ])
      expect(parseBearer(header).status, header).toBe("malformed");
  });
});

describe("request-scoped identity", () => {
  it("keeps concurrent requests' tokens apart", async () => {
    const seen = await Promise.all(
      ["first", "second", "third"].map((name) =>
        runWithBearer(name, async () => {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
          return bearerToken();
        }),
      ),
    );
    expect(seen).toEqual(["first", "second", "third"]);
    expect(bearerToken()).toBeNull();
  });
  it("builds a bearer client and never touches cookies on native requests", async () => {
    const client = await runWithBearer(token, () => serverSupabase());
    expect(client).toEqual({ kind: "bearer-client" });
    expect(mocks.cookies).not.toHaveBeenCalled();
    const options = mocks.createClient.mock.calls[0][2];
    expect(options.global.headers).toEqual({ Authorization: `Bearer ${token}` });
    expect(options.auth.persistSession).toBe(false);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
  it("still uses the cookie session for web requests", async () => {
    mocks.cookies.mockResolvedValue({ getAll: () => [], set: () => {} });
    mocks.createServerClient.mockReturnValue({ kind: "cookie-client" });
    expect(await serverSupabase()).toEqual({ kind: "cookie-client" });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

describe("native route plumbing", () => {
  const run = (auth: string | null, mode: "required" | "optional") =>
    nativeRoute(
      new Request("http://localhost/api/native/v1/x", {
        headers: auth ? { authorization: auth } : {},
      }),
      mode,
      async (requestId) => {
        mocks.bearerSeen.push(bearerToken());
        return Response.json({ requestId });
      },
    );
  it("requires a token where asked and never downgrades a bad one to a guest", async () => {
    const missing = await run(null, "required");
    expect(missing.status).toBe(401);
    const body = await missing.json();
    expect(body.error).toMatchObject({
      code: "auth_required",
      messageKey: "native.errorAuth",
      retryable: false,
    });
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(missing.headers.get("cache-control")).toBe("private, no-store");

    expect((await run("Bearer junk", "optional")).status).toBe(401);
    expect(mocks.bearerSeen).toEqual([]);

    expect((await run(null, "optional")).status).toBe(200);
    expect((await run(`Bearer ${token}`, "optional")).status).toBe(200);
    expect(mocks.bearerSeen).toEqual([null, token]);
  });
  it("maps shared outcomes to domain codes", () => {
    expect(actionErrorCode({ status: "error", code: "auth" })).toBe("auth_required");
    expect(actionErrorCode({ status: "error", code: "invalid" })).toBe("invalid_request");
    expect(actionErrorCode({ status: "error", code: "rateLimit" })).toBe("rate_limited");
    // "failed" hides whether the room is missing, closed or forbidden.
    expect(actionErrorCode({ status: "error", code: "failed" })).toBe("access_denied");
  });
  it("publishes only public bootstrap values", async () => {
    const response = await meta(new Request("http://localhost/api/native/v1/meta"));
    const body = await response.json();
    expect(body).toMatchObject({
      apiVersion: 1,
      supabase: { url: "https://project.supabase.co", publishableKey: "sb_publishable_test" },
    });
    expect(Date.parse(body.serverTime)).not.toBeNaN();
    expect(JSON.stringify(body)).not.toMatch(/secret|service_role/i);
  });
});

describe("native chat and room creation", () => {
  const url = `http://localhost/api/native/v1/rooms/${roomId}/messages`;
  it("sends text as the caller through the shared action", async () => {
    mocks.sendMessage.mockImplementation(async (_prev: unknown, form: FormData) => {
      mocks.bearerSeen.push(bearerToken());
      expect(form.get("room")).toBe(roomId);
      expect(form.get("body")).toBe("привет");
      return { status: "success", code: "saved" };
    });
    const response = await postMessage(jsonRequest(url, { body: "привет" }), params);
    expect(response.status).toBe(201);
    expect(mocks.bearerSeen).toEqual([token]);
  });
  it("rejects malformed bodies before any database work", async () => {
    for (const body of [
      { body: "a", extra: 1 },
      { body: 5 },
      { sticker: "x", body: "y" },
      {},
      [],
      "not json",
      { body: "x".repeat(5000) },
    ]) {
      const response = await postMessage(jsonRequest(url, body), params);
      expect(response.status, JSON.stringify(body).slice(0, 40)).toBe(400);
    }
    const wrongType = new Request(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "text/plain" },
      body: JSON.stringify({ body: "x" }),
    });
    expect((await postMessage(wrongType, params)).status).toBe(400);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });
  it("needs a token and reports denial without detail", async () => {
    expect((await postMessage(jsonRequest(url, { body: "x" }, null), params)).status).toBe(401);
    mocks.sendMessage.mockResolvedValue({ status: "error", code: "failed" });
    const denied = await postMessage(jsonRequest(url, { body: "x" }), params);
    expect(denied.status).toBe(403);
    expect((await denied.json()).error.code).toBe("access_denied");
  });
  it("creates rooms through the shared operation and rejects unknown fields", async () => {
    const create = "http://localhost/api/native/v1/rooms";
    expect(
      (await createRoomRoute(jsonRequest(create, { name: "x", owner_id: "someone" }))).status,
    ).toBe(400);
    mocks.createRoom.mockResolvedValue({ status: "created", id: roomId, importFailed: false });
    const created = await createRoomRoute(
      jsonRequest(create, { name: "Вечер", format: "video", visibility: "public" }),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ id: roomId, importFailed: false });
    const form: FormData = mocks.createRoom.mock.calls[0][0];
    expect(form.get("name")).toBe("Вечер");
  });
});

describe("native queue", () => {
  const url = `http://localhost/api/native/v1/rooms/${roomId}/queue`;
  it("adds a link through the shared action and rejects anything else", async () => {
    mocks.addToQueue.mockImplementation(async (_prev: unknown, form: FormData) => {
      expect(form.get("room")).toBe(roomId);
      expect(form.get("url")).toBe("https://youtu.be/x");
      return { status: "success", code: "saved" };
    });
    expect((await queue(jsonRequest(url, { url: "https://youtu.be/x" }), params)).status).toBe(201);
    for (const body of [{ url: "https://youtu.be/x", position: 1 }, { link: "x" }, {}])
      expect((await queue(jsonRequest(url, body), params)).status).toBe(400);
    mocks.addToQueue.mockResolvedValue({ status: "error", code: "queueFull" });
    const full = await queue(jsonRequest(url, { url: "https://youtu.be/y" }), params);
    expect(full.status).toBe(409);
    expect((await full.json()).error.code).toBe("queue_full");
  });
});

describe("native playback control", () => {
  const itemId = "30000000-0000-4000-8000-000000000002";
  const itemParams = { params: Promise.resolve({ roomId, itemId }) };
  const url = `http://localhost/api/native/v1/rooms/${roomId}/playback`;
  const body = { source: "https://youtu.be/dQw4w9WgXcQ", state: "paused", position: 12.5 };
  it("publishes play/pause/position through the shared action", async () => {
    mocks.updatePlayback.mockImplementation(async (_prev: unknown, form: FormData) => {
      mocks.bearerSeen.push(bearerToken());
      expect(form.get("room")).toBe(roomId);
      expect(form.get("state")).toBe("paused");
      expect(form.get("position")).toBe("12.5");
      return { status: "success", code: "saved", playback: { state: "paused", position: 12.5, updated_at: "t", source_url: body.source } };
    });
    const response = await playback(jsonRequest(url, body), params);
    expect(response.status).toBe(200);
    expect((await response.json()).playback.state).toBe("paused");
    expect(mocks.bearerSeen).toEqual([token]);
  });
  it("rejects incomplete, extra or mistyped fields and maps denials", async () => {
    for (const bad of [
      { source: body.source, state: "paused" },
      { ...body, extra: 1 },
      { ...body, position: "12" },
    ])
      expect((await playback(jsonRequest(url, bad), params)).status).toBe(400);
    expect(mocks.updatePlayback).not.toHaveBeenCalled();
    expect((await playback(jsonRequest(url, body, null), params)).status).toBe(401);
    mocks.updatePlayback.mockResolvedValue({ status: "error", code: "rateLimit" });
    expect((await playback(jsonRequest(url, body), params)).status).toBe(429);
  });
  it("removes and plays queued items as the caller", async () => {
    const del = (auth: string | null) =>
      unqueue(new Request(`http://localhost/api/native/v1/rooms/${roomId}/queue/${itemId}`, {
        method: "DELETE",
        headers: auth ? { authorization: auth } : {},
      }), itemParams);
    expect((await del(null)).status).toBe(401);
    mocks.removeFromQueue.mockImplementation(async (_prev: unknown, form: FormData) => {
      expect(form.get("item")).toBe(itemId);
      return { status: "success", code: "saved" };
    });
    expect((await del(`Bearer ${token}`)).status).toBe(200);
    mocks.removeFromQueue.mockResolvedValue({ status: "error", code: "failed" });
    expect((await del(`Bearer ${token}`)).status).toBe(403);
    mocks.playFromQueue.mockImplementation(async (_prev: unknown, form: FormData) => {
      expect(form.get("room")).toBe(roomId);
      expect(form.get("item")).toBe(itemId);
      return { status: "success", code: "saved" };
    });
    const played = await playItem(
      new Request(`http://localhost/api/native/v1/rooms/${roomId}/queue/${itemId}/play`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      }),
      itemParams,
    );
    expect(played.status).toBe(200);
  });
});
