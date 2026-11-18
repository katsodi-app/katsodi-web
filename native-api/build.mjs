// Bundles the standalone native API: every src/app/api/native/v1/**/route.ts
// plus native-api/server.ts into native-api/dist/server.mjs. Next-only
// modules are replaced by the small shims next to this file, so the website
// and the standalone API serve exactly the same handlers.
import { build } from "esbuild";
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const routesDir = join(root, "src/app/api/native/v1");
const slash = (path) => path.split("\\").join("/");

function findRoutes(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return findRoutes(full);
    return name === "route.ts" ? [full] : [];
  });
}

const entries = findRoutes(routesDir)
  .map((file) => ({ file: slash(file), path: slash(relative(routesDir, dirname(file))) }))
  .sort((a, b) => a.path.localeCompare(b.path));

const contents = [
  `import { start } from ${JSON.stringify(slash(join(here, "server.ts")))};`,
  ...entries.map((e, i) => `import * as r${i} from ${JSON.stringify(e.file)};`),
  `start([${entries.map((e, i) => `{ path: ${JSON.stringify(e.path)}, module: r${i} }`).join(", ")}]);`,
].join("\n");

const shim = (name) => join(here, "shims", name);
await build({
  stdin: { contents, resolveDir: root, sourcefile: "native-api-entry.ts", loader: "ts" },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: join(here, "dist/server.mjs"),
  tsconfig: join(root, "tsconfig.json"),
  alias: {
    "next/headers": shim("next-headers.ts"),
    "next/cache": shim("next-cache.ts"),
    "next/navigation": shim("next-navigation.ts"),
    "server-only": shim("server-only.ts"),
  },
  // Packages stay in node_modules; only our own code is bundled.
  packages: "external",
  sourcemap: "linked",
  logLevel: "warning",
  banner: { js: "// Built by native-api/build.mjs. Do not edit." },
});
console.log(`native-api: bundled ${entries.length} routes -> native-api/dist/server.mjs`);
