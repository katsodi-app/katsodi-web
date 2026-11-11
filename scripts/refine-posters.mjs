import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  sharp = createRequire(require.resolve("next/package.json"))("sharp");
let manifest = JSON.parse(await readFile("src/data/curated-posters.json"));
async function save(
  id,
  name,
  title,
  source,
  original,
  author,
  license,
  licenseUrl = "",
) {
  const r = await fetch(original);
  if (!r.ok) throw Error(String(r.status));
  const o = await sharp(Buffer.from(await r.arrayBuffer()))
    .resize({
      width: 700,
      height: 1000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });
  const src = `/images/fandoms/${id}-poster.webp`;
  await writeFile("public" + src, o.data);
  manifest = manifest.filter((p) => p.fandomId !== id);
  manifest.push({
    fandomId: id,
    name,
    title,
    source,
    fileSource: source,
    original,
    src,
    width: o.info.width,
    height: o.info.height,
    author,
    license,
    licenseUrl,
    usage: "Local prototype; check file-specific rights before publication",
    checked: "2026-11-01",
    focalPoint: "50% 30%",
  });
  await writeFile(
    "src/data/curated-posters.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log("OK", name);
}
for (const [id, name, title, file] of [
  [
    "music-20",
    "Muse",
    "Muse (band)",
    "MuseHammsmith100522 (47 of 76) (52089636284).jpg",
  ],
  ["books-17", "Asterix", "Asterix the Gaul", "Asterix the Gaul.png"],
  [
    "sport-2",
    "WRC",
    "Thierry Neuville at the 2018 Rally de Portugal",
    "2018 Rally de Portugal - Thierry Neuville 2.jpg",
  ],
]) {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  Object.entries({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "700",
    titles: "File:" + file,
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const d = await (await fetch(u)).json();
  const p = Object.values(d.query.pages)[0].imageinfo[0],
    m = p.extmetadata || {},
    plain = (s) => (s || "").replace(/<[^>]*>/g, "");
  await save(
    id,
    name,
    title,
    p.descriptionurl,
    p.thumburl || p.url,
    plain(m.Artist?.value) || "Original rights holders",
    plain(m.LicenseShortName?.value) ||
      "Copyrighted artwork; publication permission not established",
    m.LicenseUrl?.value || "",
  );
}
const apple = await (
  await fetch("https://itunes.apple.com/lookup?id=1517783697")
).json();
const game = apple.results[0];
if (!game.trackName.includes("Genshin")) throw Error("Wrong game");
await save(
  "games-11",
  "Genshin Impact",
  game.trackName,
  game.trackViewUrl,
  game.artworkUrl512,
  game.artistName,
  "Copyrighted promotional artwork; publication permission not established",
);
const h = await (await fetch("https://hsr.hoyoverse.com/en-us/")).text();
const image = h.match(/<meta property="og:image" content="([^"]+)"/)[1];
await save(
  "games-12",
  "Honkai: Star Rail",
  "Honkai: Star Rail",
  "https://hsr.hoyoverse.com/en-us/",
  image,
  "HoYoverse",
  "Copyrighted promotional artwork; publication permission not established",
);
await save(
  "books-12",
  "Heartstopper",
  "Heartstopper Volume 1",
  "https://openlibrary.org/isbn/9781444951387",
  "https://covers.openlibrary.org/b/isbn/9781444951387-L.jpg?default=false",
  "Alice Oseman / Hachette Children’s Group",
  "Copyrighted book cover; publication permission not established",
);
