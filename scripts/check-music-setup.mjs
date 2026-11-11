// Read-only music activation preflight. Never applies SQL or publishes snapshots.
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (process.argv.includes("--help")) {
  console.log(
    "npm run music:check -- [--json] [--for-publish]\nRead-only: checks credentials, migration-23 storage, anonymous chart reads and snapshot freshness.\n--for-publish checks storage access before initial seeding; it does not prove write privileges.\nProvider imports and the GitHub schedule still require live acceptance. No secret values are printed.",
  );
  process.exit(0);
}
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("next/package.json"));
const { loadEnvConfig } = nextRequire("@next/env");
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
mkdirSync(".next-audit-music", { recursive: true });
const outfile = resolve(".next-audit-music/music-readiness-runtime.mjs");
await build({
  entryPoints: ["src/lib/server/music-readiness.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
const { musicReadiness } = await import(pathToFileURL(outfile).href);
const report = await musicReadiness(process.env);
if (process.argv.includes("--json"))
  console.log(JSON.stringify(report, null, 2));
else {
  for (const check of report.checks)
    console.log(`${check.status.toUpperCase()} ${check.id}: ${check.detail}`);
  console.log(
    `Ready to attempt publishing: ${report.readyToPublish ? "yes" : "no"}. Current public snapshots: ${report.chartsReady ? "ready" : "not ready"}.`,
  );
  console.log(
    "Next steps: docs/en/Features/Music Activation.md (RU: docs/Features/Music Activation.md).",
  );
}
process.exitCode = (
  process.argv.includes("--for-publish")
    ? report.readyToPublish
    : report.chartsReady
)
  ? 0
  : 1;
