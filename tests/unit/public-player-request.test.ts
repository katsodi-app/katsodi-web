import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ request: mocks.request }));
import {
  publicAddress,
  publicPlayerPage,
} from "../../src/lib/server/public-player-request";
function respond(
  body: string,
  status = 200,
  headers = ["Content-Type", "text/html"],
) {
  mocks.request.mockImplementationOnce((_url, _options, callback) => {
    const req = Object.assign(new EventEmitter(), {
      end: () => {
        const response = Object.assign(new PassThrough(), {
          statusCode: status,
          rawHeaders: headers,
        });
        callback(response);
        response.end(body);
      },
    });
    return req;
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.lookup.mockResolvedValue([{ address: "93.184.215.14", family: 4 }]);
});
it("rejects private, special, mapped and transition addresses", () => {
  for (const ip of [
    "0.1.2.3",
    "10.1.2.3",
    "127.0.0.1",
    "100.100.100.200",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.2.1",
    "192.0.2.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:7f00:1::",
    "not-an-ip",
  ])
    expect(publicAddress(ip), ip).toBe(false);
  for (const ip of [
    "93.184.215.14",
    "8.8.8.8",
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
  ])
    expect(publicAddress(ip), ip).toBe(true);
});
it("pins the validated address and sends no credentials or referrer", async () => {
  respond("<video></video>");
  const result = await publicPlayerPage(
    "https://public-video.org/watch",
    Date.now() + 1000,
  );
  expect(result.body).toBe("<video></video>");
  const options = mocks.request.mock.calls[0][1];
  const callback = vi.fn();
  options.lookup("public-video.org", {}, callback);
  expect(callback).toHaveBeenCalledWith(null, "93.184.215.14", 4);
  expect(mocks.lookup).toHaveBeenCalledTimes(1);
  expect(options.agent).toBe(false);
  expect(options.headers).toEqual({
    Accept: "text/html,application/xhtml+xml",
    "Accept-Encoding": "identity",
  });
});
it("rejects mixed public/private DNS answers before opening a socket", async () => {
  mocks.lookup.mockResolvedValue([
    { address: "8.8.8.8", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ]);
  await expect(
    publicPlayerPage("https://rebind.org/", Date.now() + 1000),
  ).rejects.toMatchObject({ reason: "blocked" });
  expect(mocks.request).not.toHaveBeenCalled();
});
it("checks every redirect destination including DNS and rejects local targets", async () => {
  respond("", 302, ["Location", "https://private-video.org/"]);
  mocks.lookup
    .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
    .mockResolvedValueOnce([{ address: "10.0.0.2", family: 4 }]);
  await expect(
    publicPlayerPage("https://public-video.org/", Date.now() + 1000),
  ).rejects.toMatchObject({ reason: "blocked" });
  expect(mocks.request).toHaveBeenCalledTimes(1);
});
it("bounds redirect loops and refuses non-HTML or oversized bodies", async () => {
  for (let i = 0; i < 4; i++) respond("", 302, ["Location", "/loop"]);
  await expect(
    publicPlayerPage("https://public-video.org/", Date.now() + 1000),
  ).rejects.toMatchObject({ reason: "blocked" });
  expect(mocks.request).toHaveBeenCalledTimes(4);
  respond("video", 200, ["Content-Type", "video/mp4"]);
  await expect(
    publicPlayerPage("https://public-video.org/movie", Date.now() + 1000),
  ).rejects.toMatchObject({ reason: "unavailable" });
  respond("x".repeat(2 * 1024 * 1024 + 1));
  await expect(
    publicPlayerPage("https://public-video.org/large", Date.now() + 1000),
  ).rejects.toMatchObject({ reason: "unavailable" });
});
it("does not wait indefinitely for DNS", async () => {
  mocks.lookup.mockImplementation(() => new Promise(() => {}));
  await expect(
    publicPlayerPage("https://slow-video.org/", Date.now() + 20),
  ).rejects.toMatchObject({ reason: "unavailable" });
  expect(mocks.request).not.toHaveBeenCalled();
});
it("fetches oEmbed JSON with its own content types and a smaller size limit", async () => {
  respond('{"type":"video"}', 200, [
    "Content-Type",
    "application/json; charset=utf-8",
  ]);
  const result = await publicPlayerPage(
    "https://public-video.org/oembed?id=1",
    Date.now() + 1000,
    0,
    "json",
  );
  expect(result.body).toBe('{"type":"video"}');
  expect(mocks.request.mock.calls[0][1].headers.Accept).toBe(
    "application/json",
  );
  respond("<html></html>");
  await expect(
    publicPlayerPage(
      "https://public-video.org/oembed",
      Date.now() + 1000,
      0,
      "json",
    ),
  ).rejects.toMatchObject({ reason: "unavailable" });
  respond("x".repeat(256 * 1024 + 1), 200, [
    "Content-Type",
    "application/json",
  ]);
  await expect(
    publicPlayerPage(
      "https://public-video.org/oembed",
      Date.now() + 1000,
      0,
      "json",
    ),
  ).rejects.toMatchObject({ reason: "unavailable" });
  respond("{}", 200, ["Content-Type", "application/json"]);
  await expect(
    publicPlayerPage("https://public-video.org/page", Date.now() + 1000),
  ).rejects.toMatchObject({ reason: "unavailable" });
});
