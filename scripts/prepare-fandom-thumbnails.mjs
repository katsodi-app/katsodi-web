// Writes a 480px-wide WebP next to every fandom image wider than 600px, so
// cards download a thumbnail instead of the full 700px poster. Idempotent.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  sharp = createRequire(require.resolve("next/package.json"))("sharp");
const manifests = [
  "src/data/fandom-posters.json",
  "src/data/curated-posters.json",
];
let written = 0;
for (const file of manifests)
  for (const poster of JSON.parse(await readFile(file, "utf8"))) {
    if (poster.width <= 600) continue;
    const target = "public" + poster.src.replace(/\.webp$/, "-480.webp");
    if (existsSync(target)) continue;
    await sharp("public" + poster.src)
      .resize({ width: 480 })
      .webp({ quality: 78 })
      .toFile(target);
    written++;
  }
console.log(`Wrote ${written} thumbnails.`);
