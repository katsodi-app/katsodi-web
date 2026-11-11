import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fandoms } from "../../src/lib/fandoms";
import posters from "../../src/data/fandom-posters.json";
import curated from "../../src/data/curated-posters.json";
import { isTheme } from "../../src/lib/themes";
import { fandomAssets } from "../../src/data/editorial";

describe("artwork catalogue", () => {
  it("restores the original effective avatars selected by the owner", async () => {
    const { default: snapshot } =
      await import("../../docs/audits/legal-evidence-2026-11-10.json");
    for (const original of snapshot.effectiveArtwork) {
      expect(fandomAssets[original.fandomId].src).toBe(original.src);
      expect(fandomAssets[original.fandomId].author).toBe(original.author);
      expect(fandomAssets[original.fandomId].license).toBe(original.license);
    }
  });
  it("has a real local asset and provenance for all 150 fandoms", () => {
    expect(fandoms).toHaveLength(150);
    for (const fandom of fandoms) {
      const asset =
        curated.find((p) => p.fandomId === fandom.id) ||
        posters.find((p) => p.fandomId === fandom.id);
      expect(asset, fandom.name).toBeDefined();
      expect(asset!.name).toBe(fandom.name);
      expect(existsSync(`public${asset!.src}`), fandom.name).toBe(true);
      expect(asset!.source).toMatch(/^https:\/\//);
      expect(asset!.license.length).toBeGreaterThan(0);
      expect(asset!.width).toBeGreaterThan(0);
      expect(asset!.height).toBeGreaterThan(0);
    }
  });
  it("ships a 480px thumbnail for every large fandom poster", () => {
    const large = Object.values(fandomAssets).filter((a) => a.width > 600);
    expect(large.length).toBeGreaterThan(0);
    for (const asset of large) {
      expect(asset.thumbnail, asset.id).toMatch(/-480\.webp$/);
      expect(existsSync(`public${asset.thumbnail}`), asset.id).toBe(true);
    }
  });

  it("does not contain duplicate IDs within a manifest", () => {
    for (const manifest of [posters, curated])
      expect(new Set(manifest.map((p) => p.fandomId)).size).toBe(
        manifest.length,
      );
  });
  it("accepts only known theme preferences", () => {
    for (const value of [
      "obsidian",
      "ember",
      "aurora",
      "violet",
      "paper",
      "system",
    ])
      expect(isTheme(value)).toBe(true);
    for (const value of [null, undefined, "", "dark", "<script>"])
      expect(isTheme(value)).toBe(false);
  });
});
