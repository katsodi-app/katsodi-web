import { readFile, writeFile } from "node:fs/promises";
const path = "src/data/fandom-information.json",
  data = JSON.parse(await readFile(path, "utf8"));
const tasks = Object.entries(data).flatMap(([id, info]) =>
  ["ru", "en"]
    .filter((locale) => !info.summary[locale] && info.sources[locale])
    .map((locale) => ({ id, info, locale })),
);
async function worker() {
  while (tasks.length) {
    const { id, info, locale } = tasks.shift();
    try {
      const title = decodeURIComponent(
        new URL(info.sources[locale]).pathname.slice(6),
      );
      const r = await fetch(
        `https://${locale}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!r.ok) continue;
      const p = await r.json();
      if (p.extract) {
        const words = p.extract
          .replace(/\([^()]*\)/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .split(/\s+/);
        info.summary[locale] =
          words.slice(0, 23).join(" ") + (words.length > 23 ? "…" : "");
        console.log(id, locale);
      }
    } catch {
      /* Missing summaries keep an explicit source link. */
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile(path, JSON.stringify(data, null, 2) + "\n");
