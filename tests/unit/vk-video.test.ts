import { afterEach, describe, expect, it, vi } from "vitest";
import { vkApiPlayer } from "../../src/lib/server/vk-video";

const link = "https://vkvideo.ru/live-238162296_456239039";
const required = { kind: "external", reason: "vkEmbedRequired", sync: false };
const reply = (body: unknown) =>
  vi.fn(async () => Response.json(body as object));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("VK official API player lookup", () => {
  it("asks for the export code when no token is configured", async () => {
    vi.stubEnv("VK_ACCESS_TOKEN", "");
    const fetcher = reply({});
    vi.stubGlobal("fetch", fetcher);
    expect(await vkApiPlayer(link)).toEqual(required);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("embeds the player URL returned by video.get", async () => {
    vi.stubEnv("VK_ACCESS_TOKEN", "test-token");
    const fetcher = reply({
      response: {
        count: 1,
        items: [
          {
            player:
              "https://vk.com/video_ext.php?oid=-238162296&id=456239039&hash=0123abcd4567ef89&__ref=vk.api&api_hash=zzz",
          },
        ],
      },
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await vkApiPlayer(link)).toEqual({
      kind: "iframe",
      src: "https://vkvideo.ru/video_ext.php?oid=-238162296&id=456239039&hash=0123abcd4567ef89&hd=2",
      provider: "VK Видео",
      presentation: "discovered",
      sync: false,
    });
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.vk.com/method/video.get");
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(body.get("videos")).toBe("-238162296_456239039");
    expect(body.get("access_token")).toBe("test-token");
  });

  it("falls back on VK errors without logging the token", async () => {
    vi.stubEnv("VK_ACCESS_TOKEN", "secret-token");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      reply({
        error: {
          error_code: 15,
          error_msg: "Access denied",
          request_params: [{ key: "access_token", value: "secret-token" }],
        },
      }),
    );
    expect(await vkApiPlayer(link)).toEqual(required);
    expect(warn).toHaveBeenCalledWith("VK video.get error 15");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret-token");
  });

  it("rejects players that are not VK's hashed embed", async () => {
    vi.stubEnv("VK_ACCESS_TOKEN", "test-token");
    for (const player of [
      "https://evil.example.org/video_ext.php?oid=1&id=2&hash=0123abcd4567ef89",
      "https://vk.com/video_ext.php?oid=1&id=2",
      42,
    ]) {
      vi.stubGlobal("fetch", reply({ response: { items: [{ player }] } }));
      expect(await vkApiPlayer(link)).toEqual(required);
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect(await vkApiPlayer(link)).toEqual(required);
    expect(await vkApiPlayer("https://vk.com/feed")).toEqual(required);
  });
});
