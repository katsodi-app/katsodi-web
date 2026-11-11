// Fixed, reviewed Unsplash photo pages; no random-image endpoints.
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const list = [
  [
    "concert",
    "people-raising-their-hands-on-concert-Qnlp3FCO2vc",
    "photo-1603190287605-e6ade32fa852",
    "Tijs van Leur",
  ],
  [
    "coast",
    "white-torii-gate-on-a-grassy-shore-by-the-ocean-5W0enjTX7M4",
    "photo-1772233848744-71dab9622433",
    "Josip Ivanković",
  ],
  [
    "library",
    "rows-of-books-on-library-shelves-lLtNLh7EkbE",
    "photo-1760662084879-146e78d89119",
    "Dmitry Spravko",
  ],
  [
    "space",
    "a-galaxy-surrounded-by-stars-in-space-Rw7H7ELqJS4",
    "photo-1747277832101-bdba36d527b0",
    "Scott Lord",
  ],
  [
    "court",
    "basketball-court-0PRm8hPopAg",
    "photo-1546016454-00d8a6742f2f",
    "Justin Chrn",
  ],
  [
    "tokyo",
    "wet-street-at-night-in-tokyo-yVUQlyRlJSw",
    "photo-1601042879364-f3947d3f9c16",
    "Valentin BEAUVAIS",
  ],
  [
    "vinyl",
    "a-vinyl-record-spinning-on-a-turntable-in-low-light-DIGeBP4UEVk",
    "photo-1781756547472-46813046281c",
    "Dmitry Spravko",
  ],
  [
    "dunes",
    "golden-sand-dunes-under-a-clear-sky-tr-vlxwBDxo",
    "photo-1772289093152-6da5e7d0b467",
    "NIR HIMI",
  ],
  [
    "forest",
    "a-lake-surrounded-by-mountains-in-the-middle-of-a-forest-ifHBo0TTuBI",
    "photo-1740149263431-098cc6705df4",
    "Joshua Tsu",
  ],
  [
    "cinema",
    "photography-of-cinema-atsUqIm3wxo",
    "photo-1536440136628-849c177e76a1",
    "Myke Simon",
  ],
];
await mkdir("public/images/editorial", { recursive: true });
await mkdir(".local/assets", { recursive: true });
const provenance = [];
for (const [id, slug, imageId, author] of list) {
  const page = `https://unsplash.com/photos/${slug}`;
  // CDN identifiers were resolved from image links on the reviewed source pages.
  const url = new URL(`https://images.unsplash.com/${imageId}`);
  url.searchParams.set("w", "1800");
  url.searchParams.set("q", "85");
  url.searchParams.set("fit", "max");
  const image = await fetch(url);
  if (!image.ok) throw new Error(`${id}: image HTTP ${image.status}`);
  const bytes = Buffer.from(await image.arrayBuffer());
  for (const width of [480, 960, 1600])
    await sharp(bytes)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(`public/images/editorial/${id}-${width}.webp`);
  const meta = await sharp(bytes).metadata();
  provenance.push({
    id,
    author,
    page,
    original: url.toString(),
    width: meta.width,
    height: meta.height,
    license: "Unsplash License",
    licenseUrl: "https://unsplash.com/license",
    checked: "2026-11-01",
  });
  console.log(`Prepared ${id}: ${meta.width}x${meta.height}`);
}
await writeFile(
  "public/images/editorial/provenance.json",
  JSON.stringify(provenance, null, 2) + "\n",
);
