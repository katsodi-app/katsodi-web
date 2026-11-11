import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const photos = JSON.parse(
  await readFile("public/images/editorial/provenance.json", "utf8"),
);
const tiles = [];
for (const [i, photo] of photos.entries()) {
  const input = await sharp(`public/images/editorial/${photo.id}-480.webp`)
    .resize(300, 220, { fit: "cover" })
    .toBuffer();
  tiles.push({ input, left: (i % 5) * 300, top: Math.floor(i / 5) * 250 });
  tiles.push({
    input: Buffer.from(
      `<svg width="300" height="30"><rect width="300" height="30" fill="#171717"/><text x="12" y="21" fill="white" font-size="16" font-family="Arial">${photo.id} · ${photo.author}</text></svg>`,
    ),
    left: (i % 5) * 300,
    top: Math.floor(i / 5) * 250 + 220,
  });
}
await mkdir(".local", { recursive: true });
await sharp({
  create: { width: 1500, height: 500, channels: 3, background: "#171717" },
})
  .composite(tiles)
  .png()
  .toFile(".local/asset-contact-sheet.png");
