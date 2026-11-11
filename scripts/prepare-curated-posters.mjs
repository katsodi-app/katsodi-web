import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const { fandoms: entries } = await import("./read-catalogue.mjs");

const shows = {
  "Doctor Who": 2005,
  "Stranger Things": 2016,
  Sherlock: 2010,
  Supernatural: 2005,
  "The Witcher": 2019,
  Wednesday: 2022,
  "The Last of Us": 2023,
  "House of the Dragon": 2022,
  "Game of Thrones": 2011,
  "Breaking Bad": 2008,
  "Better Call Saul": 2015,
  Friends: 1994,
  "The Office": 2005,
  "The X-Files": 1993,
  "Twin Peaks": 1990,
};
let manifest = [];
try {
  manifest = JSON.parse(
    await readFile("src/data/curated-posters.json", "utf8"),
  );
} catch {}
async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  return r.json();
}
for (const entry of entries.filter(
  (e) => e.name in shows || e.category === "anime",
)) {
  if (manifest.some((p) => p.fandomId === entry.id)) continue;
  try {
    let title, source, original;
    if (entry.category === "anime") {
      const query =
        {
          "Studio Ghibli": "Spirited Away",
          Pokémon: "Pokemon",
          "JoJo’s Bizarre Adventure": "JoJo's Bizarre Adventure",
          "Hunter × Hunter": "Hunter x Hunter",
          "Spy × Family": "Spy x Family",
          Frieren: "Frieren: Beyond Journey's End",
          Digimon: "Digimon Adventure",
          "Demon Slayer": "Demon Slayer: Kimetsu no Yaiba",
        }[entry.name] || entry.name;
      const results = await json(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`,
      );
      const normalize = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
      const show = results
        .map((r) => r.show)
        .find(
          (s) =>
            s.type === "Animation" && normalize(s.name) === normalize(query),
        );
      if (!show?.image) throw new Error("No exact animated title match");
      title = show.name;
      source = show.url;
      original = show.image.original;
    } else {
      const results = await json(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(entry.name)}`,
      );
      const show = results
        .map((r) => r.show)
        .find(
          (s) =>
            s.name === entry.name &&
            s.premiered?.startsWith(String(shows[entry.name])),
        );
      if (!show?.image) throw new Error("No exact title/year match");
      title = `${show.name} (${shows[entry.name]})`;
      source = show.url;
      original = show.image.original;
    }
    const response = await fetch(original);
    if (!response.ok) throw new Error(`Image ${response.status}`);
    const output = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({
        width: 700,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });
    const src = `/images/fandoms/${entry.id}-poster.webp`;
    await writeFile(`public${src}`, output.data);
    manifest.push({
      fandomId: entry.id,
      name: entry.name,
      title,
      src,
      width: output.info.width,
      height: output.info.height,
      source,
      fileSource: source,
      original,
      author: "Original production rights holders; see source",
      license:
        "Copyrighted promotional artwork; publication permission not established",
      licenseUrl: "",
      usage: "Local prototype; check file-specific rights before publication",
      checked: "2026-11-01",
      focalPoint: "50% 30%",
    });
    await writeFile(
      "src/data/curated-posters.json",
      JSON.stringify(manifest, null, 2) + "\n",
    );
    console.log(`OK ${entry.name}: ${title}`);
  } catch (e) {
    console.log(`FAILED ${entry.name}: ${e.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
