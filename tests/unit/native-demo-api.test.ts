import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestDemo: vi.fn(),
  stopDemo: vi.fn(),
  decideDemo: vi.fn(),
  pauseDemo: vi.fn(),
  beatDemo: vi.fn(),
  setDemoAnnotations: vi.fn(),
  demoAccess: vi.fn(),
  demoGrant: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: () => {
    throw new Error("cookies must not be read for a native request");
  },
}));
vi.mock("../../src/lib/server/room-actions", () => ({
  requestDemo: mocks.requestDemo,
  stopDemo: mocks.stopDemo,
  decideDemo: mocks.decideDemo,
  pauseDemo: mocks.pauseDemo,
  beatDemo: mocks.beatDemo,
  setDemoAnnotations: mocks.setDemoAnnotations,
}));
vi.mock("../../src/lib/server/demo-access", () => ({
  demoAccess: mocks.demoAccess,
  demoGrant: mocks.demoGrant,
}));

import {
  DELETE as stop,
  POST as request,
} from "../../src/app/api/native/v1/rooms/[roomId]/demo/route";
import { POST as decide } from "../../src/app/api/native/v1/rooms/[roomId]/demo/decision/route";
import { POST as pause } from "../../src/app/api/native/v1/rooms/[roomId]/demo/pause/route";
import { POST as beat } from "../../src/app/api/native/v1/rooms/[roomId]/demo/beat/route";
import { POST as annotations } from "../../src/app/api/native/v1/rooms/[roomId]/demo/annotations/route";
import { POST as token } from "../../src/app/api/native/v1/rooms/[roomId]/demo/token/route";

const bearer = `Bearer ${"a".repeat(20)}.${"b".repeat(40)}.${"c".repeat(30)}`;
const roomId = "20000000-0000-4000-8000-000000000001";
const params = { params: Promise.resolve({ roomId }) };
const base = `http://localhost/api/native/v1/rooms/${roomId}/demo`;
const call = (
  url: string,
  body?: unknown,
  method = "POST",
  auth: string | null = bearer,
) =>
  new Request(url, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(auth ? { authorization: auth } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => vi.resetAllMocks());

describe("native link demo", () => {
  it("requests a demo through the shared action and maps a busy room", async () => {
    mocks.requestDemo.mockImplementation(
      async (_p: unknown, form: FormData) => {
        expect(form.get("room")).toBe(roomId);
        expect(form.get("url")).toBe("https://example.org/");
        return { status: "success", code: "saved" };
      },
    );
    expect(
      (await request(call(base, { url: "https://example.org/" }), params))
        .status,
    ).toBe(201);
    for (const bad of [{}, { url: "x", extra: 1 }, { link: "x" }])
      expect((await request(call(base, bad), params)).status).toBe(400);
    expect(
      (await request(call(base, { url: "x" }, "POST", null), params)).status,
    ).toBe(401);
    mocks.requestDemo.mockResolvedValue({ status: "error", code: "demoBusy" });
    const busy = await request(
      call(base, { url: "https://example.org/" }),
      params,
    );
    expect(busy.status).toBe(409);
    expect((await busy.json()).error.code).toBe("demo_busy");
  });

  it("maps booleans onto the website's 1/0 form fields", async () => {
    mocks.decideDemo.mockResolvedValue({ status: "success", code: "saved" });
    mocks.pauseDemo.mockResolvedValue({ status: "success", code: "saved" });
    expect(
      (await decide(call(`${base}/decision`, { accept: true }), params)).status,
    ).toBe(200);
    expect(mocks.decideDemo.mock.calls[0][1].get("accept")).toBe("1");
    expect(
      (await pause(call(`${base}/pause`, { paused: false }), params)).status,
    ).toBe(200);
    expect(mocks.pauseDemo.mock.calls[0][1].get("paused")).toBe("0");
    for (const bad of [
      { accept: "1" },
      { accept: 1 },
      {},
      { accept: true, paused: true },
    ])
      expect((await decide(call(`${base}/decision`, bad), params)).status).toBe(
        400,
      );
    expect(mocks.decideDemo).toHaveBeenCalledTimes(1);
  });

  it("lets hosts open the demo channel to every member", async () => {
    mocks.setDemoAnnotations.mockResolvedValue({
      status: "success",
      code: "saved",
    });
    expect(
      (await annotations(call(`${base}/annotations`, { open: true }), params))
        .status,
    ).toBe(200);
    expect(mocks.setDemoAnnotations.mock.calls[0][1].get("open")).toBe("1");
    expect(
      (await annotations(call(`${base}/annotations`, { open: "yes" }), params))
        .status,
    ).toBe(400);
    mocks.setDemoAnnotations.mockResolvedValue({
      status: "error",
      code: "failed",
    });
    expect(
      (await annotations(call(`${base}/annotations`, { open: false }), params))
        .status,
    ).toBe(403);
  });

  it("beats and stops as the caller; a refused beat is a denial", async () => {
    mocks.beatDemo.mockResolvedValue({ status: "error", code: "failed" });
    expect((await beat(call(`${base}/beat`), params)).status).toBe(403);
    mocks.stopDemo.mockResolvedValue({ status: "success", code: "saved" });
    expect((await stop(call(base, undefined, "DELETE"), params)).status).toBe(
      200,
    );
    expect(mocks.stopDemo.mock.calls[0][1].get("room")).toBe(roomId);
  });

  it("issues a token only for a running demo of an active member", async () => {
    mocks.demoAccess.mockResolvedValue({ status: 403, error: "access" });
    expect((await token(call(`${base}/token`), params)).status).toBe(403);
    mocks.demoAccess.mockResolvedValue({
      status: 200,
      demo: { status: "pending" },
    });
    expect((await token(call(`${base}/token`), params)).status).toBe(409);
    mocks.demoAccess.mockResolvedValue({
      status: 200,
      demo: { status: "live" },
    });
    mocks.demoGrant.mockResolvedValue({ status: "unconfigured" });
    expect((await token(call(`${base}/token`), params)).status).toBe(503);
    mocks.demoGrant.mockResolvedValue({
      status: "ok",
      url: "wss://x.livekit.cloud",
      token: "t",
      publish: false,
      host: true,
    });
    const ok = await token(call(`${base}/token`), params);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({
      url: "wss://x.livekit.cloud",
      token: "t",
      publish: false,
      host: true,
    });
    expect(ok.headers.get("cache-control")).toBe("private, no-store");
  });
});
