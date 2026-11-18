import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { compileRoutes, handle, match } from "../../native-api/server";

const echo = (name: string) => async (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) =>
  Response.json({
    name,
    params: await context.params,
    auth: request.headers.get("authorization"),
    url: request.url,
    body: request.method === "GET" ? null : await request.text(),
  });

const routes = compileRoutes([
  { path: "rooms", module: { GET: echo("list") } },
  { path: "rooms/[roomId]", module: { GET: echo("room") } },
  { path: "rooms/[roomId]/queue/[itemId]", module: { DELETE: echo("unqueue") } },
  { path: "rooms/[roomId]/queue/[itemId]/play", module: { POST: echo("play") } },
  { path: "rooms/[roomId]/queue", module: { POST: echo("queue") } },
]);

function request(
  method: string,
  url: string,
  headers: Record<string, string[]> = {},
  body = "",
): IncomingMessage {
  const stream = Readable.from(body ? [Buffer.from(body)] : []) as unknown as IncomingMessage;
  Object.assign(stream, { method, url, headersDistinct: headers });
  return stream;
}

describe("standalone native API router", () => {
  it("matches the website's route paths and decodes parameters", () => {
    expect(match(routes, "/api/native/v1/rooms")?.route.path).toBe("rooms");
    const found = match(routes, "/api/native/v1/rooms/a%20b/queue/c/play");
    expect(found?.route.path).toBe("rooms/[roomId]/queue/[itemId]/play");
    expect(found?.params).toEqual({ roomId: "a b", itemId: "c" });
    expect(match(routes, "/api/native/v1/rooms/x/queue")?.route.path).toBe(
      "rooms/[roomId]/queue",
    );
    expect(match(routes, "/api/rooms")).toBeNull();
    expect(match(routes, "/api/native/v1/rooms/%E0%A4%A")).toBeNull();
    expect(match(routes, "/api/native/v1/rooms/a/b/c")).toBeNull();
  });

  it("uses the configured origin, joins repeated headers and passes bodies", async () => {
    const response = await handle(
      routes,
      "https://api.example",
      request(
        "POST",
        "/api/native/v1/rooms/r/queue",
        { authorization: ["Bearer a.b.c", "Bearer d.e.f"], host: ["evil.example"] },
        '{"url":"x"}',
      ),
    );
    const body = await response.json();
    expect(body.url).toBe("https://api.example/api/native/v1/rooms/r/queue");
    // Two tokens become one malformed header that parseBearer refuses.
    expect(body.auth).toBe("Bearer a.b.c, Bearer d.e.f");
    expect(body.body).toBe('{"url":"x"}');
  });

  it("answers unknown paths, wrong methods and oversized bodies with the envelope", async () => {
    const missing = await handle(routes, "http://127.0.0.1:8787", request("GET", "/api/native/v1/nope"));
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("not_found");
    const wrong = await handle(routes, "http://127.0.0.1:8787", request("DELETE", "/api/native/v1/rooms"));
    expect(wrong.status).toBe(405);
    const big = await handle(
      routes,
      "http://127.0.0.1:8787",
      request("POST", "/api/native/v1/rooms/r/queue", {}, "x".repeat(1024 * 1024 + 1)),
    );
    expect(big.status).toBe(413);
    expect(big.headers.get("cache-control")).toBe("private, no-store");
  });
});
