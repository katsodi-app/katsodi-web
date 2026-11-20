// Renders public/images/discord/room-cover.png: the cover a room without a
// fandom shows in Discord activity (and anywhere a square room picture is
// needed). Katsodi's palette, soft lights like the app's room cards, and
// the white Katsodi mark. Run: node scripts/render-room-cover.mjs
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/images/discord/room-cover.png");
mkdirSync(path.dirname(out), { recursive: true });

const size = 1024;
// The logo's bars in 64-unit space: x, top, bottom (src/app/icon.svg).
const bars = [
  [16, 28, 36],
  [24, 22, 42],
  [32, 16, 48],
  [40, 26, 38],
  [48, 22, 42],
];
const scale = 9; // 64 units → 576 px
const offset = (size - 64 * scale) / 2;
const strokes = bars
  .map(
    ([x, top, bottom]) =>
      `<line x1="${offset + x * scale}" y1="${offset + top * scale}" x2="${offset + x * scale}" y2="${offset + bottom * scale}"/>`,
  )
  .join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="lime" cx="0.8" cy="0.15" r="0.85">
      <stop offset="0" stop-color="#d4ef8b" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#d4ef8b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sky" cx="0.1" cy="0.95" r="0.8">
      <stop offset="0" stop-color="#a5cbea" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#a5cbea" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mint" cx="0.95" cy="0.95" r="0.6">
      <stop offset="0" stop-color="#a4d8b5" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#a4d8b5" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" fill="#13161a"/>
  <rect width="${size}" height="${size}" fill="url(#lime)"/>
  <rect width="${size}" height="${size}" fill="url(#sky)"/>
  <rect width="${size}" height="${size}" fill="url(#mint)"/>
  <g stroke="#ffffff" stroke-width="${5.2 * scale}" stroke-linecap="round" filter="url(#glow)" opacity="0.96">${strokes}</g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: size, height: size },
});
await page.setContent(
  `<html><body style="margin:0;background:#13161a">${svg}</body></html>`,
);
await page.screenshot({
  path: out,
  clip: { x: 0, y: 0, width: size, height: size },
});
await browser.close();
console.log(`Wrote ${path.relative(root, out)}`);
