// Verifies official fandom links: each must respond and its page title (or
// og:title) must contain the expected name. Prints a report; with --write,
// saves verified links to src/data/fandom-official-links.json.
// Usage: node scripts/check-official-links.mjs [candidates.json] [--write]
import { readFileSync, writeFileSync } from "node:fs";

const input =
  process.argv.find((a) => a.endsWith(".json")) ||
  "scripts/official-links-candidates.json";
const write = process.argv.includes("--write");
const candidates = JSON.parse(readFileSync(input, "utf8"));
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 KatsodiLinkCheck/1.0",
  "Accept-Language": "en-US,en;q=0.8",
  Accept: "text/html,application/xhtml+xml",
};
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const norm = (s) =>
  decode(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’'`]/g, "'")
    .replace(/\s+/g, " ");

// Official search pages (kind "search") sit behind bot checks we do not
// bypass; only the address shape is checked, and the UI labels them "Search".
const searchHosts = { "www.crunchyroll.com": "/search" };
async function check(link) {
  if (link.kind === "search") {
    const u = new URL(link.url);
    const ok = searchHosts[u.host] === u.pathname && u.searchParams.has("q");
    return { status: 0, final: link.url, title: "search link", ok };
  }
  try {
    const response = await fetch(link.url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    // YouTube pages are large; the channel name sits deep inside them.
    const html = (await response.text()).slice(0, 3000000);
    const titles = [
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1],
      html.match(/property=["']og:title["'][^>]*content=["']([^"']*)/i)?.[1],
      html.match(/content=["']([^"']*)["'][^>]*property=["']og:title/i)?.[1],
      html.match(/"channelMetadataRenderer":{"title":"([^"]+)"/)?.[1],
      html.match(/<meta itemprop="name" content="([^"]*)"/)?.[1],
    ]
      .filter(Boolean)
      .map((t) => decode(t).trim());
    const ok =
      response.ok && titles.some((t) => norm(t).includes(norm(link.expect)));
    return {
      status: response.status,
      final: response.url,
      title: titles[0] || "",
      ok,
    };
  } catch (error) {
    return { status: 0, final: "", title: String(error.message), ok: false };
  }
}

const entries = Object.entries(candidates).flatMap(([id, links]) =>
  links.map((link) => ({ id, link })),
);
const results = [];
for (let i = 0; i < entries.length; i += 6) {
  const batch = entries.slice(i, i + 6);
  results.push(
    ...(await Promise.all(
      batch.map(async (e) => ({ ...e, result: await check(e.link) })),
    )),
  );
}
const today = new Date().toISOString().slice(0, 10);
let passed = 0;
for (const { id, link, result } of results) {
  if (result.ok) passed++;
  else
    console.log(
      `FAIL ${id} ${link.provider} ${result.status} ${link.url} -> "${result.title.slice(0, 80)}"`,
    );
}
console.log(`\n${passed}/${results.length} verified`);
if (write) {
  const verified = {};
  for (const { id, link, result } of results)
    if (result.ok)
      (verified[id] ||= []).push({
        provider: link.provider,
        url: link.url,
        kind: link.kind,
        checked: today,
      });
  writeFileSync(
    "src/data/fandom-official-links.json",
    JSON.stringify(verified, null, 2) + "\n",
  );
  console.log(`Wrote ${Object.keys(verified).length} fandoms.`);
}
