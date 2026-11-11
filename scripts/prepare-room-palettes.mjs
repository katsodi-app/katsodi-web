import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const posters = [
  ...(await read("src/data/fandom-posters.json")),
  ...(await read("src/data/curated-posters.json")),
];
const output = {};
for (const poster of posters) {
  const file = path.join("public", poster.src.replace(/^\//, ""));
  const { data } = await sharp(file)
    .resize(32, 32, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const rgb = [...data.subarray(i, i + 3)].map((v) =>
      Math.min(240, Math.round(v / 32) * 32),
    );
    if (Math.max(...rgb) - Math.min(...rgb) < 20 || Math.max(...rgb) < 64)
      continue;
    const key = rgb.join(",");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const selected = [];
  for (const [key] of [...counts].sort((a, b) => b[1] - a[1])) {
    const rgb = key.split(",").map(Number);
    if (
      selected.every(
        (other) => Math.hypot(...rgb.map((v, i) => v - other[i])) > 70,
      )
    )
      selected.push(rgb);
    if (selected.length === 3) break;
  }
  if (selected.length) {
    while (selected.length < 3) selected.push(selected[0]);
    output[poster.fandomId] = selected.map(
      (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`,
    );
  }
}
await writeFile(
  "src/data/room-palettes.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(`Prepared ${Object.keys(output).length} local artwork palettes.`);
