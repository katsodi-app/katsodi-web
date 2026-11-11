import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const targets = [
  ["books-12", "Heartstopper", "Heartstopper.png"],
  ["books-13", "The Umbrella Academy", "UmbrellaAcademy.jpg"],
  ["sport-3", "NASCAR", "NASCAR logo 2017.svg"],
  ["sport-20", "Athletics", "MNSTATE.jpg"],
];
const url = new URL("https://en.wikipedia.org/w/api.php");
Object.entries({
  action: "query",
  format: "json",
  prop: "imageinfo",
  iiprop: "url|extmetadata",
  titles: targets.map((t) => "File:" + t[2]).join("|"),
}).forEach(([k, v]) => url.searchParams.set(k, v));
const d = await (await fetch(url)).json();
const manifest = JSON.parse(await readFile("src/data/fandom-posters.json"));
for (const [id, name, file] of targets) {
  if (manifest.some((p) => p.fandomId === id)) continue;
  const p = Object.values(d.query.pages).find(
    (p) => p.title === "File:" + file,
  );
  const info = p.imageinfo[0];
  let r = await fetch(info.url);
  if (r.status === 429) {
    console.log("Source rate limit; retry after 60 seconds");
    await new Promise((resolve) => setTimeout(resolve, 60000));
    r = await fetch(info.url);
  }
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
  const src = `/images/fandoms/${id}.webp`;
  await writeFile(`public${src}`, o.data);
  const plain = (s) => (s || "").replace(/<[^>]*>/g, "");
  const m = info.extmetadata || {};
  manifest.push({
    fandomId: id,
    name,
    title: name,
    src,
    width: o.info.width,
    height: o.info.height,
    source: info.descriptionurl,
    fileSource: info.descriptionurl,
    original: info.url,
    author: plain(m.Artist?.value) || "Original rights holders; see source",
    license:
      plain(m.LicenseShortName?.value) ||
      "Copyrighted artwork; permission not established",
    licenseUrl: m.LicenseUrl?.value || "",
    usage: "Local prototype; check file-specific rights before publication",
    checked: "2026-11-01",
    focalPoint: "50% 30%",
  });
  await writeFile(
    "src/data/fandom-posters.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log("OK", name);
}
