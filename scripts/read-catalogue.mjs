import { readFile } from "node:fs/promises";
import ts from "typescript";
// Parse the typed source with its compiler, independent of quote style/formatting.
const source = await readFile("src/lib/fandoms.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
});
export const { fandoms } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
if (fandoms.length !== 150)
  throw new Error("Unexpected catalogue size; review the artwork mappings.");
