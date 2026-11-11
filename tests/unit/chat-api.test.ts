import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({
  currentAccount: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
  member: true,
  message: true,
}));
vi.mock("@/lib/supabase/server", () => ({
  currentAccount: mocks.currentAccount,
}));
import { POST } from "../../src/app/api/rooms/[roomId]/images/route";
import { GET } from "../../src/app/api/chat-images/[messageId]/route";
import { MAX_IMAGE_INPUT } from "../../src/lib/chat-media";
const roomId = "20000000-0000-4000-8000-000000000001",
  userId = "10000000-0000-4000-8000-000000000001",
  messageId = "30000000-0000-4000-8000-000000000001";
const path = `${roomId}/${userId}/${messageId}.webp`;
const params = { params: Promise.resolve({ roomId }) };
const imageParams = { params: Promise.resolve({ messageId }) };
const client = {
  from(table: string) {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        error: null,
        data:
          table === "room_members"
            ? mocks.member
              ? { user_id: userId }
              : null
            : table === "rooms"
              ? { closed_at: null }
              : mocks.message
                ? { image_path: path }
                : null,
      }),
    };
    return query;
  },
  rpc: mocks.rpc,
  storage: {
    from: () => ({
      upload: mocks.upload,
      remove: mocks.remove,
      download: mocks.download,
    }),
  },
};
async function imageRequest(bytes?: Uint8Array, type = "image/png") {
  const data =
    bytes ||
    (await sharp({
      create: { width: 20, height: 10, channels: 3, background: "pink" },
    })
      .png()
      .toBuffer());
  const form = new FormData();
  form.set("image", new Blob([new Uint8Array(data)], { type }), "image.png");
  return new Request(`http://localhost/api/rooms/${roomId}/images`, {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: form,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.member = true;
  mocks.message = true;
  mocks.currentAccount.mockResolvedValue({ client, user: { id: userId } });
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "chat_media_capabilities" ? true : messageId,
    error: null,
  }));
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
describe("private image endpoints", () => {
  it("rejects anonymous requests and cross-origin submissions before upload", async () => {
    mocks.currentAccount.mockResolvedValue({ client, user: null });
    expect((await POST(await imageRequest(), params)).status).toBe(401);
    const forged = new Request(`http://localhost/api/rooms/${roomId}/images`, {
      method: "POST",
      headers: { origin: "https://other.example" },
    });
    expect((await POST(forged, params)).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("requires current membership and actual media capabilities", async () => {
    mocks.member = false;
    expect((await POST(await imageRequest(), params)).status).toBe(403);
    mocks.member = true;
    mocks.rpc.mockResolvedValue({ error: { message: "missing function" } });
    const response = await POST(await imageRequest(), params);
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("mediaUnavailable");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("bounds actual bytes and rejects MIME spoofing without creating an object", async () => {
    expect(
      (
        await POST(
          await imageRequest(Buffer.alloc(MAX_IMAGE_INPUT + 1)),
          params,
        )
      ).status,
    ).toBe(413);
    expect(
      (await POST(await imageRequest(Buffer.from("<svg/>")), params)).status,
    ).toBe(400);
    const streamed = new Request(
      `http://localhost/api/rooms/${roomId}/images`,
      {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "multipart/form-data; boundary=test",
        },
        body: new Uint8Array(MAX_IMAGE_INPUT + 65537),
      },
    );
    expect((await POST(streamed, params)).status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("stores only sanitized WebP under the authenticated user's path", async () => {
    expect((await POST(await imageRequest(), params)).status).toBe(200);
    const [uploadedPath, bytes, options] = mocks.upload.mock.calls[0];
    expect(uploadedPath).toMatch(
      new RegExp(`^${roomId}/${userId}/[a-f0-9-]+\\.webp$`),
    );
    expect((await sharp(bytes).metadata()).format).toBe("webp");
    expect(options).toMatchObject({ upsert: false, contentType: "image/webp" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "send_room_image",
      expect.objectContaining({ p_width: 20, p_height: 10 }),
    );
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("cleans orphaned uploads on denied or thrown message mutations", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "chat_media_capabilities"
        ? { data: true }
        : { error: { message: "slow_down" } },
    );
    const response = await POST(await imageRequest(), params);
    expect((await response.json()).code).toBe("rateLimit");
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "chat_media_capabilities") return { data: true };
      throw new Error("network failure");
    });
    expect((await POST(await imageRequest(), params)).status).toBe(400);
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });
  it("does not download missing/inaccessible messages and returns no-cache sanitized images", async () => {
    mocks.message = false;
    expect(
      (await GET(new Request("http://localhost"), imageParams)).status,
    ).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
    mocks.message = true;
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    mocks.download.mockResolvedValue({
      data: new Blob([new Uint8Array(png)]),
      error: null,
    });
    const response = await GET(new Request("http://localhost"), imageParams);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
