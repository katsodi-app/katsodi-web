import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries
        .filter(
          (e) =>
            ![
              "node_modules",
              ".git",
              ".next",
              // Agent worktrees hold full copies of the docs.
              ".claude",
              ".local",
              "test-results",
              "playwright-report",
            ].includes(e.name) && !e.name.startsWith(".next-audit"),
        )
        .map(async (e) =>
          e.isDirectory()
            ? walk(path.join(dir, e.name))
            : e.name.endsWith(".md")
              ? [path.join(dir, e.name)]
              : [],
        ),
    )
  ).flat();
}
const files = await walk(root);
const ids = new Set(
  files.map((f) =>
    path.relative(root, f).replaceAll("\\", "/").replace(/\.md$/, ""),
  ),
);
const errors = [];
const home = await readFile(path.join(root, "docs/Home.md"), "utf8");
const englishHome = await readFile(path.join(root, "docs/en/Home.md"), "utf8");
let translationPairs = 0;
for (const file of files) {
  const text = await readFile(file, "utf8");
  const id = path
    .relative(root, file)
    .replaceAll("\\", "/")
    .replace(/\.md$/, "");
  const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const links = [
    ...prose.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g),
  ].map((m) => m[1]);
  if (!links.length) errors.push(`${id}: no wikilinks`);
  for (const link of links)
    if (!ids.has(link) && ![...ids].some((i) => i.split("/").at(-1) === link))
      errors.push(`${id}: broken [[${link}]]`);
  if (
    (id.startsWith("docs/Features/") || id.startsWith("docs/en/Features/")) &&
    !id.endsWith("Feature Template")
  ) {
    const index = id.startsWith("docs/en/") ? englishHome : home;
    if (!index.includes(`[[${id}]]`))
      errors.push(`${id}: missing from its language Home`);
    for (const field of [
      "title",
      "type",
      "status",
      "created",
      "updated",
      "tags",
    ])
      if (!new RegExp(`^${field}:`, "m").test(text))
        errors.push(`${id}: missing ${field}`);
  }
  if (
    (id.startsWith("docs/") && !id.startsWith("docs/en/")) ||
    ["README", "AGENTS", "supabase/README"].includes(id)
  ) {
    const translated = id.startsWith("docs/")
      ? id.replace(/^docs\//, "docs/en/")
      : `${id}.en`;
    if (!ids.has(translated))
      errors.push(`${id}: missing English translation [[${translated}]]`);
    else {
      translationPairs++;
      if (!links.includes(translated))
        errors.push(`${id}: no English language link`);
      const english = await readFile(
        path.join(root, `${translated}.md`),
        "utf8",
      );
      if (!english.includes(`[[${id}|Russian original]]`))
        errors.push(`${translated}: no Russian original link`);
      for (const field of ["type", "status", "created", "updated", "tags"]) {
        const original = text.match(new RegExp(`^${field}:.*$`, "m"))?.[0];
        if (original && !english.includes(original))
          errors.push(
            `${translated}: translated metadata differs for ${field}`,
          );
      }
    }
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Validated ${files.length} Markdown notes, ${translationPairs} RU/EN pairs and all wikilinks.`,
  );
