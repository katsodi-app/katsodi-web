import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ currentAccount: mocks.account }));
import { prepareProfileImage } from "../../src/lib/server/profile-media";
import { cropFromView, cropSchema } from "../../src/lib/profile-media";
import { POST, DELETE } from "../../src/app/api/profile/media/route";

const me = "10000000-0000-4000-8000-000000000001";
const png = (width: number, height: number, background = "#3366ff") =>
  sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
const full = { x: 0, y: 0, width: 1, height: 1 };

describe("profile image processing", () => {
  it("crops and resizes avatars and banners to fixed WebP sizes", async () => {
    const avatar = await prepareProfileImage(
      new Uint8Array(await png(800, 600)),
      "avatar",
      { x: 0.125, y: 0, width: 0.75, height: 1 },
    );
    expect(avatar.info).toMatchObject({
      format: "webp",
      width: 256,
      height: 256,
    });
    const banner = await prepareProfileImage(
      new Uint8Array(await png(1200, 900)),
      "banner",
      { x: 0, y: 0.3, width: 1, height: 1 / 3 },
    );
    expect(banner.info).toMatchObject({ width: 1500, height: 500 });
  });
  it("uses the selected region of the image", async () => {
    // Left half red, right half blue; crop the right half.
    const left = await sharp({
      create: { width: 200, height: 200, channels: 3, background: "#ff0000" },
    })
      .extend({ right: 200, background: "#0000ff" })
      .png()
      .toBuffer();
    const out = await prepareProfileImage(new Uint8Array(left), "avatar", {
      x: 0.5,
      y: 0,
      width: 0.5,
      height: 1,
    });
    const { data } = await sharp(out.data)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[2]).toBeGreaterThan(200); // blue
    expect(data[0]).toBeLessThan(40); // not red
  });
  it("drops metadata such as location from the original", async () => {
    const tagged = await sharp(await png(300, 300))
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "secret-gps-owner" } } })
      .toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    const out = await prepareProfileImage(
      new Uint8Array(tagged),
      "avatar",
      full,
    );
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(out.data.includes(Buffer.from("secret-gps-owner"))).toBe(false);
  });
  it("rejects animations, other formats and broken bytes", async () => {
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "#000" },
    })
      .gif()
      .toBuffer();
    for (const input of [
      gif,
      Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
      Buffer.from("not an image"),
      Buffer.alloc(0),
    ])
      await expect(
        prepareProfileImage(new Uint8Array(input), "avatar", full),
      ).rejects.toThrow();
  });
  it("validates crop boxes and computes them from the editor view", () => {
    expect(
      cropSchema.safeParse({ x: 0.5, y: 0, width: 0.6, height: 1 }).success,
    ).toBe(false);
    expect(
      cropSchema.safeParse({ x: 0, y: 0, width: 0, height: 1 }).success,
    ).toBe(false);
    // 1000x500 image shown at scale 0.4 in a 200x200 viewport, shifted left 50px.
    expect(cropFromView(1000, 500, 200, 200, 0.4, -50, 0)).toEqual({
      x: 0.125,
      y: 0,
      width: 0.5,
      height: 1,
    });
  });
});

describe("profile media routes", () => {
  const storage = { upload: mocks.upload, remove: mocks.remove };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.account.mockResolvedValue({
      client: { rpc: mocks.rpc, storage: { from: () => storage } },
      user: { id: me },
    });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: `${me}/avatar-old.webp`, error: null });
  });
  const upload = async (
    entries: Record<string, string | Blob>,
    origin = "http://localhost",
  ) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(entries)) form.set(key, value);
    return POST(
      new Request("http://localhost/api/profile/media", {
        method: "POST",
        headers: { origin },
        body: form,
      }),
    );
  };
  const image = async () =>
    new Blob([new Uint8Array(await png(400, 400))], { type: "image/png" });
  it("stores a processed image, then removes the previous one", async () => {
    const response = await upload({
      kind: "avatar",
      crop: JSON.stringify(full),
      image: await image(),
    });
    expect(response.status).toBe(200);
    const [path, data, options] = mocks.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${me}/avatar-[0-9a-f-]{36}\\.webp$`));
    expect(options).toMatchObject({ contentType: "image/webp", upsert: false });
    expect((await sharp(data).metadata()).width).toBe(256);
    expect(mocks.rpc).toHaveBeenCalledWith("set_profile_media", {
      p_kind: "avatar",
      p_path: path,
    });
    expect(mocks.remove).toHaveBeenCalledWith([`${me}/avatar-old.webp`]);
  });
  it("refuses other origins, bad kinds and bad crops before storing anything", async () => {
    expect(
      (
        await upload(
          { kind: "avatar", crop: JSON.stringify(full), image: await image() },
          "https://evil.example",
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await upload({
          kind: "cover",
          crop: JSON.stringify(full),
          image: await image(),
        })
      ).status,
    ).toBe(400);
    expect(
      (await upload({ kind: "avatar", crop: "{}", image: await image() }))
        .status,
    ).toBe(400);
    expect(
      (
        await upload({
          kind: "avatar",
          crop: JSON.stringify(full),
          image: new Blob(["<svg/>"], { type: "image/svg+xml" }),
        })
      ).status,
    ).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("deletes the new file when the profile cannot point at it", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "slow_down" },
    });
    const response = await upload({
      kind: "banner",
      crop: JSON.stringify({ x: 0, y: 0, width: 1, height: 1 / 3 }),
      image: await image(),
    });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("rateLimit");
    const [path] = mocks.upload.mock.calls[0];
    expect(mocks.remove).toHaveBeenCalledWith([path]);
  });
  it("removes media on request from the same origin only", async () => {
    const del = (kind: string, origin = "http://localhost") =>
      DELETE(
        new Request(`http://localhost/api/profile/media?kind=${kind}`, {
          method: "DELETE",
          headers: { origin },
        }),
      );
    expect((await del("avatar", "https://evil.example")).status).toBe(403);
    expect((await del("nope")).status).toBe(400);
    expect((await del("avatar")).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("clear_profile_media", {
      p_kind: "avatar",
    });
    expect(mocks.remove).toHaveBeenCalledWith([`${me}/avatar-old.webp`]);
  });
});
