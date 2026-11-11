// Refresh the local, attributed reference manifest. No runtime scraping or media playback.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";
import { fandoms } from "./read-catalogue.mjs";
const source = await readFile("scripts/prepare-fandom-posters.mjs", "utf8");
const ast = ts.createSourceFile(
  "titles.js",
  source,
  ts.ScriptTarget.Latest,
  true,
);
let expression;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "titles")
    expression = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
const { default: titles } = await import(
  `data:text/javascript;base64,${Buffer.from(`export default ${expression}`).toString("base64")}`
);
const checked = "2026-11-02";
const headers = {
  "User-Agent": "KatsodiCatalogue/0.4 (local attributed metadata research)",
};
async function json(base, params) {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw Error(`${url.host}: ${response.status}`);
  return response.json();
}
const result = new Map();
for (let offset = 0; offset < fandoms.length; offset += 35) {
  const batch = fandoms.slice(offset, offset + 35);
  const data = await json("https://en.wikipedia.org/w/api.php", {
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "extracts|pageprops|langlinks|info|revisions",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    lllang: "ru",
    lllimit: "max",
    inprop: "url",
    rvprop: "ids",
    titles: batch.map((f) => titles[f.name] || f.name).join("|"),
  });
  const redirects = new Map(
    [...(data.query.normalized || []), ...(data.query.redirects || [])].map(
      (x) => [x.from, x.to],
    ),
  );
  const resolve = (value) => {
    let next = value;
    for (let n = 0; n < 8 && redirects.has(next); n++)
      next = redirects.get(next);
    return next;
  };
  for (const f of batch) {
    const page = data.query.pages.find(
      (p) => p.title === resolve(titles[f.name] || f.name),
    );
    if (!page || page.missing) {
      console.log("Missing encyclopedia page", f.id);
      continue;
    }
    result.set(f.id, {
      id: f.id,
      title: page.title,
      wikidata: page.pageprops?.wikibase_item,
      en: page,
      ruTitle: page.langlinks?.[0]?.title,
    });
  }
  console.log("Encyclopedia", Math.min(offset + 35, fandoms.length));
}
const entries = [...result.values()];
for (let offset = 0; offset < entries.length; offset += 35) {
  const batch = entries.slice(offset, offset + 35).filter((x) => x.ruTitle);
  if (!batch.length) continue;
  const data = await json("https://ru.wikipedia.org/w/api.php", {
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "extracts|info|revisions",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    inprop: "url",
    rvprop: "ids",
    titles: batch.map((x) => x.ruTitle).join("|"),
  });
  for (const entry of batch)
    entry.ru = data.query.pages.find((p) => p.title === entry.ruTitle);
}
let wikidataLimited = false;
for (
  let offset = 0;
  offset < entries.length && !wikidataLimited;
  offset += 45
) {
  const batch = entries.slice(offset, offset + 45).filter((x) => x.wikidata);
  if (!batch.length) continue;
  let data;
  try {
    data = await json("https://www.wikidata.org/w/api.php", {
      action: "wbgetentities",
      format: "json",
      props: "descriptions",
      languages: "ru|en",
      ids: batch.map((x) => x.wikidata).join("|"),
    });
  } catch {
    wikidataLimited = true;
    console.log(
      "Wikidata unavailable; retaining attributed Wikipedia excerpts.",
    );
    continue;
  }
  for (const e of batch)
    e.description = data.entities?.[e.wikidata]?.descriptions;
}
function excerpt(text = "") {
  // Short attributed excerpt, at most 23 whitespace-delimited words per language/article.
  const clean = text
    .replace(/\([^()]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  return words.slice(0, 23).join(" ") + (words.length > 23 ? "…" : "");
}
const output = {};
for (const f of fandoms) {
  const e = result.get(f.id);
  if (!e) continue;
  output[f.id] = {
    title: e.title,
    checked,
    description: {
      ru: e.description?.ru?.value || "",
      en: e.description?.en?.value || "",
    },
    summary: { ru: excerpt(e.ru?.extract), en: excerpt(e.en.extract) },
    sources: { ru: e.ru?.fullurl || null, en: e.en.fullurl },
    revision: {
      ru: e.ru?.revisions?.[0]?.revid || null,
      en: e.en.revisions?.[0]?.revid || null,
    },
    wikidata: e.wikidata ? `https://www.wikidata.org/wiki/${e.wikidata}` : null,
    license: "CC BY-SA 4.0 (Wikipedia excerpts); CC0 (Wikidata descriptions)",
  };
}
await mkdir(".local/fandom-research", { recursive: true });
await writeFile(
  "src/data/fandom-information.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    total: Object.keys(output).length,
    russian: Object.values(output).filter((x) => x.summary.ru).length,
  }),
);
