import { readFile, writeFile } from "node:fs/promises";
const path = "src/data/fandom-information.json",
  data = JSON.parse(await readFile(path, "utf8"));
for (const [id, info] of Object.entries(data)) {
  if (info.summary.ru) continue;
  try {
    let title = info.sources.ru
      ? decodeURIComponent(
          new URL(info.sources.ru).pathname.replace("/wiki/", ""),
        )
      : null;
    if (!title) {
      const url = new URL("https://en.wikipedia.org/w/api.php");
      Object.entries({
        action: "query",
        format: "json",
        formatversion: "2",
        prop: "langlinks",
        lllang: "ru",
        lllimit: "1",
        titles: info.title,
      }).forEach(([k, v]) => url.searchParams.set(k, v));
      let j = await (await fetch(url)).json();
      title = j.query?.pages?.[0]?.langlinks?.[0]?.title;
    }
    if (!title) continue;
    const response = await fetch(
      `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok) throw Error(String(response.status));
    const page = await response.json();
    if (page.extract) {
      const words = page.extract
        .replace(/\([^()]*\)/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(/\s+/);
      info.summary.ru =
        words.slice(0, 23).join(" ") + (words.length > 23 ? "…" : "");
      info.sources.ru = page.content_urls?.desktop?.page || info.sources.ru;
      info.revision.ru = Number(page.revision) || info.revision.ru;
    }
    await writeFile(path, JSON.stringify(data, null, 2) + "\n");
    console.log(id, !!info.summary.ru);
  } catch (e) {
    console.log(id, e.message);
  }
}
