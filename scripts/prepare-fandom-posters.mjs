// Imports the exact work/artist image, never a keyword-based stock-photo match.
// Rights metadata is preserved per file; non-free artwork is not relabelled as licensed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const { fandoms: entries } = await import("./read-catalogue.mjs");

const titles = {
  Muse: "Muse (band)",
  Interstellar: "Interstellar (film)",
  Athletics: "Sport of athletics",
  "Star Wars": "Star Wars (film)",
  "Star Trek": "Star Trek (2009 film)",
  "Doctor Who": "Doctor Who",
  "Stranger Things": "Stranger Things (season 1)",
  "The Lord of the Rings": "The Lord of the Rings: The Fellowship of the Ring",
  "Harry Potter": "Harry Potter and the Philosopher's Stone (film)",
  Dune: "Dune (2021 film)",
  Marvel: "The Avengers (2012 film)",
  DC: "The Batman (film)",
  Avatar: "Avatar (2009 film)",
  Sherlock: "Sherlock (TV series)",
  Supernatural: "Supernatural (American TV series)",
  "The Witcher": "The Witcher (TV series)",
  Wednesday: "Wednesday (TV series)",
  "The Last of Us": "The Last of Us (TV series)",
  Friends: "Friends",
  "The Office": "The Office (American TV series)",
  "One Piece": "One Piece",
  Bleach: "Bleach (manga)",
  "Attack on Titan": "Attack on Titan",
  "Demon Slayer": "Demon Slayer: Kimetsu no Yaiba",
  "Hunter × Hunter": "Hunter × Hunter",
  "Haikyu!!": "Haikyu!!",
  Frieren: "Frieren: Beyond Journey's End",
  "JoJo’s Bizarre Adventure": "JoJo's Bizarre Adventure",
  Berserk: "Berserk (manga)",
  "Studio Ghibli": "Spirited Away",
  Pokémon: "Pokémon (TV series)",
  Zelda: "The Legend of Zelda: Breath of the Wild",
  "Super Mario": "Super Mario Odyssey",
  Sonic: "Sonic the Hedgehog (1991 video game)",
  "Final Fantasy": "Final Fantasy VII",
  "Kingdom Hearts": "Kingdom Hearts (video game)",
  Persona: "Persona 5",
  "Animal Crossing": "Animal Crossing: New Horizons",
  "Dark Souls": "Dark Souls",
  "Baldur’s Gate": "Baldur's Gate 3",
  "Mass Effect": "Mass Effect (video game)",
  "Dragon Age": "Dragon Age: Origins",
  "The Elder Scrolls": "The Elder Scrolls V: Skyrim",
  Fallout: "Fallout 4",
  Hades: "Hades (video game)",
  TWICE: "Twice",
  SEVENTEEN: "Seventeen (South Korean band)",
  ATEEZ: "Ateez",
  "Sabrina Carpenter": "Sabrina Carpenter",
  Paramore: "Paramore",
  Discworld: "The Colour of Magic",
  "The Wheel of Time": "The Eye of the World",
  Mistborn: "Mistborn: The Final Empire",
  "The Stormlight Archive": "The Way of Kings",
  "The Hunger Games": "The Hunger Games (novel)",
  "Percy Jackson": "The Lightning Thief",
  "The Chronicles of Narnia": "The Lion, the Witch and the Wardrobe",
  "His Dark Materials": "Northern Lights (Pullman novel)",
  "The Sandman": "The Sandman (comic book)",
  "Scott Pilgrim": "Scott Pilgrim",
  Heartstopper: "Heartstopper (graphic novel)",
  Saga: "Saga (comics)",
  Tintin: "The Adventures of Tintin",
  "The Hitchhiker’s Guide to the Galaxy":
    "The Hitchhiker's Guide to the Galaxy (novel)",
  Foundation: "Foundation (Asimov novel)",
  "The Expanse": "Leviathan Wakes",
  "Formula 1": "Formula One",
  WRC: "World Rally Championship",
  IndyCar: "IndyCar Series",
  "Le Mans": "24 Hours of Le Mans",
  Football: "Association football",
  Rugby: "Rugby union",
  Climbing: "Sport climbing",
};
const headers = {
  "User-Agent": "KatsodiLocalPrototype/0.2 (editorial artwork catalogue)",
};
async function api(params) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  Object.entries({
    action: "query",
    format: "json",
    redirects: "1",
    ...params,
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  let response = await fetch(url, { headers });
  if (response.status === 429) {
    console.log("Source rate limit: pausing 60 seconds.");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    response = await fetch(url, { headers });
  }
  if (!response.ok) throw new Error(`Wikipedia HTTP ${response.status}`);
  return response.json();
}
await mkdir("public/images/fandoms", { recursive: true });
let manifest = [];
try {
  manifest = JSON.parse(await readFile("src/data/fandom-posters.json", "utf8"));
} catch {}
const pageMap = {};
for (let offset = 0; offset < entries.length; offset += 40) {
  const batch = entries.slice(offset, offset + 40);
  const data = await api({
    titles: batch.map((entry) => titles[entry.name] || entry.name).join("|"),
    prop: "pageimages",
    piprop: "original|thumbnail|name",
    pilicense: "any",
    pithumbsize: "700",
  });
  const redirects = [
    ...(data.query.normalized || []),
    ...(data.query.redirects || []),
  ];
  for (const entry of batch) {
    let name = titles[entry.name] || entry.name;
    for (let step = 0; step < 5; step++) {
      const next = redirects.find((item) => item.from === name);
      if (!next) break;
      name = next.to;
    }
    pageMap[entry.id] = Object.values(data.query.pages).find(
      (page) => page.title === name,
    );
  }
  console.log(`Resolved ${Math.min(offset + 40, entries.length)} titles.`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
const infoMap = {};
const fileNames = [
  ...new Set(
    Object.values(pageMap)
      .filter(Boolean)
      .map((page) => page.pageimage)
      .filter(Boolean),
  ),
];
for (let offset = 0; offset < fileNames.length; offset += 40) {
  const details = await api({
    titles: fileNames
      .slice(offset, offset + 40)
      .map((name) => `File:${name}`)
      .join("|"),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
  });
  for (const page of Object.values(details.query.pages))
    infoMap[page.title.replace("File:", "").replaceAll("_", " ")] =
      page.imageinfo?.[0];
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
for (const entry of entries) {
  if (manifest.some((item) => item.fandomId === entry.id)) continue;
  const title = titles[entry.name] || entry.name;
  try {
    const page = pageMap[entry.id];
    if (!page?.pageimage || !page.original) {
      console.log(`MISSING ${entry.name}: ${title}`);
      continue;
    }
    const info = infoMap[page.pageimage.replaceAll("_", " ")];
    const remote = new URL(page.thumbnail?.source || page.original.source);
    remote.search = "";
    let response = await fetch(remote, { headers });
    if (response.status === 429) {
      console.log("Image source rate limit: pausing 60 seconds.");
      await new Promise((resolve) => setTimeout(resolve, 60000));
      response = await fetch(remote, { headers });
    }
    if (!response.ok) {
      console.log(`FAILED ${entry.name}: ${response.status}`);
      continue;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const output = await sharp(bytes, { density: 120 })
      .rotate()
      .resize({
        width: 700,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });
    const src = `/images/fandoms/${entry.id}.webp`;
    await writeFile(`public${src}`, output.data);
    const plain = (value) =>
      (value || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");
    const meta = info?.extmetadata || {};
    manifest.push({
      fandomId: entry.id,
      name: entry.name,
      title: page.title,
      src,
      width: output.info.width,
      height: output.info.height,
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      fileSource:
        info?.descriptionurl ||
        `https://en.wikipedia.org/wiki/File:${encodeURIComponent(page.pageimage)}`,
      original: remote.toString(),
      author:
        plain(meta.Artist?.value) ||
        "Rights holder of the original work; see source",
      license:
        plain(meta.LicenseShortName?.value) ||
        "Copyrighted artwork; permission not established",
      licenseUrl: meta.LicenseUrl?.value || "",
      usage: "Local prototype; check file-specific rights before publication",
      checked: "2026-11-01",
      focalPoint: "50% 30%",
    });
    await writeFile(
      "src/data/fandom-posters.json",
      JSON.stringify(manifest, null, 2) + "\n",
    );
    console.log(`OK ${entry.name}: ${page.pageimage}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.log(`FAILED ${entry.name}: ${error.message}`);
  }
}
console.log(
  `Prepared ${manifest.length}/${entries.length} exact fandom images.`,
);
