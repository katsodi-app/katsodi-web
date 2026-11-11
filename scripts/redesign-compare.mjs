// Builds <root>/index.html: before/after screenshots side by side for every
// captured screen and width (Task 1 visual review), plus the
// horizontal-overflow measurements recorded during capture.
// Usage: node scripts/redesign-compare.mjs
//
// With two capture folders it instead checks that they are identical: a
// pixel diff of every screenshot and, when both were captured with
// CAPTURE_STYLES=1, a diff of every element's computed style.
// Usage: node scripts/redesign-compare.mjs <before-dir> <after-dir>
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const [beforeDir, afterDir] = process.argv.slice(2);
if (beforeDir && afterDir) await diffFolders(beforeDir, afterDir);
else gallery();

async function diffFolders(a, b) {
  const { default: sharp } = await import("sharp");
  const list = (dir, re) =>
    readdirSync(dir)
      .filter((f) => re.test(f))
      .sort();
  const pngs = list(a, /\.png$/);
  let identical = 0;
  const changed = [];
  for (const f of pngs) {
    if (!existsSync(`${b}/${f}`)) {
      changed.push(`${f}: missing in ${b}`);
      continue;
    }
    const [x, y] = await Promise.all(
      [a, b].map((d) =>
        sharp(`${d}/${f}`)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
      ),
    );
    if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
      changed.push(
        `${f}: size ${x.info.width}x${x.info.height} -> ${y.info.width}x${y.info.height}`,
      );
      continue;
    }
    let diff = 0;
    for (let i = 0; i < x.data.length; i += 4)
      if (
        x.data[i] !== y.data[i] ||
        x.data[i + 1] !== y.data[i + 1] ||
        x.data[i + 2] !== y.data[i + 2] ||
        x.data[i + 3] !== y.data[i + 3]
      )
        diff++;
    if (diff)
      changed.push(
        `${f}: ${diff} of ${x.info.width * x.info.height} pixels differ`,
      );
    else identical++;
  }
  console.log(`screenshots: ${pngs.length}, identical: ${identical}`);
  for (const c of changed) console.log(`  ${c}`);

  const styles = list(a, /^styles-.*\.json$/);
  if (!styles.length) return;
  let same = 0;
  const report = [];
  for (const f of styles) {
    if (!existsSync(`${b}/${f}`)) {
      report.push(`${f}: missing in ${b}`);
      continue;
    }
    const [x, y] = [a, b].map((d) =>
      JSON.parse(readFileSync(`${d}/${f}`, "utf8")),
    );
    const style = (s, path) =>
      Object.fromEntries(
        s.table[s.elements[path]].split("\n").map((l) => {
          const i = l.indexOf(":");
          return [l.slice(0, i), l.slice(i + 1)];
        }),
      );
    const paths = new Set([
      ...Object.keys(x.elements),
      ...Object.keys(y.elements),
    ]);
    const diffs = [];
    for (const p of paths) {
      if (!(p in x.elements) || !(p in y.elements)) {
        diffs.push(`${p}: only in ${p in x.elements ? a : b}`);
        continue;
      }
      if (x.table[x.elements[p]] === y.table[y.elements[p]]) continue;
      const [sx, sy] = [style(x, p), style(y, p)];
      for (const k of new Set([...Object.keys(sx), ...Object.keys(sy)]))
        if (sx[k] !== sy[k]) diffs.push(`${p} ${k}: ${sx[k]} -> ${sy[k]}`);
    }
    if (diffs.length)
      report.push(
        `${f}: ${diffs.length} differences`,
        ...diffs.slice(0, 20).map((d) => `    ${d}`),
      );
    else same++;
  }
  console.log(`computed-style files: ${styles.length}, identical: ${same}`);
  for (const r of report) console.log(`  ${r}`);
}

function gallery() {
  const root = ".local/redesign";
  const widths = [360, 390, 768, 1280, 1920];
  const after = readdirSync(`${root}/after`).filter((f) => f.endsWith(".png"));
  const screens = [
    ...new Set(after.map((f) => f.replace(/-\d+\.png$/, ""))),
  ].sort();
  const overflow = (dir, name) => {
    const file = `${root}/${dir}/overflow-${name}.json`;
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  let defects = 0;
  const sections = screens
    .map((name) => {
      const o = overflow("after", name);
      const bad = o ? Object.entries(o).filter(([, v]) => v > 0) : [];
      defects += bad.length;
      const rows = widths
        .map((w) => {
          const b = `before/${name}-${w}.png`;
          const a = `after/${name}-${w}.png`;
          return `<tr><th>${w}px</th><td>${existsSync(`${root}/${b}`) ? `<a href="${b}"><img loading="lazy" src="${b}" alt="${esc(name)} before at ${w}px"></a>` : "—"}</td><td>${existsSync(`${root}/${a}`) ? `<a href="${a}"><img loading="lazy" src="${a}" alt="${esc(name)} after at ${w}px"></a>` : "—"}</td></tr>`;
        })
        .join("");
      return `<section id="${esc(name)}"><h2>${esc(name)}</h2><p>${o ? (bad.length ? `Horizontal overflow: ${bad.map(([w, v]) => `${w}px +${v}px`).join(", ")}` : "No horizontal overflow at any width.") : "Overflow not measured (fixture screen)."}</p><table><thead><tr><th>Width</th><th>Before</th><th>After</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join("");
  writeFileSync(
    `${root}/index.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Katsodi redesign: before and after</title><style>body{font:14px system-ui;margin:24px;background:#111;color:#eee}a{color:#d4ef8b}nav{columns:4;margin-bottom:24px}table{border-collapse:collapse;width:100%}th,td{vertical-align:top;padding:6px;border-top:1px solid #333}td{width:48%}img{width:100%;height:auto;max-height:640px;object-fit:cover;object-position:top;border:1px solid #333}section{margin:40px 0}</style><h1>Katsodi redesign: before and after</h1><p>${screens.length} screens × ${widths.length} widths. Horizontal-overflow defects after the redesign: ${defects}.</p><nav>${screens.map((s) => `<a href="#${esc(s)}">${esc(s)}</a>`).join("<br>")}</nav>${sections}</html>`,
  );
  console.log(`${screens.length} screens, overflow defects after: ${defects}`);
}
