import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const manifest = JSON.parse(
  await readFile("src/data/curated-posters.json", "utf8"),
);
async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw Error(String(r.status));
  return r.json();
}
async function save(
  id,
  name,
  title,
  source,
  original,
  author = "Original rights holders; see source",
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
  await writeFile(`public${src}`, o.data);
  const item = {
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
    license:
      "Copyrighted promotional artwork; publication permission not established",
    licenseUrl: "",
    usage: "Local prototype; check file-specific rights before publication",
    checked: "2026-11-01",
    focalPoint: "50% 30%",
  };
  const i = manifest.findIndex((x) => x.fandomId === id);
  if (i < 0) manifest.push(item);
  else manifest[i] = item;
  await writeFile(
    "src/data/curated-posters.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log("OK", name, title);
}
for (const [index, name, id] of [
  [5, "Demon Slayer", 41469],
  [11, "Haikyu!!", 5193],
  [12, "Spy × Family", 59698],
  [18, "Sailor Moon", 5476],
  [19, "Pokémon", 590],
]) {
  const s = await json(`https://api.tvmaze.com/shows/${id}`);
  await save(`anime-${index}`, name, s.name, s.url, s.image.original);
}
for (const [index, name, id] of [
  [1, "Stardew Valley", 413150],
  [3, "The Sims", 1222670],
  [14, "Dark Souls", 570940],
  [24, "Undertale", 391540],
]) {
  const d = (
    await json(
      `https://store.steampowered.com/api/appdetails?appids=${id}&l=english`,
    )
  )[id].data;
  await save(
    `games-${index}`,
    name,
    d.name,
    `https://store.steampowered.com/app/${id}/`,
    d.header_image,
    d.developers.join(", "),
  );
}
await save(
  "games-0",
  "Minecraft",
  "Minecraft",
  "https://www.minecraft.net/en-us/about-minecraft",
  "https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/key-art/About-Minecraft_Featured-Image-0_570x321.jpg",
  "Mojang Studios / Microsoft",
);
const w = await json(
  "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=File:Interstellar%20film%20poster.jpg",
);
const f = Object.values(w.query.pages)[0].imageinfo[0];
await save(
  "cinema-23",
  "Interstellar",
  "Interstellar (2014)",
  f.descriptionurl,
  f.url,
);
