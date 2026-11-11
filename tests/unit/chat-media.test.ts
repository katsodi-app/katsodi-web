import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { prepareChatImage } from "../../src/lib/server/chat-images";
import {
  MAX_IMAGE_INPUT,
  MAX_IMAGE_OUTPUT,
  isStickerId,
  validImageInput,
} from "../../src/lib/chat-media";

describe("small chat images", () => {
  it("rejects unsupported, empty and oversized files before decoding", () => {
    expect(validImageInput({ size: 20, type: "image/svg+xml" })).toBe(false);
    expect(validImageInput({ size: 0, type: "image/png" })).toBe(false);
    expect(
      validImageInput({ size: MAX_IMAGE_INPUT + 1, type: "image/png" }),
    ).toBe(false);
    expect(validImageInput({ size: 1000, type: "image/jpeg" })).toBe(true);
    expect(isStickerId("love")).toBe(true);
    expect(isStickerId("<script>")).toBe(false);
  });
  it("decodes actual bytes, resizes and strips metadata", async () => {
    const source = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: "pink" },
    })
      .withMetadata({ density: 300 })
      .jpeg()
      .toBuffer();
    const output = await prepareChatImage(source);
    expect(output.info.width).toBe(1280);
    expect(output.info.height).toBe(640);
    expect(output.data.byteLength).toBeLessThanOrEqual(MAX_IMAGE_OUTPUT);
    const meta = await sharp(output.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
  });
  it("rejects fake raster contents, vector files and pixel bombs", async () => {
    await expect(
      prepareChatImage(Buffer.from("not really an image")),
    ).rejects.toThrow();
    await expect(
      prepareChatImage(
        Buffer.from(
          '<svg width="4" height="4" xmlns="http://www.w3.org/2000/svg"/>',
        ),
      ),
    ).rejects.toThrow();
    const huge = await sharp({
      create: { width: 5000, height: 4000, channels: 3, background: "black" },
    })
      .png()
      .toBuffer();
    await expect(prepareChatImage(huge)).rejects.toThrow();
  });
  it("keeps small PNGs readable without enlargement", async () => {
    const png = await sharp({
      create: {
        width: 100,
        height: 60,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const result = await prepareChatImage(png);
    expect([result.info.width, result.info.height]).toEqual([100, 60]);
  });
});
