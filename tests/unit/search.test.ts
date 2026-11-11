import { describe, it, expect } from "vitest";
import { matchesSearch } from "../../src/lib/search";

describe("catalogue search", () => {
  it("ignores accents, repeated whitespace, case and Russian yo", () => {
    expect(matchesSearch("  BEYONCE   halo  ", "Halo", "Beyoncé")).toBe(true);
    expect(matchesSearch("звезд", "По ту сторону звёзд")).toBe(true);
  });
  it("matches all tokens across title, artist and description in any order", () => {
    expect(
      matchesSearch("weeknd lights", "Blinding Lights", "The Weeknd"),
    ).toBe(true);
    expect(matchesSearch("weeknd dune", "Blinding Lights", "The Weeknd")).toBe(
      false,
    );
  });
  it("treats punctuation as literal text, handles empty and absent metadata", () => {
    expect(matchesSearch("[.*]", "a normal title")).toBe(false);
    expect(matchesSearch("  ", null, undefined)).toBe(true);
  });
});
