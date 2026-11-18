// Derives the installable-app icons from the one logo (src/app/icon.svg).
// Run after the logo changes: npm run icons. The outputs are committed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const logo = await readFile("src/app/icon.svg");
const canvas = "#0c0e11"; // --background of the default Obsidian palette
const render = (size) =>
  sharp(logo, { density: 72 * (size / 64) * 4 })
    .resize(size, size)
    .png()
    .toBuffer();
/** The logo centred on an opaque square, `scale` of the edge wide. */
const padded = async (size, scale) => {
  const inner = Math.round(size * scale);
  return sharp({
    create: { width: size, height: size, channels: 4, background: canvas },
  })
    .composite([{ input: await render(inner), gravity: "centre" }])
    .png()
    .toBuffer();
};

await mkdir("public/icons", { recursive: true });
await mkdir("desktop/assets", { recursive: true });
await writeFile("public/icons/icon-192.png", await render(192));
await writeFile("public/icons/icon-512.png", await render(512));
// Maskable: launchers crop to a circle of 80%, so the logo stays inside it.
await writeFile("public/icons/maskable-512.png", await padded(512, 0.62));
// iOS draws no transparency on the home screen.
await writeFile("public/icons/apple-touch-icon.png", await padded(180, 0.78));
await writeFile("desktop/assets/icon.png", await render(512));

// Windows .ico with PNG-compressed entries.
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = await Promise.all(sizes.map(render));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const at = 6 + 16 * index;
  header.writeUInt8(size === 256 ? 0 : size, at);
  header.writeUInt8(size === 256 ? 0 : size, at + 1);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(images[index].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += images[index].length;
});
await writeFile("desktop/assets/icon.ico", Buffer.concat([header, ...images]));
console.log("Wrote public/icons/*.png and desktop/assets/icon.{png,ico}.");
