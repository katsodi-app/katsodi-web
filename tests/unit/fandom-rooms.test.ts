import { describe, it, expect } from "vitest";
import {
  createRoomSchema,
  roomSchema,
  storedRoomSchema,
} from "../../src/lib/rooms";
import { serverRoomSchema, safeNext } from "../../src/lib/server/contracts";
import { fandoms } from "../../src/lib/fandoms";
import information from "../../src/data/fandom-information.json";
import officialLinks from "../../src/data/fandom-official-links.json";
import removed from "../../docs/audits/removed-watch-links-2026-11-10.json";
const base = {
  name: "Film night",
  description: "",
  url: "",
  visibility: "public",
  format: "video",
};
describe("fandom room creation", () => {
  it("preserves a valid creation intent through sign-in without opening redirects", () => {
    expect(safeNext("/network/create?fandom=cinema-6")).toBe(
      "/network/create?fandom=cinema-6",
    );
    expect(safeNext("/network/create?fandom=cinema-999")).toBe("/account");
    expect(safeNext("https://example.org/network/create?fandom=cinema-6")).toBe(
      "/account",
    );
  });
  it("allows no fandom while rejecting invented associations on both boundaries", () => {
    for (const fandomId of ["cinema-999", "made-up"]) {
      expect(createRoomSchema.safeParse({ ...base, fandomId }).success).toBe(
        false,
      );
      expect(
        serverRoomSchema.safeParse({ ...base, art: "orbit", fandomId }).success,
      ).toBe(false);
    }
    for (const fandomId of [undefined, ""]) {
      expect(createRoomSchema.safeParse({ ...base, fandomId }).success).toBe(
        true,
      );
      expect(
        serverRoomSchema.safeParse({ ...base, art: "orbit", fandomId }).success,
      ).toBe(true);
    }
    expect(
      serverRoomSchema.safeParse({
        ...base,
        art: "orbit",
        fandomId: "cinema-6",
      }).success,
    ).toBe(true);
    expect(
      createRoomSchema.safeParse({ ...base, visibility: "private" }).success,
    ).toBe(true);
  });
  it("preserves old local drafts without inventing an association", () => {
    expect(roomSchema.safeParse(base).success).toBe(true);
    expect(
      storedRoomSchema.safeParse({
        ...base,
        id: "10000000-0000-4000-8000-000000000001",
        kind: "local",
        art: "orbit",
        createdAt: "2026-11-02T10:00:00Z",
      }).success,
    ).toBe(true);
  });
  it("covers the catalogue with attributed information and only specific watch destinations", () => {
    expect(Object.keys(information).sort()).toEqual(
      fandoms.map((f) => f.id).sort(),
    );
    for (const record of Object.values(information))
      expect(record.sources.en).toMatch(/^https:\/\/en.wikipedia.org\/wiki\//);
    for (const record of Object.values(information))
      for (const locale of ["ru", "en"] as const)
        expect(record.description[locale] || record.summary[locale]).not.toBe(
          "",
        );
    const old = new Set(removed.entries.map((r) => r.url));
    expect(old.size).toBe(80);
    for (const records of Object.values(officialLinks)) {
      for (const record of records) {
        expect(new URL(record.url).protocol).toBe("https:");
        expect(old.has(record.url)).toBe(false);
        expect(record.url).not.toMatch(/kinogo|reanime|liveball/i);
      }
    }
  });
});
