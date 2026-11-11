// Weekly chart refresh. Public source HTML only; no protected API scraping.
// npm run music:refresh; add --database to publish to the configured Supabase.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match && process.env[match[1]] === undefined)
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* Environment variables alone are supported. */
  }
}
const database = process.argv.includes("--database");
const noWrite = process.argv.includes("--no-write");
if (
  database &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY)
)
  throw Error(
    "Database refresh requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
mkdirSync(".next-audit-music", { recursive: true });
const outfile = resolve(".next-audit-music/music-charts-runtime.mjs");
await build({
  entryPoints: ["src/lib/server/music-chart-sources.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
const { refreshMusicCharts, mostPlayedChartSchema, collectionsSchema } =
  await import(pathToFileURL(outfile).href);
let previous = [];
try {
  previous = JSON.parse(readFileSync("src/data/music-discovery.json", "utf8"));
} catch {
  /* First run. */
}
const db = database
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  : null;
if (db) {
  const stored = await db.from("music_chart_snapshots").select("payload");
  if (stored.error)
    throw Error(
      `Chart storage is unavailable (${stored.error.code}); apply the music-discovery migration first.`,
    );
  if (stored.data?.length) previous = stored.data.map((row) => row.payload);
}
if (process.argv.includes("--all-time-only")) {
  if (!db) throw Error("Publishing the all-time list requires --database");
  const chart = mostPlayedChartSchema.parse(
    JSON.parse(readFileSync("src/data/music-top150.json", "utf8")),
  );
  const result = await db.from("music_chart_snapshots").upsert({
    provider: "spotify-all-time",
    payload: {
      provider: "spotify-all-time",
      ...chart,
      collections: collectionsSchema.parse(
        JSON.parse(readFileSync("src/data/music-collections.json", "utf8")),
      ),
    },
    refreshed_at: new Date().toISOString(),
  });
  if (result.error)
    throw Error(`All-time chart storage failed (${result.error.code})`);
  console.log(
    `spotify-all-time: 150 verified tracks, checked ${chart.checked}`,
  );
  process.exit(0);
}
const charts = await refreshMusicCharts(previous);
if (db) {
  const saved = await db.from("music_chart_snapshots").upsert(
    charts.map((chart) => ({
      provider: chart.provider,
      payload: chart,
      refreshed_at: chart.attempted,
    })),
  );
  if (saved.error) throw Error(`Chart storage failed (${saved.error.code})`);
}
if (!noWrite)
  writeFileSync(
    "src/data/music-discovery.json",
    JSON.stringify(charts, null, 2) + "\n",
  );
for (const chart of charts)
  console.log(
    `${chart.provider}: ${chart.status}, ${chart.tracks.length} tracks, ${chart.scope}, checked ${chart.checked || "never"}`,
  );
if (
  !charts.some(
    (chart) => chart.status === "ready" || chart.status === "partial",
  )
)
  process.exitCode = 1;
