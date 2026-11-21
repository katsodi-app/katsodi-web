import { describe, expect, it } from "vitest";
import { parseLrc, searchTitle } from "../../src/lib/server/lyrics";

describe("lyrics", () => {
  it("reads LRC lines in time order, repeated stamps included", () => {
    expect(
      parseLrc(
        "[ar: Someone]\n[00:12.50] First line\n[01:02.3][00:05.00]Chorus\nno stamp\n[00:20.00]",
      ),
    ).toEqual([
      { time: 5, text: "Chorus" },
      { time: 12.5, text: "First line" },
      { time: 20, text: "" },
      { time: 62.3, text: "Chorus" },
    ]);
  });
  it("searches by the song's own title", () => {
    expect(searchTitle("X (from GTAVI: The Album)")).toBe("X");
    expect(
      searchTitle(
        "Flower In A Hurricane (feat. Tame Impala, SZA) [From GTAVI: Original Score]",
      ),
    ).toBe("Flower In A Hurricane");
    expect(searchTitle("Song - Remastered 2011")).toBe("Song");
    expect(searchTitle("Plain Title")).toBe("Plain Title");
  });
});
